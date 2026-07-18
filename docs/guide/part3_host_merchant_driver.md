# Fridge Fillers — Implementation Guideline Part 3

> **Steps 46–64** | Domains: Property Host Approval · Merchant Order Management · Driver Application & Delivery

---

## Step 46 — Add DeliveryRequest Query Methods to Property Service

### What & Why

Property hosts need to see their pending, scheduled (approved), and delivered requests. These paginated queries power the PM Dashboard screens. Comes here because it depends on the DeliveryRequest and Order models from Part 2.

### Code

Add to `src/app/module/property/property.service.ts`:

Add these imports at the top (after existing imports):

```typescript
import DeliveryRequest from "../order/DeliveryRequest";
import Order from "../order/Order";
```

Add these methods before the `PropertyService` export:

```typescript
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

const getDeliveredRequests = async (userData: any, query: QueryParams) => {
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
```

Also update `getDashboardStats` to use real counts:

```typescript
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
```

Update the `PropertyService` export:

```typescript
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
};
```

### Commands

None required.

### Verification

`GET /property/pending-requests` as PROPERTY_HOST returns paginated list of pending delivery requests.

### Common Mistakes

- Not handling the `populate` match returning `null` — when using `match` in populate, non-matching documents return `null` for the populated field. Must filter after.

---

## Step 47 — Create PM Approval Service

### What & Why

The property host approves a delivery request by setting the delivery window and guest stay dates. This triggers payment capture (for held PaymentIntents) and reveals the physical address to the order.

### Code

Add to `src/app/module/property/property.service.ts`:

Add this import at the top:

```typescript
import { StripeService } from "../payment/stripe.service";
import Payment from "../payment/Payment";
```

Add this method before the `PropertyService` export:

```typescript
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
```

Add `approveRequest` to the `PropertyService` export.

Also add `postNotification` import at the top:

```typescript
import postNotification from "../../../util/postNotification";
```

### Commands

None required.

### Verification

1. Place order with property code → status becomes `pending_host_approval`
2. PM calls `PATCH /property/approve-request` with delivery window + guest stay dates
3. Order transitions to `approved`, deliveryAddress now populated, payment captured

### Common Mistakes

- Not capturing the payment — property-code orders use `manual` capture. If you forget to call `capturePaymentIntent`, the charge will auto-cancel after 7 days.
- Revealing address too early — the physical address should ONLY be set on the Order after PM approval.

---

## Step 48 — Create PM Rejection Service

### What & Why

Property host rejects a delivery request, cancelling the order and voiding the held payment.

### Code

Add to `src/app/module/property/property.service.ts`:

```typescript
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
```

Add `rejectRequest` to the `PropertyService` export.

### Commands

None required.

### Verification

PM calls `PATCH /property/reject-request` → order cancelled, payment voided, customer notified.

### Common Mistakes

- Not cancelling the PaymentIntent — the held funds must be released back to the customer.

---

## Step 49 — Guest Stay Auto-Block Validation

### What & Why

Already integrated in Step 29's `placeOrder` method. When a property has `guestStayDates` set, orders are rejected if the current date falls outside the `checkIn`–`checkOut` range. Step 47's `approveRequest` also validates that the delivery window falls within guest stay dates.

No additional code needed — this is already covered.

### Code

No new code.

### Commands

None required.

### Verification

Set `guestStayDates` on a property (via delivery rules), then try placing an order outside the stay period → should get `400 "Orders cannot be placed outside the guest stay period"`.

---

## Step 50 — Add PM Controller Methods

### What & Why

Connects the approval/rejection endpoints to the property controller.

### Code

Add to `src/app/module/property/property.controller.ts`:

```typescript
const approveRequest = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.approveRequest(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request approved",
    data: result,
  });
});

const rejectRequest = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.rejectRequest(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request rejected",
    data: result,
  });
});

const getPendingRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getPendingRequests(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending requests retrieved",
    data: result.requests,
    meta: result.meta,
  });
});

const getScheduledRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getScheduledRequests(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scheduled requests retrieved",
    data: result.requests,
    meta: result.meta,
  });
});

const getDeliveredRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getDeliveredRequests(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivered requests retrieved",
    data: result.requests,
  });
});
```

