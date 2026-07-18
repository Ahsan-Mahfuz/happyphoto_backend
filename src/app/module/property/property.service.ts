const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Property from "./Property";
import User from "../user/User";
import generatePropertyCode from "../../../util/generatePropertyCode";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import type { Request } from "express";
import unlinkFile from "../../../util/unlinkFile";
import DeliveryRequest from "../order/DeliveryRequest";
import Order from "../order/Order";
import { StripeService } from "../payment/stripe.service";
import Payment from "../payment/Payment";
import postNotification from "../../../util/postNotification";

const addProperty = async (req: Request) => {
  const { body: data, user: userData } = req;

  if (!userData) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  validateFields(data, [
    "propertyName",
    "propertyType",
    "physicalAddress",
    "city",
    "postalCode",
    "country",
  ]);

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const propertyCode = await generatePropertyCode();

  const propertyData: Record<string, any> = {
    hostId: userData.userId,
    propertyName: data.propertyName,
    propertyType: data.propertyType,
    physicalAddress: data.physicalAddress,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    country: data.country,
    propertyCode,
  };

  if (data.lat && data.long) {
    propertyData.locationCoordinates = {
      type: "Point",
      coordinates: [parseFloat(data.long), parseFloat(data.lat)],
    };
  }

  if (files?.property_image) {
    propertyData.propertyImage = files.property_image[0].path;
  }

  const property = await Property.create(propertyData);
  return property;
};

const getProperties = async (userData: any, query: QueryParams) => {
  const propertyQuery = new QueryBuilder(
    Property.find({ hostId: userData.userId }).lean(),
    query,
  )
    .search(["propertyName", "propertyCode", "city"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [properties, meta] = await Promise.all([
    propertyQuery.modelQuery,
    propertyQuery.countTotal(),
  ]);

  return { meta, properties };
};

const getProperty = async (userData: any, query: { propertyId?: string }) => {
  validateFields(query, ["propertyId"]);

  const property = await Property.findById(query.propertyId).lean();
  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found");
  }

  // Ownership check (non-admin)
  if (
    userData.role !== "ADMIN" &&
    property.hostId.toString() !== userData.userId
  ) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to view this property",
    );
  }

  return property;
};

const updateProperty = async (req: Request) => {
  const { body: data, user: userData } = req;

  if (!userData) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  validateFields(data, ["propertyId"]);

  const existingProperty = await Property.findById(data.propertyId);
  if (!existingProperty) {
    throw new ApiError(status.NOT_FOUND, "Property not found");
  }

  if (existingProperty.hostId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to update this property",
    );
  }

  const updateData: Record<string, any> = {};
  if (data.propertyName) updateData.propertyName = data.propertyName;
  if (data.propertyType) updateData.propertyType = data.propertyType;
  if (typeof data.isActive === "boolean") updateData.isActive = data.isActive;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  let replaceImage = false;
  if (files?.property_image) {
    updateData.propertyImage = files.property_image[0].path;
    replaceImage = true;
  }

  const updatedProperty = await Property.findByIdAndUpdate(
    data.propertyId,
    updateData,
    { returnDocument: "after", runValidators: true },
  );

  if (replaceImage && existingProperty.propertyImage) {
    unlinkFile(existingProperty.propertyImage);
  }

  return updatedProperty;
};

const deleteProperty = async (
  userData: any,
  payload: { propertyId?: string },
) => {
  validateFields(payload, ["propertyId"]);

  const property = await Property.findById(payload.propertyId);
  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found");
  }

  if (property.hostId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to delete this property",
    );
  }

  // Note: Check for active orders is done after Order model exists (Step 29+)
  // For now, just delete
  if (property.propertyImage) {
    unlinkFile(property.propertyImage);
  }

  await Property.deleteOne({ _id: payload.propertyId });
  return { message: "Property deleted successfully" };
};

const resolveCode = async (query: { propertyCode?: string }) => {
  validateFields(query, ["propertyCode"]);

  const property = await Property.findOne({
    propertyCode: query.propertyCode,
    isActive: true,
  }).lean();

  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found or inactive");
  }

  // Get host info for display
  const host = await User.findById(property.hostId)
    .select("businessName name")
    .lean();

  // NEVER expose physical address or coordinates
  return {
    propertyName: property.propertyName,
    propertyType: property.propertyType,
    hostCompany: host?.businessName || host?.name || "Host",
    city: property.city,
    state: property.state,
  };
};

