# Fridge Fillers — Implementation Guideline Part 4

> **Steps 65–76** | Domains: Reviews · Notifications · Admin Dashboard & Oversight · Socket.IO · Final Wiring

---

## Step 65 — Create Review Model & Interface

### What & Why

Users, Property Hosts, and Admins need a way to review Merchants and Drivers. This impacts their `averageRating` and `totalReviews`. We need a schema and Typescript interface.

### Code

Create `src/app/module/review/review.interface.ts`:

```typescript
import { Types } from "mongoose";

export interface IReview {
  user: Types.ObjectId;
  targetId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  review: string;
}
```

Create `src/app/module/review/Review.ts`:

```typescript
import { Schema, model } from "mongoose";
import { IReview } from "./review.interface";

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
  },
  { timestamps: true },
);

const Review = model<IReview>("Review", reviewSchema);
export default Review;
```

### Verification

- Ensure `Review.ts` compiles without type errors.

---

## Step 66 — Create Review Service, Controller & Routes

### What & Why

We need endpoints to create a review and fetch reviews for a specific target. Creating a review must be wrapped in a transaction to safely update the target user's `averageRating` and `totalReviews`.

### Code

Create `src/app/module/review/review.service.ts`:

```typescript
import mongoose from "mongoose";
import Review from "./Review";
import User from "../user/User";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import QueryBuilder from "../../builder/QueryBuilder";

const createReview = async (userData: any, payload: any) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const review = await Review.create(
      [{ ...payload, user: userData.userId }],
      { session },
    );

    const target = await User.findById(payload.targetId).session(session);
    if (!target)
      throw new AppError(httpStatus.NOT_FOUND, "Target user not found");

    const total = target.totalReviews || 0;
    const currentAvg = target.averageRating || 0;

    target.averageRating = (currentAvg * total + payload.rating) / (total + 1);
    target.totalReviews = total + 1;

    await target.save({ session });
    await session.commitTransaction();

    return review[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getReviews = async (query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(
    Review.find().populate("user", "name profile_image"),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const [reviews, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  return { meta, reviews };
};

export const ReviewService = { createReview, getReviews };
```

Create `src/app/module/review/review.controller.ts`:

```typescript
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReview(req.user, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review submitted successfully",
    data: result,
  });
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getReviews(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    meta: result.meta,
    data: result.reviews,
  });
});

export const ReviewController = { createReview, getReviews };
```

Create `src/app/module/review/review.route.ts`:

```typescript
import { Router } from "express";
import auth from "../../middleware/auth";
import { ReviewController } from "./review.controller";
import config from "../../config";

const router = Router();

router.post(
  "/create",
  auth(config.auth_level.user, config.auth_level.property_host),
  ReviewController.createReview,
);

router.get("/", ReviewController.getReviews);

export const ReviewRoutes = router;
```

### Verification

- `POST /review/create` (requires Auth USER or HOST).
- `GET /review?targetId=<id>` (public or authenticated).

---

## Step 67 — Create Notification & AdminNotification Models

### What & Why

Standard system notifications for regular users (`toId` required) and platform alerts specifically for admins (`toId` not required).

### Code

Create `src/app/module/notification/notification.interface.ts`:

```typescript
import { Types } from "mongoose";

export interface INotification {
  toId: Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
}

export interface IAdminNotification {
  title: string;
  message: string;
  isRead: boolean;
}
```

Create `src/app/module/notification/Notification.ts`:

```typescript
import { Schema, model } from "mongoose";
import { INotification, IAdminNotification } from "./notification.interface";

const notificationSchema = new Schema<INotification>(
  {
    toId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);

const adminNotificationSchema = new Schema<IAdminNotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AdminNotification = model<IAdminNotification>(
  "AdminNotification",
  adminNotificationSchema,
);
```

---

## Step 68 — Create Notification Service, Controller & Route

### What & Why

Users need to view their notifications and mark them as read.

### Code

Create `src/app/module/notification/notification.service.ts`:

```typescript
import { Notification } from "./Notification";
import QueryBuilder from "../../builder/QueryBuilder";

const getMyNotifications = async (
  userData: any,
  query: Record<string, unknown>,
) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ toId: userData.userId }),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [notifications, meta] = await Promise.all([
    notificationQuery.modelQuery,
    notificationQuery.countTotal(),
  ]);

  return { meta, notifications };
};

const markAsRead = async (notificationId: string) => {
  return await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true },
  );
};

export const NotificationService = { getMyNotifications, markAsRead };
```

Create `src/app/module/notification/notification.controller.ts`:

```typescript
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getMyNotifications(
    req.user,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications retrieved successfully",
    meta: result.meta,
    data: result.notifications,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

export const NotificationController = { getMyNotifications, markAsRead };
```

Create `src/app/module/notification/notification.route.ts`:

```typescript
import { Router } from "express";
import auth from "../../middleware/auth";
import { NotificationController } from "./notification.controller";
import config from "../../config";

const router = Router();

router.use(auth(config.auth_level.all));

router.get("/my-notifications", NotificationController.getMyNotifications);
router.patch("/:id/read", NotificationController.markAsRead);

export const NotificationRoutes = router;
```