Update the `PropertyController` export:

```typescript
const PropertyController = {
  addProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  resolveCode,
  updateDeliveryRules,
  getDashboardStats,
  approveRequest,
  rejectRequest,
  getPendingRequests,
  getScheduledRequests,
  getDeliveredRequests,
};
```

### Commands

None required.

### Verification

No TypeScript errors.

---

## Step 51 — Add PM Routes

### What & Why

Maps HTTP endpoints to the PM approval/rejection methods.

### Code

Add to `src/app/module/property/property.routes.ts` (before the `export`):

```typescript
  .patch(
    "/approve-request",
    auth(config.auth_level.property_host),
    PropertyController.approveRequest,
  )
  .patch(
    "/reject-request",
    auth(config.auth_level.property_host),
    PropertyController.rejectRequest,
  )
  .get(
    "/pending-requests",
    auth(config.auth_level.property_host),
    PropertyController.getPendingRequests,
  )
  .get(
    "/scheduled-requests",
    auth(config.auth_level.property_host),
    PropertyController.getScheduledRequests,
  )
  .get(
    "/delivered-requests",
    auth(config.auth_level.property_host),
    PropertyController.getDeliveredRequests,
  );
```

### Commands

```bash
npm run dev
```

### Verification

**Full PM Flow Test:**

1. USER places order with `propertyCode` → order status: `pending_host_approval`
2. PM calls `GET /property/pending-requests` → sees the request
3. PM calls `PATCH /property/approve-request` with `{ requestId, deliveryWindowStart, deliveryWindowEnd, guestStayCheckIn, guestStayCheckOut }`
4. Order transitions to `approved`, `deliveryAddress` is now populated
5. Payment is captured (check Stripe Dashboard)

### Common Mistakes

- Using wrong auth level — ALL PM routes must use `property_host`.

---

## Step 52 — Create Merchant Order Methods

### What & Why

Merchant-facing order operations: accept an incoming order and transition through preparation states.

### Code

Add to `src/app/module/order/order.service.ts`:

```typescript
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
```

Update the `OrderService` export to include `acceptOrder` and `updateOrderStatus`.

### Commands

None required.

### Verification

Merchant accepts order → status changes to `accepted_by_merchant`. Then transitions through `preparing` → `ready_for_pickup`.

### Common Mistakes

- Allowing merchant to accept orders in `pending_host_approval` status — the PM must approve first. Only `pending` and `approved` are valid starting states for merchant acceptance.

---

## Step 53 — Create Merchant Store Settings Service

### What & Why

Merchants need to update their store settings (business hours, delivery radius, minimum order, phone, email, open/closed toggle).

### Code

Add to `src/app/module/user/user.service.ts`:

```typescript
const updateStoreSettings = async (
  userData: any,
  payload: Record<string, any>,
) => {
  if (userData.role !== "MERCHANT") {
    throw new ApiError(
      status.FORBIDDEN,
      "Only merchants can update store settings",
    );
  }

  const updateData: Record<string, any> = {};

  if (payload.businessHours !== undefined)
    updateData.businessHours = payload.businessHours;
  if (payload.storeDeliveryRadius !== undefined)
    updateData.storeDeliveryRadius = Number(payload.storeDeliveryRadius);
  if (payload.storeMinimumOrder !== undefined)
    updateData.storeMinimumOrder = Number(payload.storeMinimumOrder);
  if (payload.storePhoneNumber !== undefined)
    updateData.storePhoneNumber = payload.storePhoneNumber;
  if (payload.storeSupportEmail !== undefined)
    updateData.storeSupportEmail = payload.storeSupportEmail;
  if (typeof payload.storeIsOpen === "boolean")
    updateData.storeIsOpen = payload.storeIsOpen;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(status.BAD_REQUEST, "No valid fields to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userData.userId,
    updateData,
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  return updatedUser;
};
```

Add `updateStoreSettings` to the `UserService` export.

### Commands

None required.

### Verification

`PATCH /user/update-store-settings` with `{ storeIsOpen: false }` → merchant's `storeIsOpen` field updates.

---

## Step 54 — Add Merchant Controller Methods

### What & Why