const updateDeliveryRules = async (
  userData: any,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["propertyId"]);

  const property = await Property.findById(payload.propertyId);
  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found");
  }

  if (property.hostId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to update this property",
    );
  }

  const deliveryRules: Record<string, any> = {};
  if (payload.defaultWindowStart)
    deliveryRules.defaultWindowStart = payload.defaultWindowStart;
  if (payload.defaultWindowEnd)
    deliveryRules.defaultWindowEnd = payload.defaultWindowEnd;
  if (payload.guestStayCheckIn)
    deliveryRules.guestStayCheckIn = new Date(payload.guestStayCheckIn);
  if (payload.guestStayCheckOut)
    deliveryRules.guestStayCheckOut = new Date(payload.guestStayCheckOut);

  const guestStayDates: Record<string, any> = {};
  if (payload.guestStayCheckIn)
    guestStayDates.checkIn = new Date(payload.guestStayCheckIn);
  if (payload.guestStayCheckOut)
    guestStayDates.checkOut = new Date(payload.guestStayCheckOut);

  const updatedProperty = await Property.findByIdAndUpdate(
    payload.propertyId,
    {
      deliveryRules,
      ...(Object.keys(guestStayDates).length > 0 && { guestStayDates }),
    },
    { returnDocument: "after", runValidators: true },
  );

  return updatedProperty;
};

const getPendingRequests = async (userData: any, query: QueryParams) => {
  const requestQuery = new QueryBuilder(
    DeliveryRequest.find({
      hostId: userData.userId,
      status: "pending",
    })
      .populate({
        path: "orderId",
        select: "orderId items subtotal total status createdAt",
      })
      .populate({
        path: "customerId",
        select: "name email phoneNumber profile_image",
      })
      .populate({
        path: "propertyId",
        select: "propertyName propertyCode",
      })
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [requests, meta] = await Promise.all([
    requestQuery.modelQuery,
    requestQuery.countTotal(),
  ]);

  return { meta, requests };
};

const getScheduledRequests = async (userData: any, query: QueryParams) => {
  const requestQuery = new QueryBuilder(
    DeliveryRequest.find({
      hostId: userData.userId,
      status: { $in: ["approved", "force_approved"] },
    })
      .populate({
        path: "orderId",
        select:
          "orderId items subtotal total status deliveryWindow stayDates createdAt",
      })
      .populate({
        path: "customerId",
        select: "name email phoneNumber profile_image",
      })
      .populate({
        path: "propertyId",
        select: "propertyName propertyCode",
      })
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [requests, meta] = await Promise.all([
    requestQuery.modelQuery,
    requestQuery.countTotal(),
  ]);

  return { meta, requests };
};

const getDeliveredRequests = async (userData: any) => {
  // Get approved requests where the associated order has status "delivered"
  const requests = await DeliveryRequest.find({
    hostId: userData.userId,
    status: { $in: ["approved", "force_approved"] },
  })
    .populate({
      path: "orderId",
      match: { status: "delivered" },
      select:
        "orderId items subtotal total status actualDeliveryTime proofOfDelivery",
    })
    .populate({
      path: "customerId",
      select: "name email profile_image",
    })
    .populate({
      path: "propertyId",
      select: "propertyName propertyCode",
    })
    .lean();

  // Filter out requests where orderId populate returned null (order not delivered)
  const deliveredRequests = requests.filter((r: any) => r.orderId !== null);

  return { requests: deliveredRequests };
};

const approveRequest = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, [
    "requestId",
    "deliveryWindowStart",
    "deliveryWindowEnd",
    "guestStayCheckIn",
    "guestStayCheckOut",
  ]);

  const request = await DeliveryRequest.findById(payload.requestId);
  if (!request) {
    throw new ApiError(status.NOT_FOUND, "Delivery request not found");
  }

  if (request.hostId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to approve this request",
    );
  }

  if (request.status !== "pending") {
    throw new ApiError(
      status.BAD_REQUEST,
      "This request has already been reviewed",
    );
  }

  // Validate delivery window is within guest stay
  const windowStart = new Date(payload.deliveryWindowStart);
  const windowEnd = new Date(payload.deliveryWindowEnd);
  const checkIn = new Date(payload.guestStayCheckIn);
  const checkOut = new Date(payload.guestStayCheckOut);

  if (windowStart < checkIn || windowEnd > checkOut) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Delivery window must be within guest stay dates",
    );
  }

  // Update DeliveryRequest
  request.status = "approved";
  request.deliveryWindow = { start: windowStart, end: windowEnd };
  request.guestStayDates = { checkIn, checkOut };
  request.reviewedAt = new Date();
  await request.save();

  // Get the property address to reveal
  const property = await Property.findById(request.propertyId).lean();

  // Update Order
  const order = await Order.findById(request.orderId);
  if (order) {
    order.status = "approved";
    order.deliveryWindow = { start: windowStart, end: windowEnd };
    order.stayDates = { checkIn, checkOut };
    order.approvedAt = new Date();
    // NOW reveal the physical address
    if (property) {
      order.deliveryAddress = property.physicalAddress;
      if (property.locationCoordinates?.coordinates) {
        order.deliveryCoordinates = property.locationCoordinates as any;
      }
    }
    await order.save();

    // Capture the held payment
    const payment = await Payment.findOne({ orderId: order._id });
    if (payment?.stripePaymentIntentId) {
      try {
        await StripeService.capturePaymentIntent(payment.stripePaymentIntentId);
        payment.status = "succeeded";
        await payment.save();
      } catch (error: any) {
        // Log but don't fail the approval
        const { logger } = require("../../../util/logger");
        logger.error(
          `Failed to capture payment for order ${order.orderId}: ${error.message}`,
        );
      }
    }

    // Notify customer and merchant
    await postNotification(
      "Delivery Approved",
      `Your delivery to ${property?.propertyName || "property"} has been approved for order ${order.orderId}`,
      order.userId,
    );
    await postNotification(
      "New Approved Order",
      `Order ${order.orderId} has been approved and is ready for your action`,
      order.merchantId,
    );
  }

  return request;
};

