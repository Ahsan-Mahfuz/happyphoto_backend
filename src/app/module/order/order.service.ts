const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Order from "./Order";
import DeliveryRequest from "./DeliveryRequest";
import Cart from "../cart/Cart";
import Property from "../property/Property";
import { Product } from "../product/Product";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import postNotification from "../../../util/postNotification";
import { validateTransition } from "../../../util/orderStateMachine";
import { PaymentService } from "../payment/payment.service";
import Payment from "../payment/Payment";
import { StripeService } from "../payment/stripe.service";
import User from "../user/User";
import Review from "../review/Review";
import { Request } from "express";

const DELIVERY_FEE = 5;
const SERVICE_FEE = 2;
const PLATFORM_COMMISSION_RATE = 0.15;
const DRIVER_PAYOUT_PER_ORDER = 3;
const PROPERTY_HOST_PAYOUT_PER_ORDER = 1.5;

const placeOrder = async (userData: any, payload: Record<string, any>) => {
  const {
    propertyCode,
    deliveryAddress,
    deliveryLat,
    deliveryLong,
    specialInstructions,
    tipAmount,
  } = payload;

  const totalTip = Math.max(0, Number(tipAmount) || 0);

  // Get cart
  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(status.BAD_REQUEST, "Cart is empty");
  }

  // Determine delivery type
  const isPropertyOrder = !!(propertyCode || cart.propertyCode);
  const resolvedPropertyCode = propertyCode || cart.propertyCode;

  let property: any = null;
  if (isPropertyOrder) {
    property = await Property.findOne({
      propertyCode: resolvedPropertyCode,
      isActive: true,
    });
    if (!property) {
      throw new ApiError(status.NOT_FOUND, "Property not found or inactive");
    }

    // Guest stay validation
    if (property.guestStayDates?.checkIn && property.guestStayDates?.checkOut) {
      const now = new Date();
      const checkIn = new Date(property.guestStayDates.checkIn);
      const checkOut = new Date(property.guestStayDates.checkOut);
      if (now < checkIn || now > checkOut) {
        throw new ApiError(
          status.BAD_REQUEST,
          "Orders cannot be placed outside the guest stay period",
        );
      }
    }
  } else if (!deliveryAddress) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Either propertyCode or deliveryAddress is required",
    );
  }

  // Group cart items by merchantId
  const merchantGroups: Record<string, any[]> = {};
  for (const item of cart.items) {
    const merchantKey = item.merchantId.toString();
    if (!merchantGroups[merchantKey]) {
      merchantGroups[merchantKey] = [];
    }
    merchantGroups[merchantKey].push(item);
  }

  // Validate products and stock
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(
        status.BAD_REQUEST,
        `Product not found: ${item.productId}`,
      );
    }
    if (!product.isAvailable || product.status !== "active") {
      throw new ApiError(
        status.BAD_REQUEST,
        `Product "${product.name}" is not available`,
      );
    }
    if (product.quantity < item.quantity) {
      throw new ApiError(
        status.BAD_REQUEST,
        `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
      );
    }
  }

  const createdOrders: any[] = [];
  const merchantCount = Object.keys(merchantGroups).length;
  const tipPerOrder =
    merchantCount > 0
      ? Math.round((totalTip / merchantCount) * 100) / 100
      : 0;

  // Create one order per merchant
  for (const [merchantId, items] of Object.entries(merchantGroups)) {
    // Fetch product details for order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) continue;

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        product_image: product.product_image,
      });

      // Decrement stock
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity },
      });
    }

    const platformCommission =
      Math.round(subtotal * PLATFORM_COMMISSION_RATE * 100) / 100;
    const merchantNetEarnings =
      Math.round((subtotal - platformCommission) * 100) / 100;
    const total =
      subtotal + DELIVERY_FEE + SERVICE_FEE + tipPerOrder;

    const orderData: Record<string, any> = {
      userId: userData.userId,
      merchantId,
      items: orderItems,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      serviceFee: SERVICE_FEE,
      tax: 0,
      tipAmount: tipPerOrder,
      total,
      platformCommission,
      driverPayout: DRIVER_PAYOUT_PER_ORDER,
      merchantNetEarnings,
      specialInstructions,
      // Order is not actionable by merchant/host until payment succeeds —
      // see activateOrderAfterPayment(), invoked from the Stripe webhook.
      status: "pending_payment",
    };

    if (isPropertyOrder) {
      orderData.propertyId = property._id;
      orderData.propertyHostId = property.hostId;
      orderData.propertyHostPayout = PROPERTY_HOST_PAYOUT_PER_ORDER;
      // Address NOT set yet — only revealed after PM approval
    } else {
      orderData.deliveryAddress = deliveryAddress;
      if (deliveryLat && deliveryLong) {
        orderData.deliveryCoordinates = {
          type: "Point",
          coordinates: [parseFloat(deliveryLong), parseFloat(deliveryLat)],
        };
      }
    }

    const order = await Order.create(orderData);
    createdOrders.push(order);
  }

  // Clear cart
  cart.items = [];
  cart.propertyCode = undefined;
  await cart.save();

  return createdOrders;
};

// Invoked by the Stripe webhook once a payment_intent for this order's
// linked Payment succeeds. Moves the order out of "pending_payment" and only
// now creates the host DeliveryRequest / notifies the merchant or host —
// keeping unpaid orders invisible to the fulfillment pipeline.
const activateOrderAfterPayment = async (orderId: string) => {
  const order = await Order.findById(orderId);
  if (!order || order.status !== "pending_payment") {
    return;
  }

  const isPropertyOrder = !!order.propertyId;
  order.status = isPropertyOrder ? "pending_host_approval" : "pending";
  await order.save();

  if (isPropertyOrder) {
    await DeliveryRequest.create({
      orderId: order._id,
      propertyId: order.propertyId,
      hostId: order.propertyHostId,
      customerId: order.userId,
    });

    const property = await Property.findById(order.propertyId).lean();
    await postNotification(
      "New Delivery Request",
      `New delivery request for ${property?.propertyName || "your property"} (${order.orderId})`,
      order.propertyHostId,
    );
  } else {
    await postNotification(
      "New Order Received",
      `New order ${order.orderId} received`,
      order.merchantId,
    );
  }
};

const getOrder = async (userData: any, query: Record<string, any>) => {
  validateFields(query, ["orderId"]);

  const order = await Order.findOne({ _id: query.orderId })
    .populate({
      path: "userId",
      select: "name email phoneNumber profile_image",
    })
    .populate({
      path: "merchantId",
      select: "storeName storeAddress store_logo storePhoneNumber",
    })
    .populate({
      path: "driverId",
      select: "name phoneNumber profile_image vehicleType locationCoordinates",
    })
    .populate({
      path: "propertyId",
      select: "propertyName propertyType propertyCode city",
    })
    .lean();

  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  // Hide delivery address for property-code orders still pending host approval
  if (order.status === "pending_host_approval" && userData.role === "USER") {
    delete (order as any).deliveryAddress;
    delete (order as any).deliveryCoordinates;
  }

  return order;
};

const getMyOrders = async (userData: any, query: QueryParams) => {
  const filter: Record<string, any> = {};

  switch (userData.role) {
    case "USER":
      filter.userId = userData.userId;
      break;
    case "MERCHANT":
      filter.merchantId = userData.userId;
      break;
    case "DRIVER":
      filter.driverId = userData.userId;
      break;
    case "PROPERTY_HOST":
      filter.propertyHostId = userData.userId;
      break;
    case "ADMIN":
      // Admin sees all
      break;
    default:
      filter.userId = userData.userId;
  }

  if (query.status) {
    // The dashboards group several statuses under one tab and send them as a
    // comma-separated list; a bare string stays an exact match.
    const statuses = String(query.status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    delete query.status;
  }

  const orderQuery = new QueryBuilder(
    Order.find(filter)
      .populate({ path: "userId", select: "name email profile_image" })
      .populate({ path: "merchantId", select: "storeName store_logo" })
      .populate({ path: "driverId", select: "name profile_image vehicleType" })
      .lean(),
    query,
  )
    .search(["orderId"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  return { meta, orders };
};

const getActiveOrders = async (userData: any, query: QueryParams) => {
  const filter = {
    driverId: userData.userId,
    status: {
      $in: ["driver_assigned", "picked_up", "out_for_delivery"],
    },
  };

  const orderQuery = new QueryBuilder(
    Order.find(filter)
      .populate({
        path: "userId",
        select: "name phoneNumber profile_image address",
      })
      .populate({
        path: "merchantId",
        select: "storeName storeAddress store_logo storePhoneNumber",
      })
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  return { meta, orders };
};

// Driver's completed-delivery history — powers the "Recent Deliveries" list
// on the shopper dashboard, which previously had no backend source at all.
const getDriverHistory = async (userData: any, query: QueryParams) => {
  const filter = {
    driverId: userData.userId,
    status: "delivered",
  };

  const orderQuery = new QueryBuilder(
    Order.find(filter)
      .populate({ path: "userId", select: "name" })
      .populate({ path: "merchantId", select: "storeName store_logo" })
      .select("orderId total driverPayout actualDeliveryTime createdAt userId merchantId")
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  const orderIds = (orders as any[]).map((o) => o._id);
  const reviews = await Review.find({
    orderId: { $in: orderIds },
    driverId: userData.userId,
  })
    .select("orderId rating")
    .lean();
  const ratingByOrder = new Map(
    reviews.map((r: any) => [r.orderId.toString(), r.rating]),
  );

  const deliveries = (orders as any[]).map((order) => ({
    id: order._id,
    orderId: order.orderId,
    storeName: order.merchantId?.storeName || "",
    storeLogo: order.merchantId?.store_logo || "",
    customerName: order.userId?.name || "",
    earnings: order.driverPayout || 0,
    rating: ratingByOrder.get(order._id.toString()) || 0,
    deliveredAt: order.actualDeliveryTime || order.createdAt,
  }));

  return { meta, deliveries };
};

const getPendingDeliveryRequests = async (
  userData: any,
  query: QueryParams,
) => {
  const filter = {
    status: "ready_for_pickup",
    driverId: { $exists: false },
  };

  const orderQuery = new QueryBuilder(
    Order.find(filter)
      .populate({
        path: "merchantId",
        select: "storeName storeAddress store_logo",
      })
      .select(
        "orderId items merchantId total driverPayout deliveryAddress createdAt",
      )
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  return { meta, orders };
};

const trackOrder = async (userData: any, query: Record<string, any>) => {
  validateFields(query, ["orderId"]);

  const order = await Order.findOne({
    _id: query.orderId,
    userId: userData.userId,
  })
    .populate({
      path: "merchantId",
      select: "storeName storeAddress storeLocationCoordinates",
    })
    .populate({
      path: "driverId",
      select: "name phoneNumber profile_image vehicleType locationCoordinates",
    })
    .lean();

  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  return {
    order,
    driverLocation: (order as any).driverId?.locationCoordinates || null,
  };
};

const acceptOrder = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  if (order.merchantId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "This order does not belong to your store",
    );
  }

  // Can accept from "pending" (direct) or "approved" (property-code after PM approval)
  validateTransition(order.status, "accepted_by_merchant");

  order.status = "accepted_by_merchant";
  order.acceptedByMerchantAt = new Date();
  await order.save();

  // Notify customer
  await postNotification(
    "Order Accepted",
    `Your order ${order.orderId} has been accepted by the restaurant`,
    order.userId,
  );

  return order;
};

const updateOrderStatus = async (
  userData: any,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["orderId", "status"]);

  const order = await Order.findById(payload.orderId);
  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  if (order.merchantId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "This order does not belong to your store",
    );
  }

  // Merchant can only do: accepted_by_merchant → preparing, preparing → ready_for_pickup
  const allowedMerchantTransitions: Record<string, string> = {
    accepted_by_merchant: "preparing",
    preparing: "ready_for_pickup",
  };

  const expectedStatus = allowedMerchantTransitions[order.status];
  if (!expectedStatus || expectedStatus !== payload.status) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Merchants can only transition from "${order.status}" to "${expectedStatus || "N/A"}"`,
    );
  }

  validateTransition(order.status, payload.status);
  order.status = payload.status;
  await order.save();

  // Notifications based on new status
  if (payload.status === "preparing") {
    await postNotification(
      "Order Being Prepared",
      `Your order ${order.orderId} is now being prepared`,
      order.userId,
    );
  } else if (payload.status === "ready_for_pickup") {
    await postNotification(
      "Order Ready",
      `Order ${order.orderId} is ready for pickup`,
      order.userId,
    );
  }

  return order;
};

