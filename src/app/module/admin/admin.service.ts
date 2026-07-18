const { default: status } = require("http-status");
import ApiError from "../../../error/ApiError";
import Auth from "../auth/Auth";
import Admin from "./Admin";
import unlinkFile from "../../../util/unlinkFile";
import deleteFalsyField from "../../../util/deleteFalsyField";
import validateFields from "../../../util/validateFields";
import { Request } from "express";
import { AuthUserPayload } from "../../../types/auth.types";

import User from "../user/User";
import Order from "../order/Order";
import DeliveryRequest from "../order/DeliveryRequest";
import Property from "../property/Property";
import Payment from "../payment/Payment";
import { Product } from "../product/Product";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import {
  EnumUserRole,
  EnumOrderStatus,
  EnumApplicationStatus,
  EnumDeliveryRequestStatus,
  EnumPaymentStatus,
} from "../../../util/enum";
import { StripeService } from "../payment/stripe.service";
import postNotification from "../../../util/postNotification";
import { logger } from "../../../util/logger";
import Notification from "../notification/Notification";

const updateProfile = async (req: Request) => {
  const { body: data } = req;
  const { userId, authId } = req.user as AuthUserPayload;
  const files = req.files as
    | {
        [fieldname: string]: Express.Multer.File[];
      }
    | undefined;

  const updatedData: Record<string, string> = {
    ...(data.address && { address: data.address }),
    ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
    ...(data.name && { name: data.name }),
  };

  deleteFalsyField(updatedData);
  const existingUser = await Admin.findById(userId).lean();

  let hasNewImage = false;
  if (files && files.profile_image) {
    updatedData.profile_image = files.profile_image[0].path;
    hasNewImage = true;
  }

  const [auth, admin] = await Promise.all([
    Auth.findByIdAndUpdate(
      authId,
      { name: updatedData.name },
      {
        returnDocument: "after",
      },
    ),
    Admin.findByIdAndUpdate(
      userId,
      { ...updatedData },
      {
        returnDocument: "after",
      },
    ).populate("authId"),
  ]);

  if (!auth || !admin) throw new ApiError(status.NOT_FOUND, "User not found!");

  if (hasNewImage && existingUser && existingUser.profile_image) {
    unlinkFile(existingUser.profile_image);
  }

  return admin;
};

const getProfile = async (userData: AuthUserPayload) => {
  const { userId, authId } = userData;

  const [auth, result] = await Promise.all([
    Auth.findById(authId).lean(),
    Admin.findById(userId).populate("authId").lean(),
  ]);

  if (!result || !auth) throw new ApiError(status.NOT_FOUND, "Admin not found");
  if (auth.isBlocked)
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");

  return result;
};

const deleteMyAccount = async (payload: {
  email: string;
  password: string;
}) => {
  const { email, password } = payload;

  const [auth, admin] = await Promise.all([
    Auth.findOne({ email }).select("+password").lean(),
    Admin.findOne({ email }).lean(),
  ]);

  if (!auth || !admin) {
    throw new ApiError(status.NOT_FOUND, "Admin does not exist");
  }
  if (
    auth.password &&
    !(await Auth.isPasswordMatched(password, auth.password))
  ) {
    throw new ApiError(status.FORBIDDEN, "Password is incorrect");
  }

  if (admin.profile_image) {
    unlinkFile(admin.profile_image);
  }

  await Promise.all([
    Auth.deleteOne({ _id: auth._id }),
    Admin.deleteOne({ _id: admin._id }),
  ]);
};

// --- User Management ---
/**
 * Attaches the per-user counts the admin user list shows: order count for
 * customers, property count for hosts. Both are resolved with a single grouped
 * aggregate over the current page's ids rather than one query per row.
 */
const IN_PROGRESS_STATUSES = [
  EnumOrderStatus.DRIVER_ASSIGNED,
  EnumOrderStatus.PICKED_UP,
  EnumOrderStatus.OUT_FOR_DELIVERY,
];