const rejectRequest = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["requestId"]);

  const request = await DeliveryRequest.findById(payload.requestId);
  if (!request) {
    throw new ApiError(status.NOT_FOUND, "Delivery request not found");
  }

  if (request.hostId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You are not authorized to reject this request",
    );
  }

  if (request.status !== "pending") {
    throw new ApiError(
      status.BAD_REQUEST,
      "This request has already been reviewed",
    );
  }

  // Update DeliveryRequest
  request.status = "rejected";
  request.reviewedAt = new Date();
  await request.save();

  // Cancel Order
  const order = await Order.findById(request.orderId);
  if (order) {
    order.status = "cancelled";
    order.cancelledBy = "PROPERTY_HOST";
    order.cancelReason = payload.reason || "Rejected by property host";
    await order.save();

    // Cancel the held payment
    const payment = await Payment.findOne({ orderId: order._id });
    if (payment?.stripePaymentIntentId && payment.status === "unpaid") {
      try {
        await StripeService.cancelPaymentIntent(payment.stripePaymentIntentId);
      } catch (error: any) {
        const { logger } = require("../../../util/logger");
        logger.error(
          `Failed to cancel payment for order ${order.orderId}: ${error.message}`,
        );
      }
    }

    // Notify customer
    await postNotification(
      "Delivery Request Rejected",
      `Your delivery request for order ${order.orderId} was rejected. Reason: ${payload.reason || "No reason provided"}`,
      order.userId,
    );
  }

  return request;
};
const getDashboardStats = async (userData: any) => {
  const propertiesCount = await Property.countDocuments({
    hostId: userData.userId,
  });

  const pendingCount = await DeliveryRequest.countDocuments({
    hostId: userData.userId,
    status: "pending",
  });

  const upcomingCount = await DeliveryRequest.countDocuments({
    hostId: userData.userId,
    status: { $in: ["approved", "force_approved"] },
  });

  // Count delivered orders for this host
  const deliveredOrders = await Order.countDocuments({
    propertyHostId: userData.userId,
    status: "delivered",
  });

  return {
    propertiesCount,
    pendingCount,
    upcomingCount,
    deliveredCount: deliveredOrders,
  };
};

const PropertyService = {
  addProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  resolveCode,
  updateDeliveryRules,
  getDashboardStats,
  getPendingRequests,
  getScheduledRequests,
  getDeliveredRequests,
  approveRequest,
  rejectRequest,
};

export { PropertyService };