Controller methods for merchant order management.

### Code

These will be part of the Order controller (Step 55).

---

## Step 55 — Create Complete Order Controller, Routes, and Register

### What & Why

The full Order module with controller and routes covering all order operations: place, query, merchant actions, and (stubs for) driver actions and cancellation (completed in later steps).

### Code

Create file: `src/app/module/order/order.controller.ts`

```typescript
const { default: status } = require("http-status");
import { OrderService } from "./order.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";

const placeOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.placeOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const getOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getOrder(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order retrieved",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getMyOrders(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved",
    data: result.orders,
    meta: result.meta,
  });
});

const acceptOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.acceptOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order accepted",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.updateOrderStatus(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated",
    data: result,
  });
});

const getActiveOrders = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getActiveOrders(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active orders retrieved",
    data: result.orders,
    meta: result.meta,
  });
});

const getPendingDeliveryRequests = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
    const result = await OrderService.getPendingDeliveryRequests(
      req.user,
      req.query as QueryParams,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Pending delivery requests retrieved",
      data: result.orders,
      meta: result.meta,
    });
  },
);

const trackOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.trackOrder(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order tracking data retrieved",
    data: result,
  });
});

const assignDriver = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.assignDriver(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver assigned",
    data: result,
  });
});

const acceptDelivery = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.acceptDelivery(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery accepted",
    data: result,
  });
});

const declineDelivery = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery declined — you may accept another",
  });
});

const pickedUp = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.pickedUp(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order picked up",
    data: result,
  });
});

const outForDelivery = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.outForDelivery(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order is out for delivery",
    data: result,
  });
});

const deliver = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.deliver(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order delivered successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.cancelOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled",
    data: result,
  });
});

const OrderController = {
  placeOrder,
  getOrder,
  getMyOrders,
  acceptOrder,
  updateOrderStatus,
  getActiveOrders,
  getPendingDeliveryRequests,
  trackOrder,
  assignDriver,
  acceptDelivery,
  declineDelivery,
  pickedUp,
  outForDelivery,
  deliver,
  cancelOrder,
};

export { OrderController };
```

Create file: `src/app/module/order/order.routes.ts`

```typescript
import express from "express";
import auth from "../../middleware/auth";
import { OrderController } from "./order.controller";
import { uploadFile } from "../../middleware/fileUploader";
import config from "../../../config";

const router = express.Router();

router
  // Customer
  .post(
    "/place-order",
    auth(config.auth_level.user),
    OrderController.placeOrder,
  )
  .get("/get-order", auth(config.auth_level.all), OrderController.getOrder)
  .get(
    "/get-my-orders",
    auth(config.auth_level.all),
    OrderController.getMyOrders,
  )
  .get("/track", auth(config.auth_level.user), OrderController.trackOrder)
  // Merchant
  .patch(
    "/accept-order",
    auth(config.auth_level.merchant),
    OrderController.acceptOrder,
  )
  .patch(
    "/update-status",
    auth(config.auth_level.merchant),
    OrderController.updateOrderStatus,
  )
  // Driver
  .get(
    "/active-orders",
    auth(config.auth_level.driver),
    OrderController.getActiveOrders,
  )
  .get(
    "/pending-requests",
    auth(config.auth_level.driver),
    OrderController.getPendingDeliveryRequests,
  )
  .patch(
    "/assign-driver",
    auth(config.auth_level.admin),
    OrderController.assignDriver,
  )
  .patch(
    "/accept-delivery",
    auth(config.auth_level.driver),
    OrderController.acceptDelivery,
  )
  .patch(
    "/decline-delivery",
    auth(config.auth_level.driver),
    OrderController.declineDelivery,
  )
  .patch("/picked-up", auth(config.auth_level.driver), OrderController.pickedUp)
  .patch(
    "/out-for-delivery",
    auth(config.auth_level.driver),
    OrderController.outForDelivery,
  )
  .patch(
    "/deliver",
    auth(config.auth_level.driver),
    uploadFile(),
    OrderController.deliver,
  )
  // Cancel (all roles)
  .patch(
    "/cancel-order",
    auth(config.auth_level.all),
    OrderController.cancelOrder,
  );

export = router;
```