const attachUserCounts = async (users: any[]) => {
  if (!users.length) return users;

  const customerIds = users
    .filter((u) => u.role === EnumUserRole.USER)
    .map((u) => u._id);
  const hostIds = users
    .filter((u) => u.role === EnumUserRole.PROPERTY_HOST)
    .map((u) => u._id);
  const driverIds = users
    .filter((u) => u.role === EnumUserRole.DRIVER)
    .map((u) => u._id);

  const [orderCounts, propertyCounts, activeDeliveries] = await Promise.all([
    customerIds.length
      ? Order.aggregate([
          { $match: { userId: { $in: customerIds } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
      : [],
    hostIds.length
      ? Property.aggregate([
          { $match: { hostId: { $in: hostIds } } },
          { $group: { _id: "$hostId", count: { $sum: 1 } } },
        ])
      : [],
    // The drivers list shows each driver's in-flight order.
    driverIds.length
      ? Order.find({
          driverId: { $in: driverIds },
          status: { $in: IN_PROGRESS_STATUSES },
        })
          .select("orderId status driverId")
          .lean()
      : [],
  ]);

  const orderMap = new Map(orderCounts.map((c: any) => [String(c._id), c.count]));
  const propertyMap = new Map(
    propertyCounts.map((c: any) => [String(c._id), c.count]),
  );
  const activeMap = new Map(
    (activeDeliveries as any[]).map((o) => [String(o.driverId), o]),
  );

  return users.map((user) => {
    // QueryBuilder returns hydrated documents, so drop down to a plain object
    // before adding fields that are not on the schema.
    const plain = typeof user.toObject === "function" ? user.toObject() : user;
    const id = String(plain._id);

    if (plain.role === EnumUserRole.USER) {
      plain.totalOrders = orderMap.get(id) ?? 0;
    }
    if (plain.role === EnumUserRole.PROPERTY_HOST) {
      plain.totalProperties = propertyMap.get(id) ?? 0;
    }
    if (plain.role === EnumUserRole.DRIVER) {
      const current = activeMap.get(id);
      plain.currentOrder = current
        ? { orderId: current.orderId, status: current.status }
        : null;
    }
    return plain;
  });
};

/**
 * Resolves the admin lists' `accountStatus` pill into a Mongo filter.
 *
 * A participant's state spans two collections — suspension is `Auth.isBlocked`
 * while approval is on the User — and the approval field differs per role:
 * drivers carry `applicationStatus`, merchants and hosts only have `isApproved`
 * (unset until approved, so `$ne: true` rather than `false`). Customers have no
 * approval step at all. None of that is expressible through QueryBuilder's
 * equality filters, so it is lifted into a base filter here.
 */
const buildAccountStatusFilter = async (
  accountStatus: string | undefined,
  role: string | undefined,
) => {
  if (!accountStatus) return {};

  const blockedAuthIds = await Auth.find({ isBlocked: true }).distinct("_id");

  if (accountStatus === "suspended") {
    return { authId: { $in: blockedAuthIds } };
  }

  const notBlocked = { authId: { $nin: blockedAuthIds } };

  if (role === EnumUserRole.DRIVER) {
    const map: Record<string, any> = {
      active: { applicationStatus: EnumApplicationStatus.APPROVED },
      pending: { applicationStatus: EnumApplicationStatus.PENDING },
      rejected: { applicationStatus: EnumApplicationStatus.REJECTED },
    };
    return map[accountStatus] ? { ...notBlocked, ...map[accountStatus] } : notBlocked;
  }

  if (role === EnumUserRole.MERCHANT || role === EnumUserRole.PROPERTY_HOST) {
    if (accountStatus === "active") return { ...notBlocked, isApproved: true };
    if (accountStatus === "pending")
      return { ...notBlocked, isApproved: { $ne: true } };
    return notBlocked;
  }

  // Customers are only ever active or suspended.
  return accountStatus === "active" ? notBlocked : notBlocked;
};

const getAllUsers = async (query: QueryParams) => {
  const { accountStatus, ...restQuery } = query as QueryParams & {
    accountStatus?: string;
    role?: string;
  };
  const baseFilter = await buildAccountStatusFilter(
    accountStatus,
    (query as any).role,
  );

  // `isBlocked` lives on Auth, not User — the admin list needs it to render
  // account status and to drive the suspend/reactivate action.
  const userQuery = new QueryBuilder(
    User.find(baseFilter).populate("authId", "isBlocked isActive isVerified"),
    restQuery,
  )
    .search(["name", "email", "phoneNumber", "storeName"])
    .filter()
    .sort()
    .paginate();
  const [users, meta] = await Promise.all([
    userQuery.modelQuery,
    userQuery.countTotal(),
  ]);
  return { meta, users: await attachUserCounts(users) };
};

const blockUser = async (authId: string, isBlocked: boolean) => {
  validateFields({ authId }, ["authId"]);

  // A missing isBlocked used to be written through as undefined, silently
  // clearing the block instead of rejecting the request.
  if (typeof isBlocked !== "boolean")
    throw new ApiError(status.BAD_REQUEST, "isBlocked must be a boolean");

  const user = await Auth.findByIdAndUpdate(
    authId,
    { isBlocked },
    { new: true },
  );
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");
  return user;
};

/**
 * findByIdAndUpdate resolves to null for an unknown id, which the controllers
 * happily reported as "approved" — a typo'd id looked like a successful review.
 * Guard the id and the target's role before touching the document.
 */
const updateApplicationState = async (
  userId: string,
  expectedRole: string,
  update: Record<string, unknown>,
) => {
  validateFields({ userId }, ["userId"]);

  const user = await User.findById(userId).select("role");
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  if (user.role !== expectedRole)
    throw new ApiError(
      status.BAD_REQUEST,
      `User is not a ${expectedRole.toLowerCase().replace("_", " ")}`,
    );

  return await User.findByIdAndUpdate(userId, update, { new: true });
};

const approveDriver = async (userId: string) =>
  updateApplicationState(userId, EnumUserRole.DRIVER, {
    isApproved: true,
    applicationStatus: EnumApplicationStatus.APPROVED,
  });

const rejectDriver = async (userId: string) =>
  updateApplicationState(userId, EnumUserRole.DRIVER, {
    isApproved: false,
    applicationStatus: EnumApplicationStatus.REJECTED,
  });

const approveMerchant = async (userId: string) =>
  updateApplicationState(userId, EnumUserRole.MERCHANT, { isApproved: true });

const approvePropertyHost = async (userId: string) =>
  updateApplicationState(userId, EnumUserRole.PROPERTY_HOST, {
    isApproved: true,
  });

// --- Order & Delivery Requests ---
/**
 * QueryBuilder treats every stray key as an exact-equality filter and drops any
 * object value, so it cannot express "status is one of N". The admin lists group
 * several statuses under one tab, so accept a comma-separated `status` and lift
 * it out of the query into a base `$in` filter.
 */
const splitStatusFilter = (query: QueryParams) => {
  const { status, ...rest } = query as QueryParams & { status?: string };

  if (typeof status !== "string" || !status.includes(",")) {
    return { baseFilter: {}, restQuery: query };
  }

  const statuses = status
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { baseFilter: { status: { $in: statuses } }, restQuery: rest };
};

const getAllOrders = async (query: QueryParams) => {
  const { baseFilter, restQuery } = splitStatusFilter(query);

  // The customer/store on an Order are `userId`/`merchantId`; there are no
  // `customerId`/`storeId` paths, and populating them throws StrictPopulateError.
  const orderQuery = new QueryBuilder(
    Order.find(baseFilter)
      .populate("userId", "name email phoneNumber profile_image")
      .populate("merchantId", "name storeName store_logo storePhoneNumber")
      .populate("driverId", "name phoneNumber profile_image vehicleType")
      .populate("propertyId", "propertyName propertyCode city"),
    restQuery,
  )
    .search(["orderId", "deliveryAddress"])
    .filter()
    .sort()
    .paginate();
  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);
  return { meta, orders };
};

const getAllDeliveryRequests = async (query: QueryParams) => {
  const { baseFilter, restQuery } = splitStatusFilter(query);

  const requestQuery = new QueryBuilder(
    DeliveryRequest.find(baseFilter)
      .populate("orderId", "orderId items subtotal total status createdAt")
      .populate("hostId", "name email phoneNumber businessName")
      .populate("customerId", "name email phoneNumber profile_image")
      .populate("propertyId", "propertyName propertyCode city"),
    restQuery,
  )
    .search(["requestId"])
    .filter()
    .sort()
    .paginate();
  const [requests, meta] = await Promise.all([
    requestQuery.modelQuery,
    requestQuery.countTotal(),
  ]);
  return { meta, requests };
};

/**
 * Admin override of property-host approval. This has to do everything
 * PropertyService.approveRequest does apart from the host ownership check:
 * reveal the property address on the order, carry over the delivery window and
 * capture the held PaymentIntent. Skipping any of those leaves the merchant with
 * an order it cannot deliver and a payment that is never taken.
 *
 * The window/stay dates are optional here — an admin forcing a request through
 * usually just confirms it — so they fall back to the property's delivery rules.
 */
const forceApproveRequest = async (
  adminUserId: string,
  payload: Record<string, any>,
) => {
  const request = await DeliveryRequest.findById(payload.requestId);
  if (!request) throw new ApiError(status.NOT_FOUND, "Request not found");

  if (request.status !== EnumDeliveryRequestStatus.PENDING) {
    throw new ApiError(
      status.BAD_REQUEST,
      "This request has already been reviewed",
    );
  }

  const property = await Property.findById(request.propertyId).lean();

  const rules = property?.deliveryRules;
  const parseDate = (value?: string | Date) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const windowStart = parseDate(payload.deliveryWindowStart);
  const windowEnd = parseDate(payload.deliveryWindowEnd);
  const checkIn =
    parseDate(payload.guestStayCheckIn) ?? parseDate(rules?.guestStayCheckIn);
  const checkOut =
    parseDate(payload.guestStayCheckOut) ?? parseDate(rules?.guestStayCheckOut);

  if (windowStart && windowEnd && windowStart > windowEnd) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Delivery window end must be after its start",
    );
  }

  request.status = EnumDeliveryRequestStatus.FORCE_APPROVED;
  request.reviewedAt = new Date();
  request.forceApprovedBy = adminUserId as any;
  if (windowStart && windowEnd) {
    request.deliveryWindow = { start: windowStart, end: windowEnd };
  }
  if (checkIn && checkOut) {
    request.guestStayDates = { checkIn, checkOut };
  }
  await request.save();

  const order = await Order.findById(request.orderId);
  if (order) {
    // "approved" — not "preparing". The merchant still has to accept the order;
    // pending_host_approval -> preparing is not a legal transition.
    order.status = EnumOrderStatus.APPROVED;
    order.approvedAt = new Date();

    if (windowStart && windowEnd) {
      order.deliveryWindow = { start: windowStart, end: windowEnd };
    }
    if (checkIn && checkOut) {
      order.stayDates = { checkIn, checkOut };
    }

    if (property) {
      order.deliveryAddress = property.physicalAddress;
      if (property.locationCoordinates?.coordinates?.length) {
        order.deliveryCoordinates = property.locationCoordinates as any;
      }
    }
    await order.save();

    const payment = await Payment.findOne({ orderId: order._id });
    if (payment?.stripePaymentIntentId && payment.status !== "succeeded") {
      try {
        await StripeService.capturePaymentIntent(payment.stripePaymentIntentId);
        payment.status = EnumPaymentStatus.SUCCEEDED;
        await payment.save();
      } catch (error: any) {
        // Mirrors the host flow: a capture failure must not undo the approval.
        logger.error(
          `Failed to capture payment for order ${order.orderId}: ${error.message}`,
        );
      }
    }

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

/**
 * Admin override of a host rejection. PropertyService.rejectRequest is scoped to
 * the owning host, so an admin can never use it.
 */
const rejectRequest = async (payload: Record<string, any>) => {
  const request = await DeliveryRequest.findById(payload.requestId);
  if (!request) throw new ApiError(status.NOT_FOUND, "Request not found");

  if (request.status !== EnumDeliveryRequestStatus.PENDING) {
    throw new ApiError(
      status.BAD_REQUEST,
      "This request has already been reviewed",
    );
  }

  request.status = EnumDeliveryRequestStatus.REJECTED;
  request.reviewedAt = new Date();
  await request.save();

  const order = await Order.findById(request.orderId);
  if (order) {
    order.status = EnumOrderStatus.CANCELLED;
    order.cancelledBy = EnumUserRole.ADMIN;
    order.cancelReason = payload.reason || "Rejected by admin";
    await order.save();

    const payment = await Payment.findOne({ orderId: order._id });
    if (payment?.stripePaymentIntentId && payment.status === "unpaid") {
      try {
        await StripeService.cancelPaymentIntent(payment.stripePaymentIntentId);
      } catch (error: any) {
        logger.error(
          `Failed to cancel payment for order ${order.orderId}: ${error.message}`,
        );
      }
    }

    await postNotification(
      "Delivery Request Rejected",
      `Your delivery request for order ${order.orderId} was rejected. Reason: ${payload.reason || "No reason provided"}`,
      order.userId,
    );
  }

  return request;
};

// --- Store & Property Management ---
/**
 * The stores list shows per-store order and product totals. Same approach as
 * attachUserCounts: one grouped aggregate per metric over the current page.
 */
const attachStoreCounts = async (stores: any[]) => {
  if (!stores.length) return stores;

  const ids = stores.map((s) => s._id);
  const [orderCounts, productCounts] = await Promise.all([
    Order.aggregate([
      { $match: { merchantId: { $in: ids } } },
      { $group: { _id: "$merchantId", count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $match: { merchant: { $in: ids } } },
      { $group: { _id: "$merchant", count: { $sum: 1 } } },
    ]),
  ]);

  const orderMap = new Map(
    orderCounts.map((c: any) => [String(c._id), c.count]),
  );
  const productMap = new Map(
    productCounts.map((c: any) => [String(c._id), c.count]),
  );

  return stores.map((store) => {
    const plain = typeof store.toObject === "function" ? store.toObject() : store;
    const id = String(plain._id);
    plain.totalOrders = orderMap.get(id) ?? 0;
    plain.totalProducts = productMap.get(id) ?? 0;
    return plain;
  });
};

const getAllStores = async (query: QueryParams) => {
  const { accountStatus, ...restQuery } = query as QueryParams & {
    accountStatus?: string;
  };
  const baseFilter = await buildAccountStatusFilter(
    accountStatus,
    EnumUserRole.MERCHANT,
  );

  const storeQuery = new QueryBuilder(
    User.find({ ...baseFilter, role: EnumUserRole.MERCHANT }).populate(
      "authId",
      "isBlocked isActive isVerified",
    ),
    restQuery,
  )
    .search(["storeName", "name", "email", "businessType", "storeCity"])
    .filter()
    .sort()
    .paginate();
  const [stores, meta] = await Promise.all([
    storeQuery.modelQuery,
    storeQuery.countTotal(),
  ]);
  return { meta, stores: await attachStoreCounts(stores) };
};

/** Total delivered orders per property, for the properties list. */
const attachPropertyCounts = async (properties: any[]) => {
  if (!properties.length) return properties;

  const deliveryCounts = await Order.aggregate([
    {
      $match: {
        propertyId: { $in: properties.map((p) => p._id) },
        status: EnumOrderStatus.DELIVERED,
      },
    },
    { $group: { _id: "$propertyId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    deliveryCounts.map((c: any) => [String(c._id), c.count]),
  );

  return properties.map((property) => {
    const plain =
      typeof property.toObject === "function" ? property.toObject() : property;
    plain.totalDeliveries = countMap.get(String(plain._id)) ?? 0;
    return plain;
  });
};

const getAllProperties = async (query: QueryParams) => {
  const propertyQuery = new QueryBuilder(
    Property.find().populate("hostId", "name email phoneNumber businessName"),
    query,
  )
    .search(["propertyName", "propertyCode", "city", "physicalAddress"])
    .filter()
    .sort()
    .paginate();
  const [properties, meta] = await Promise.all([
    propertyQuery.modelQuery,
    propertyQuery.countTotal(),
  ]);
  return { meta, properties: await attachPropertyCounts(properties) };
};

/**
 * Flags or clears a flag on a property. `isFlagged` defaults to true so the
 * original flag-only callers keep working; passing false clears the flag and
 * its reason.
 */
const flagProperty = async (payload: Record<string, any>) => {
  const { propertyId, reason } = payload;
  const isFlagged = payload.isFlagged === undefined ? true : payload.isFlagged;

  if (isFlagged && !reason) {
    throw new ApiError(status.BAD_REQUEST, "A reason is required to flag a property");
  }

  const update = isFlagged
    ? { isFlagged: true, flaggedReason: reason, flaggedAt: new Date() }
    : { isFlagged: false, $unset: { flaggedReason: "", flaggedAt: "" } };

  const property = await Property.findByIdAndUpdate(propertyId, update, {
    new: true,
  });
  if (!property) throw new ApiError(status.NOT_FOUND, "Property not found");
  return property;
};

/**
 * Enables/disables a property. PropertyService.updateProperty is scoped to the
 * owning host and reads `isActive` only when it is a real boolean — which never
 * happens over its multipart route — so admins need their own path.
 */
const setPropertyStatus = async (payload: Record<string, any>) => {
  const { propertyId, isActive } = payload;

  if (typeof isActive !== "boolean") {
    throw new ApiError(status.BAD_REQUEST, "isActive must be a boolean");
  }

  const property = await Property.findByIdAndUpdate(
    propertyId,
    { isActive },
    { new: true },
  );
  if (!property) throw new ApiError(status.NOT_FOUND, "Property not found");
  return property;
};

// --- Payments ---
const getAllPayments = async (query: QueryParams) => {
  const { baseFilter, restQuery } = splitStatusFilter(query);

  const paymentQuery = new QueryBuilder(
    Payment.find(baseFilter)
      .populate("userId", "name email profile_image")
      .populate("orderId", "orderId status total merchantId"),
    restQuery,
  )
    .search(["stripePaymentIntentId"])
    .filter()
    .sort()
    .paginate();
  const [transactions, meta] = await Promise.all([
    paymentQuery.modelQuery,
    paymentQuery.countTotal(),
  ]);
  return { meta, transactions };
};

// --- Dashboard & Reports ---
const getDashboardStats = async () => {
  // UTC day boundary, matching how getAnalytics buckets days.
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [
    totalCustomers,
    totalMerchants,
    totalDrivers,
    totalPropertyHosts,
    totalOrders,
    activeOrders,
    pendingHostApproval,
    deliveriesInProgress,
    completedToday,
    pendingDrivers,
    pendingMerchants,
    pendingPropertyHosts,
    flaggedProperties,
    totalProperties,
    activeProperties,
    driversOnline,
    driverRating,
  ] = await Promise.all([
    User.countDocuments({ role: EnumUserRole.USER }),
    User.countDocuments({ role: EnumUserRole.MERCHANT }),
    User.countDocuments({ role: EnumUserRole.DRIVER }),
    User.countDocuments({ role: EnumUserRole.PROPERTY_HOST }),
    Order.countDocuments(),
    Order.countDocuments({
      status: {
        $nin: [EnumOrderStatus.DELIVERED, EnumOrderStatus.CANCELLED],
      },
    }),
    Order.countDocuments({ status: EnumOrderStatus.PENDING_HOST_APPROVAL }),
    Order.countDocuments({ status: { $in: IN_PROGRESS_STATUSES } }),
    Order.countDocuments({
      status: EnumOrderStatus.DELIVERED,
      actualDeliveryTime: { $gte: startOfToday },
    }),
    // `isApproved` is only initialised for drivers at registration, so merchants
    // and hosts awaiting approval have it unset rather than false.
    User.countDocuments({
      role: EnumUserRole.DRIVER,
      applicationStatus: EnumApplicationStatus.PENDING,
    }),
    User.countDocuments({
      role: EnumUserRole.MERCHANT,
      isApproved: { $ne: true },
    }),
    User.countDocuments({
      role: EnumUserRole.PROPERTY_HOST,
      isApproved: { $ne: true },
    }),
    Property.countDocuments({ isFlagged: true }),
    Property.countDocuments(),
    Property.countDocuments({ isActive: true }),
    User.countDocuments({ role: EnumUserRole.DRIVER, isOnline: true }),
    // Average only over drivers who actually have reviews, so unrated drivers
    // don't drag the platform average toward zero.
    User.aggregate([
      { $match: { role: EnumUserRole.DRIVER, totalReviews: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$averageRating" } } },
    ]),
  ]);

  return {
    users: {
      customers: totalCustomers,
      merchants: totalMerchants,
      drivers: totalDrivers,
      propertyHosts: totalPropertyHosts,
      driversOnline,
      driverAverageRating: driverRating[0]?.avg
        ? Number(driverRating[0].avg.toFixed(2))
        : 0,
    },
    logistics: {
      totalOrders,
      activeOrders,
      pendingHostApproval,
      deliveriesInProgress,
      completedToday,
    },
    pending: {
      drivers: pendingDrivers,
      merchants: pendingMerchants,
      propertyHosts: pendingPropertyHosts,
    },
    properties: {
      total: totalProperties,
      active: activeProperties,
      flagged: flaggedProperties,
    },
  };
};

/**
 * Time-series + totals for the Reports & Analytics page.
 *
 * Revenue is derived from delivered Orders rather than the Payment collection:
 * Payment.amount is stored in cents and only exists once a PaymentIntent has
 * been created, whereas the Order carries the authoritative subtotal/total and
 * the platform's commission split.
 */
const getAnalytics = async (query: QueryParams & { days?: string }) => {
  const days = Math.min(Math.max(Number(query.days) || 7, 1), 365);

  // Day bucketing is done entirely in UTC: $dateToString below defaults to UTC,
  // so building the window from local midnight would shift it relative to the
  // aggregate's keys and silently drop the most recent day.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const [series, totals, acquisition, activeUsers] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: EnumOrderStatus.DELIVERED,
          actualDeliveryTime: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$actualDeliveryTime" },
          },
          revenue: { $sum: "$total" },
          platformRevenue: { $sum: "$platformCommission" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: EnumOrderStatus.DELIVERED } },
      {
        $group: {
          _id: null,
          gmv: { $sum: "$total" },
          platformRevenue: { $sum: "$platformCommission" },
          ordersCompleted: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.countDocuments(),
  ]);

  // The aggregate only emits days that had deliveries; fill the gaps so the
  // chart shows a continuous axis.
  const byDate = new Map(series.map((s: any) => [s._id, s]));
  const filledSeries = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const found: any = byDate.get(key);
    return {
      date: key,
      revenue: Number((found?.revenue ?? 0).toFixed(2)),
      platformRevenue: Number((found?.platformRevenue ?? 0).toFixed(2)),
      orders: found?.orders ?? 0,
    };
  });

  const totalUsers = acquisition.reduce((sum: number, r: any) => sum + r.count, 0);

  return {
    days,
    series: filledSeries,
    totals: {
      activeUsers,
      ordersCompleted: totals[0]?.ordersCompleted ?? 0,
      gmv: Number((totals[0]?.gmv ?? 0).toFixed(2)),
      platformRevenue: Number((totals[0]?.platformRevenue ?? 0).toFixed(2)),
    },
    userAcquisition: acquisition.map((r: any) => ({
      role: r._id,
      count: r.count,
      pct: totalUsers ? Number(((r.count / totalUsers) * 100).toFixed(1)) : 0,
    })),
  };
};

/**
 * Broadcasts a notification to every user in an audience.
 *
 * postNotification() writes one document at a time and swallows its errors,
 * which is fine for incidental events but not for a fan-out — so this inserts
 * the batch directly and reports how many landed.
 */
const broadcastNotification = async (payload: Record<string, any>) => {
  const { title, message, audience } = payload;

  if (!title || !message) {
    throw new ApiError(status.BAD_REQUEST, "Title and message are required");
  }

  const BROADCAST_AUDIENCES = [
    "ALL",
    EnumUserRole.USER,
    EnumUserRole.MERCHANT,
    EnumUserRole.DRIVER,
    EnumUserRole.PROPERTY_HOST,
  ];
  if (!BROADCAST_AUDIENCES.includes(audience)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Audience must be one of: ${BROADCAST_AUDIENCES.join(", ")}`,
    );
  }

  const filter = audience === "ALL" ? {} : { role: audience };
  const recipientIds = await User.find(filter).distinct("_id");

  if (!recipientIds.length) {
    throw new ApiError(status.NOT_FOUND, "No users match that audience");
  }

  const now = new Date();
  await Notification.insertMany(
    recipientIds.map((toId) => ({
      toId,
      title,
      message,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return { audience, delivered: recipientIds.length, title, message, sentAt: now };
};

const AdminService = {
  updateProfile,
  getProfile,
  deleteMyAccount,
  getAllUsers,
  blockUser,
  approveDriver,
  rejectDriver,
  approveMerchant,
  approvePropertyHost,
  getAllOrders,
  getAllDeliveryRequests,
  forceApproveRequest,
  rejectRequest,
  getAllStores,
  getAllProperties,
  flagProperty,
  setPropertyStatus,
  getAllPayments,
  getDashboardStats,
  getAnalytics,
  broadcastNotification,
};

export { AdminService };