const assignDriver = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId", "driverId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  validateTransition(order.status, "driver_assigned");

  const driver = await User.findById(payload.driverId).lean();
  if (!driver) throw new ApiError(status.NOT_FOUND, "Driver not found");
  if (!driver.isApproved) {
    throw new ApiError(status.BAD_REQUEST, "Driver is not approved");
  }
  if (!driver.isOnline) {
    throw new ApiError(status.BAD_REQUEST, "Driver is not online");
  }

  order.driverId = payload.driverId;
  order.status = "driver_assigned";
  order.acceptedByDriverAt = new Date();
  await order.save();

  await postNotification(
    "Delivery Assigned",
    `You have been assigned to deliver order ${order.orderId}. Payout: $${order.driverPayout}`,
    payload.driverId,
  );

  await postNotification(
    "Driver Assigned",
    `A driver has been assigned to your order ${order.orderId}`,
    order.userId,
  );

  return order;
};

const acceptDelivery = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  if (order.status !== "ready_for_pickup") {
    throw new ApiError(status.BAD_REQUEST, "Order is not ready for pickup");
  }

  if (order.driverId) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Order already has a driver assigned",
    );
  }

  // Verify driver is approved and online
  const driver = await User.findById(userData.userId).lean();
  if (!driver?.isApproved) {
    throw new ApiError(status.BAD_REQUEST, "You are not an approved driver");
  }

  validateTransition(order.status, "driver_assigned");

  order.driverId = userData.userId;
  order.status = "driver_assigned";
  order.acceptedByDriverAt = new Date();
  await order.save();

  await postNotification(
    "Driver Assigned",
    `A driver has been assigned to your order ${order.orderId}`,
    order.userId,
  );

  return order;
};