Register in `src/app/routes/index.ts`:

```typescript
// Add import:
import OrderRoutes from "../module/order/order.routes";

// Add to moduleRoutes:
{
  path: "/order",
  route: OrderRoutes,
},
```

Also add the store settings route to `src/app/module/user/user.routes.ts`:

```typescript
.patch(
  "/update-store-settings",
  auth(config.auth_level.merchant),
  UserController.updateStoreSettings,
)
```

And the corresponding controller method in `user.controller.ts`:

```typescript
const updateStoreSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateStoreSettings(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Store settings updated",
    data: result,
  });
});
```

Add to `UserController` export.

### Commands

```bash
npm run dev
```

### Verification

1. `POST /order/place-order` with `{ deliveryAddress: "456 Oak Ave" }` → order created
2. `PATCH /order/accept-order` as MERCHANT → status: `accepted_by_merchant`
3. `PATCH /order/update-status` with `{ orderId, status: "preparing" }` → OK
4. `PATCH /order/update-status` with `{ orderId, status: "ready_for_pickup" }` → OK

---

## Step 56 — Driver Application Service

### What & Why

Adds `submitDriverApplication` method to the user service. This validates that the driver has uploaded required documents and sets their application status to `pending`.

### Code

Add to `src/app/module/user/user.service.ts`:

```typescript
const submitDriverApplication = async (
  userData: any,
  payload: Record<string, any>,
) => {
  if (userData.role !== "DRIVER") {
    throw new ApiError(
      status.FORBIDDEN,
      "Only drivers can submit applications",
    );
  }

  const user = await User.findById(userData.userId);
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  // Validate required fields
  if (!payload.vehicleType) {
    throw new ApiError(status.BAD_REQUEST, "Vehicle type is required");
  }

  // Check required documents are uploaded
  if (!user.drivingLicense_image) {
    throw new ApiError(status.BAD_REQUEST, "Driving license image is required");
  }
  if (!user.idCard_image) {
    throw new ApiError(status.BAD_REQUEST, "ID card image is required");
  }
  if (!user.vehicleRegistration_image) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Vehicle registration image is required",
    );
  }

  user.vehicleType = payload.vehicleType;
  if (payload.licenseNumber) user.licenseNumber = payload.licenseNumber;
  if (payload.plateNumber) user.plateNumber = payload.plateNumber;
  user.applicationStatus = "pending";
  await user.save();

  // Notify admin
  await postNotification(
    "New Driver Application",
    `Driver ${user.name} has submitted an application for review`,
    // This would ideally go to admin, but we'll use a generic admin notification
    "admin",
  );

  return {
    message: "Application submitted successfully. Pending admin review.",
  };
};
```

Add `submitDriverApplication` to the `UserService` export.

### Commands

None required.

### Verification

Driver calls `PATCH /user/submit-driver-application` with `{ vehicleType: "car" }` → application status set to `pending`.

---

## Step 57 — Create Driver Assignment Service

### What & Why

Two flows: admin can manually assign a driver, or drivers can self-accept from the available pool.

### Code

Add to `src/app/module/order/order.service.ts`:

```typescript
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
```

Add `assignDriver` and `acceptDelivery` to `OrderService` export.

### Commands

None required.

### Verification

Driver calls `PATCH /order/accept-delivery` with `{ orderId }` → order gets driver assigned.

---

## Step 58 — Create Driver Delivery Flow

### What & Why

The driver progresses through: picked_up → out_for_delivery → delivered. The final `deliver` step handles proof-of-delivery upload and triggers payout transfers.

### Code

Add to `src/app/module/order/order.service.ts`:

```typescript
import { PaymentService } from "../payment/payment.service";

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
  const { user: userData, body: payload } = req;

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
```

Add `pickedUp`, `outForDelivery`, and `deliver` to `OrderService` export.

### Commands

None required.

### Verification

Full flow: `picked-up` → `out-for-delivery` → `deliver` (with proof image) → order status becomes `delivered` → payouts processed.

### Common Mistakes

- Not importing `PaymentService` — needed for `processOrderPayouts`.
- Forgetting `uploadFile()` middleware on the `/deliver` route (already set in Step 55) — without it, `req.files` is undefined.