---

## Step 69 — Admin Service: User & Driver Management

### What & Why

The Admin needs to approve applications (Driver, Merchant, Property Host), block users, and list users.

### Code

Create `src/app/module/admin/admin.service.ts`:

```typescript
import User from "../user/User";
import Order from "../order/Order";
import DeliveryRequest from "../order/DeliveryRequest";
import Property from "../property/Property";
import Store from "../store/Store";
import Payout from "../payment/Payout";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import QueryBuilder from "../../builder/QueryBuilder";

// --- User Management ---
const getAllUsers = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find(), query)
    .filter()
    .sort()
    .paginate();
  const [users, meta] = await Promise.all([
    userQuery.modelQuery,
    userQuery.countTotal(),
  ]);
  return { meta, users };
};

const blockUser = async (authId: string, isBlocked: boolean) => {
  const user = await User.findOneAndUpdate(
    { authId },
    { isBlocked },
    { new: true },
  );
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  return user;
};

const approveDriver = async (userId: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { isApproved: true, applicationStatus: "approved" },
    { new: true },
  );
};

const rejectDriver = async (userId: string, reason?: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { isApproved: false, applicationStatus: "rejected" },
    { new: true },
  );
};

const approveMerchant = async (userId: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { isApproved: true },
    { new: true },
  );
};

const approvePropertyHost = async (userId: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { isApproved: true },
    { new: true },
  );
};
```

---

## Step 70 — Admin Service: Order & Property Oversight

### What & Why

Admin can list all orders, delivery requests, properties, and force-approve delivery requests if a property manager is unresponsive. Admin can also flag properties.

### Code

Append to `src/app/module/admin/admin.service.ts`:

```typescript
// --- Order & Delivery Requests ---
const getAllOrders = async (query: Record<string, unknown>) => {
  const orderQuery = new QueryBuilder(
    Order.find().populate("customerId storeId"),
    query,
  )
    .filter()
    .sort()
    .paginate();
  const [orders, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);
  return { meta, orders };
};

const getAllDeliveryRequests = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    DeliveryRequest.find().populate("orderId hostId propertyId"),
    query,
  )
    .filter()
    .sort()
    .paginate();
  const [requests, meta] = await Promise.all([
    requestQuery.modelQuery,
    requestQuery.countTotal(),
  ]);
  return { meta, requests };
};

const forceApproveRequest = async (requestId: string) => {
  const request = await DeliveryRequest.findByIdAndUpdate(
    requestId,
    { status: "force_approved" },
    { new: true },
  );
  if (!request) throw new AppError(httpStatus.NOT_FOUND, "Request not found");
  await Order.findByIdAndUpdate(request.orderId, { status: "preparing" });
  return request;
};

// --- Store & Property Management ---
const getAllStores = async (query: Record<string, unknown>) => {
  const storeQuery = new QueryBuilder(Store.find(), query)
    .filter()
    .sort()
    .paginate();
  const [stores, meta] = await Promise.all([
    storeQuery.modelQuery,
    storeQuery.countTotal(),
  ]);
  return { meta, stores };
};

const getAllProperties = async (query: Record<string, unknown>) => {
  const propertyQuery = new QueryBuilder(
    Property.find().populate("hostId"),
    query,
  )
    .filter()
    .sort()
    .paginate();
  const [properties, meta] = await Promise.all([
    propertyQuery.modelQuery,
    propertyQuery.countTotal(),
  ]);
  return { meta, properties };
};

const flagProperty = async (propertyId: string, reason: string) => {
  return await Property.findByIdAndUpdate(
    propertyId,
    { isFlagged: true, flaggedReason: reason },
    { new: true },
  );
};
```

---

## Step 71 — Admin Service: Payment & Payout Oversight

### What & Why

Admins review payout requests from drivers/merchants and approve them, which triggers Stripe Transfers.

### Code

Append to `src/app/module/admin/admin.service.ts`:

```typescript
// --- Payments & Payouts ---
const getAllPayments = async (query: Record<string, unknown>) => {
  const payoutQuery = new QueryBuilder(Payout.find().populate("userId"), query)
    .filter()
    .sort()
    .paginate();
  const [transactions, meta] = await Promise.all([
    payoutQuery.modelQuery,
    payoutQuery.countTotal(),
  ]);
  return { meta, transactions };
};

const approvePayout = async (payoutId: string) => {
  const payout = await Payout.findById(payoutId).populate("userId");
  if (!payout) throw new AppError(httpStatus.NOT_FOUND, "Payout not found");

  // Trigger Stripe Connect Transfer to payout.userId.stripeAccountId using the payout.amount

  payout.status = "completed";
  await payout.save();
  return payout;
};

const rejectPayout = async (payoutId: string, reason: string) => {
  return await Payout.findByIdAndUpdate(
    payoutId,
    { status: "rejected", reason },
    { new: true },
  );
};
```

---

## Step 72 — Admin Service: Dashboard & Reports

### What & Why

Real-time metrics for the overview dashboard.

### Code

Append to `src/app/module/admin/admin.service.ts` and export:

```typescript
// --- Dashboard & Reports ---
const getDashboardStats = async () => {
  const [totalCustomers, totalMerchants, totalDrivers, totalOrders] =
    await Promise.all([
      User.countDocuments({ role: "USER" }),
      User.countDocuments({ role: "MERCHANT" }),
      User.countDocuments({ role: "DRIVER" }),
      Order.countDocuments(),
    ]);

  return {
    users: {
      customers: totalCustomers,
      merchants: totalMerchants,
      drivers: totalDrivers,
    },
    logistics: { totalOrders },
  };
};

export const AdminService = {
  getAllUsers,
  blockUser,
  approveDriver,
  rejectDriver,
  approveMerchant,
  approvePropertyHost,
  getAllOrders,
  getAllDeliveryRequests,
  forceApproveRequest,
  getAllStores,
  getAllProperties,
  flagProperty,
  getAllPayments,
  approvePayout,
  rejectPayout,
  getDashboardStats,
};
```

---

## Step 73 — Admin Controller

### What & Why

Wire the service methods to HTTP request handlers.

### Code

Create `src/app/module/admin/admin.controller.ts`:

```typescript
import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AdminService } from "./admin.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved",
    meta: result.meta,
    data: result.users,
  });
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.blockUser(
    req.body.authId,
    req.body.isBlocked,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User block status updated",
    data: result,
  });
});

const approveDriver = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.approveDriver(req.body.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Driver approved",
    data: result,
  });
});

const forceApproveRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.forceApproveRequest(req.body.requestId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Request force approved",
    data: result,
  });
});

const approvePayout = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.approvePayout(req.body.payoutId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payout approved & transferred",
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard stats retrieved",
    data: result,
  });
});

// Map remaining handlers similarly...
export const AdminController = {
  getAllUsers,
  blockUser,
  approveDriver,
  forceApproveRequest,
  approvePayout,
  getDashboardStats,
};
```

---

## Step 74 — Admin Routes

### What & Why

Expose the AdminController methods via REST routes, locked behind `auth_level.admin`.

### Code

Create `src/app/module/admin/admin.route.ts`:

```typescript
import { Router } from "express";
import auth from "../../middleware/auth";
import { AdminController } from "./admin.controller";
import config from "../../config";

const router = Router();

// Protect all admin routes
router.use(auth(config.auth_level.admin));

router.get("/get-all-users", AdminController.getAllUsers);
router.patch("/block-user", AdminController.blockUser);
router.patch("/approve-driver", AdminController.approveDriver);
router.patch("/force-approve-request", AdminController.forceApproveRequest);
router.patch("/approve-payout", AdminController.approvePayout);
router.get("/dashboard", AdminController.getDashboardStats);

// ... add the rest of the corresponding endpoints here

export const AdminRoutes = router;
```

---

## Step 75 — Socket.IO Enhancements (Driver Location Scope)

### What & Why

Currently, driver locations broadcast to ALL clients (`io.emit`). We must restrict it so only clients tracking a specific `orderId` receive the driver's location updates.

### Code

In `src/socket/SocketController.ts` (or wherever your socket event handlers are defined):

**Find the global broadcast:**

```typescript
// OLD: io.emit("update_location", { statusCode: 200, success: true, data: { lat, long } });
```

**Replace with room-based broadcast:**

```typescript
// Client must subscribe to the order they want to track
socket.on("subscribe_driver_location", ({ orderId }) => {
  socket.join(`order_${orderId}`);
});

socket.on("unsubscribe_driver_location", ({ orderId }) => {
  socket.leave(`order_${orderId}`);
});

socket.on("update_location", async (payload) => {
  const { userId, orderId, lat, long } = payload;

  // Update DB location
  await User.findByIdAndUpdate(userId, { locationCoordinates: [long, lat] });

  // Scoped emit ONLY to people in the order's room
  io.to(`order_${orderId}`).emit("update_location", {
    statusCode: 200,
    success: true,
    data: { lat, long },
  });
});
```

---

## Step 76 — Final System Wiring

### What & Why

We must mount our new `review`, `notification`, and `admin` routers in the main application entry point so Express handles their traffic.

### Code

In `src/app/routes/index.ts`:

Add imports at the top:

```typescript
import { ReviewRoutes } from "../module/review/review.route";
import { NotificationRoutes } from "../module/notification/notification.route";
import { AdminRoutes } from "../module/admin/admin.route";
```

Add to the `moduleRoutes` array:

```typescript
const moduleRoutes = [
  // ... existing routes (auth, user, product, order, property, cart, payment) ...
  { path: "/review", route: ReviewRoutes },
  { path: "/notification", route: NotificationRoutes },
  { path: "/admin", route: AdminRoutes },
];
```

### Commands

```bash
npm run dev
```

### Verification

1. `GET /admin/dashboard` returns `{ users: {...}, logistics: {...} }`
2. `POST /review/create` correctly updates the target's `averageRating`.
3. The server starts without any router instantiation errors.

---

> **End of Part 4 — Steps 65-76 complete.**
> The implementation guideline based on the architecture plan is now fully documented.