const pickedUp = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  if (order.driverId?.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This order is not assigned to you");
  }

  validateTransition(order.status, "picked_up");

  order.status = "picked_up";
  order.pickedUpAt = new Date();
  await order.save();

  await postNotification(
    "Order Picked Up",
    `Your order ${order.orderId} has been picked up by the driver`,
    order.userId,
  );

  return order;
};

const outForDelivery = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  if (order.driverId?.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This order is not assigned to you");
  }

  validateTransition(order.status, "out_for_delivery");

  order.status = "out_for_delivery";
  await order.save();

  await postNotification(
    "Out for Delivery",
    `Your order ${order.orderId} is out for delivery`,
    order.userId,
  );

  return order;
};

const deliver = async (req: Request) => {
  const { user: userData, body: payload } = req as any;

  if (!userData) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");

  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  if (order.driverId?.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This order is not assigned to you");
  }

  validateTransition(order.status, "delivered");

  // Handle proof of delivery image
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  if (files?.proof_of_delivery) {
    order.proofOfDelivery = files.proof_of_delivery[0].path;
  }

  order.status = "delivered";
  order.actualDeliveryTime = new Date();
  await order.save();

  // Trigger payout transfers
  try {
    await PaymentService.processOrderPayouts(order._id.toString());
  } catch (error: any) {
    const { logger } = require("../../../util/logger");
    logger.error(
      `Failed to process payouts for order ${order.orderId}: ${error.message}`,
    );
  }

  // Increment driver's total deliveries
  await User.findByIdAndUpdate(userData.userId, {
    $inc: { totalDeliveries: 1 },
  });

  // Notify all parties
  await postNotification(
    "Order Delivered",
    `Order ${order.orderId} has been delivered successfully`,
    order.userId,
  );
  await postNotification(
    "Order Delivered",
    `Order ${order.orderId} has been delivered. Your earnings will be transferred.`,
    order.merchantId,
  );
  if (order.propertyHostId) {
    await postNotification(
      "Delivery Completed",
      `Order ${order.orderId} has been delivered to your property`,
      order.propertyHostId,
    );
  }

  return order;
};