---

## Step 59 — Driver Query Methods

### What & Why

Already created in Step 30 (`getActiveOrders` and `getPendingDeliveryRequests`). No additional code needed.

---

## Step 60–61 — Driver Controller and Routes

### What & Why

Already covered in Step 55. The `order.controller.ts` includes all driver methods, and `order.routes.ts` includes all driver routes.

---

## Step 62 — Create Order Cancellation

### What & Why

Role-based cancellation with refund/payment-void logic.

### Code

Add to `src/app/module/order/order.service.ts`:

```typescript
import Payment from "../payment/Payment";
import { StripeService } from "../payment/stripe.service";

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
          payment.stripePaymentIntentId,
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
        await StripeService.cancelPaymentIntent(payment.stripePaymentIntentId);
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
    await Product.findByIdAndUpdate(item.productId, {
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
```

Add `cancelOrder` to `OrderService` export.

### Commands

None required.

### Verification

USER cancels a pending order → payment refunded/voided, stock restored, all parties notified.

### Common Mistakes

- Not restoring product stock on cancellation — items that were decremented during `placeOrder` must be restored.
- Not updating DeliveryRequest status when cancelling property-code orders.

---

## Step 63 — Cancel Order Route

### What & Why

Already included in Step 55's `order.routes.ts`:

```typescript
.patch("/cancel-order", auth(config.auth_level.all), OrderController.cancelOrder)
```

---

## Step 64 — Verification: Full Driver Flow

### What & Why

End-to-end test of the driver delivery flow.

### Code

No new code.

### Commands

```bash
npm run dev
```

### Verification

**Prerequisites:**

- Registered and activated: USER, MERCHANT, DRIVER, ADMIN accounts
- ADMIN approved the driver (`isApproved: true`)
- MERCHANT has products created
- USER has items in cart

**Test Sequence:**

1. **USER places order:**

```
POST /order/place-order
Authorization: Bearer <user_token>
Body: { "deliveryAddress": "456 Oak Ave, Phoenix" }
```

→ Order created with status `pending`

2. **MERCHANT accepts:**

```
PATCH /order/accept-order
Authorization: Bearer <merchant_token>
Body: { "orderId": "<order_id>" }
```

→ Status: `accepted_by_merchant`

3. **MERCHANT prepares:**

```
PATCH /order/update-status
Body: { "orderId": "<order_id>", "status": "preparing" }
```

→ Status: `preparing`

4. **MERCHANT marks ready:**

```
PATCH /order/update-status
Body: { "orderId": "<order_id>", "status": "ready_for_pickup" }
```

→ Status: `ready_for_pickup`

5. **DRIVER sees pending requests:**

```
GET /order/pending-requests
Authorization: Bearer <driver_token>
```

→ Returns the order with driverPayout amount

6. **DRIVER accepts delivery:**

```
PATCH /order/accept-delivery
Body: { "orderId": "<order_id>" }
```

→ Status: `driver_assigned`

7. **DRIVER picks up:**

```
PATCH /order/picked-up
Body: { "orderId": "<order_id>" }
```

→ Status: `picked_up`

8. **DRIVER out for delivery:**

```
PATCH /order/out-for-delivery
Body: { "orderId": "<order_id>" }
```

→ Status: `out_for_delivery`

9. **DRIVER delivers with proof:**

```
PATCH /order/deliver
Content-Type: multipart/form-data
Body: orderId=<order_id>, proof_of_delivery=<image_file>
```

→ Status: `delivered`, `proofOfDelivery` path set, payout transfers created

10. **Check results:**

- Order status = `delivered`
- `actualDeliveryTime` is set
- Driver's `totalDeliveries` incremented
- Stripe Dashboard shows transfers to merchant and driver Connect accounts (if onboarded)

### Common Mistakes

- Driver must be approved and online to accept deliveries.
- The `deliver` endpoint requires `uploadFile()` middleware — use multipart form-data, not JSON.

---

> **End of Part 3 — Steps 46-64 complete.**
> Continue with Part 4 for Notifications, Socket.IO, Admin, Reviews, Analytics, and Final Wiring (Steps 65-92).