const cancelOrder = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) throw new ApiError(status.NOT_FOUND, "Order not found");

  // Role-based cancellation rules
  const role = userData.role;
  const orderStatus = order.status;

  const canCancel: Record<string, string[]> = {
    USER: ["pending", "pending_host_approval", "accepted_by_merchant"],
    MERCHANT: ["pending", "approved", "accepted_by_merchant", "preparing"],
    PROPERTY_HOST: ["pending_host_approval"],
    ADMIN: [
      "pending",
      "pending_host_approval",
      "approved",
      "accepted_by_merchant",
      "preparing",
      "ready_for_pickup",
      "driver_assigned",
      "picked_up",
      "out_for_delivery",
    ],
  };

  const allowedStatuses = canCancel[role];
  if (!allowedStatuses) {
    throw new ApiError(status.FORBIDDEN, "Your role cannot cancel orders");
  }

  if (!allowedStatuses.includes(orderStatus)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Cannot cancel order in "${orderStatus}" status with your role`,
    );
  }

  // Ownership validation
  if (role === "USER" && order.userId.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This is not your order");
  }
  if (role === "MERCHANT" && order.merchantId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "This order does not belong to your store",
    );
  }
  if (
    role === "PROPERTY_HOST" &&
    order.propertyHostId?.toString() !== userData.userId
  ) {
    throw new ApiError(
      status.FORBIDDEN,
      "This order is not linked to your property",
    );
  }

  order.status = "cancelled";
  order.cancelledBy = role;
  order.cancelReason = payload.reason || "Cancelled by " + role.toLowerCase();
  await order.save();

  // Handle payment refund/cancellation
  const payment = await Payment.findOne({ orderId: order._id });
  if (payment) {
    if (payment.status === "succeeded") {
      // Full refund
      try {
        const refund = await StripeService.createRefund(
          payment.stripePaymentIntentId as string,
        );
        payment.refundId = refund.id;
        payment.refundAmount = refund.amount / 100;
        payment.status = "refunded";
        await payment.save();
      } catch (error: any) {
        const { logger } = require("../../../util/logger");
        logger.error(
          `Refund failed for order ${order.orderId}: ${error.message}`,
        );
      }
    } else if (payment.status === "unpaid") {
      // Cancel held payment intent
      try {
        await StripeService.cancelPaymentIntent(
          payment.stripePaymentIntentId as string,
        );
      } catch (error: any) {
        const { logger } = require("../../../util/logger");
        logger.error(
          `Payment cancellation failed for order ${order.orderId}: ${error.message}`,
        );
      }
    }
  }

  // Also cancel associated DeliveryRequest if exists
  if (order.propertyId) {
    await DeliveryRequest.updateMany(
      { orderId: order._id, status: "pending" },
      { status: "rejected", reviewedAt: new Date() },
    );
  }

  // Restore product stock
  for (const item of order.items) {
    const ProductModel = require("../product/Product").Product;
    await ProductModel.findByIdAndUpdate(item.productId, {
      $inc: { quantity: item.quantity },
    });
  }

  // Notify all parties
  await postNotification(
    "Order Cancelled",
    `Order ${order.orderId} has been cancelled. Reason: ${order.cancelReason}`,
    order.userId,
  );
  if (order.userId.toString() !== userData.userId) {
    await postNotification(
      "Order Cancelled",
      `Order ${order.orderId} has been cancelled`,
      order.merchantId,
    );
  }

  return order;
};

// Continued in Step 30...
const OrderService = {
  placeOrder,
  activateOrderAfterPayment,
  getOrder,
  getMyOrders,
  getActiveOrders,
  getDriverHistory,
  getPendingDeliveryRequests,
  trackOrder,
  acceptOrder,
  updateOrderStatus,
  assignDriver,
  acceptDelivery,
  pickedUp,
  outForDelivery,
  deliver,
  cancelOrder,
};

export { OrderService };
