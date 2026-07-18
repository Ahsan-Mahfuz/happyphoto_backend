# Fridge Fillers — Implementation Guideline Part 2

> **Steps 24–45** | Domains: Order & DeliveryRequest · Payment (Stripe Card) · Stripe Connect & Payouts

---

## Step 24 — Create Order Interface

### What & Why

Defines TypeScript types for the Order model and its OrderItem subdocument. This comes first in Domain 4 because both the Order model and all order-related services depend on these types. The interface captures every field from plan section 3.2.2.

### Code

Create file: `src/app/module/order/order.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  product_image?: string;
}

export interface IDeliveryWindow {
  start: Date;
  end: Date;
}

export interface IStayDates {
  checkIn: Date;
  checkOut: Date;
}

export interface IOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  driverId?: Types.ObjectId;
  propertyId?: Types.ObjectId;
  propertyHostId?: Types.ObjectId;
  items: IOrderItem[];
  status: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  platformCommission?: number;
  driverPayout?: number;
  merchantNetEarnings?: number;
  deliveryAddress?: string;
  deliveryCoordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  deliveryWindow?: IDeliveryWindow;
  stayDates?: IStayDates;
  specialInstructions?: string;
  promoCode?: string;
  proofOfDelivery?: string;
  cancelReason?: string;
  cancelledBy?: string;
  paymentId?: Types.ObjectId;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  pickedUpAt?: Date;
  approvedAt?: Date;
  acceptedByMerchantAt?: Date;
  acceptedByDriverAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- Making `driverId`, `propertyId`, `propertyHostId` required — these are optional. `driverId` is set during driver assignment; `propertyId`/`propertyHostId` only exist for property-code orders.

---

## Step 25 — Create Order Model

### What & Why

The Mongoose schema for orders. Uses a `Counter` collection pattern for auto-incrementing the human-readable `orderId` (e.g., `ORD-1001`). Includes all necessary indexes for efficient queries by user, merchant, driver, host, and status.

### Code

Create file: `src/app/module/order/Counter.ts`

```typescript
import { Schema, model } from "mongoose";

interface ICounter {
  name: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1000 },
});

const Counter = model<ICounter>("Counter", CounterSchema);

export = Counter;
```

Create file: `src/app/module/order/Order.ts`

```typescript
import { Schema, model } from "mongoose";
import type { IOrder } from "./order.interface";
import { EnumOrderStatus, EnumUserRole } from "../../../util/enum";
import Counter from "./Counter";

const OrderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    product_image: {
      type: String,
    },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
    },
    propertyHostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    items: {
      type: [OrderItemSchema],
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumOrderStatus),
      required: true,
      default: "pending",
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
    },
    serviceFee: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    platformCommission: {
      type: Number,
    },
    driverPayout: {
      type: Number,
    },
    merchantNetEarnings: {
      type: Number,
    },
    deliveryAddress: {
      type: String,
    },
    deliveryCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    deliveryWindow: {
      type: {
        start: Date,
        end: Date,
      },
    },
    stayDates: {
      type: {
        checkIn: Date,
        checkOut: Date,
      },
    },
    specialInstructions: {
      type: String,
    },
    promoCode: {
      type: String,
    },
    proofOfDelivery: {
      type: String,
    },
    cancelReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: [...Object.values(EnumUserRole), null],
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    acceptedByMerchantAt: {
      type: Date,
    },
    acceptedByDriverAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ merchantId: 1 });
OrderSchema.index({ driverId: 1 });
OrderSchema.index({ propertyHostId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderId: 1 }, { unique: true });

// Pre-save hook to auto-generate orderId
OrderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "orderId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.orderId = `ORD-${counter.seq}`;
  }
  next();
});

const Order = model<IOrder>("Order", OrderSchema);

export = Order;
```

### Commands

None required.

### Verification

Start server — `orders` and `counters` collections appear in MongoDB.

### Common Mistakes

- Using `pre('validate')` instead of `pre('save')` for orderId generation — `pre('save')` is correct here because we need the counter before the document is saved.
- Forgetting `upsert: true` on the Counter query — the first order ever created needs to auto-create the counter document.
- The Counter starts at `1000` so the first order is `ORD-1001`.

---

## Step 26 — Create DeliveryRequest Interface

### What & Why

Types for the DeliveryRequest model that tracks property-host approval workflow.

### Code

Create file: `src/app/module/order/deliveryRequest.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface IDeliveryRequest extends Document {
  requestId: string;
  orderId: Types.ObjectId;
  propertyId: Types.ObjectId;
  hostId: Types.ObjectId;
  customerId: Types.ObjectId;
  status: string;
  deliveryWindow?: {
    start: Date;
    end: Date;
  };
  guestStayDates?: {
    checkIn: Date;
    checkOut: Date;
  };
  reviewedAt?: Date;
  forceApprovedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific.

---

## Step 27 — Create DeliveryRequest Model

### What & Why

Mongoose schema for delivery requests. Uses the same Counter pattern as Order for human-readable `requestId` (e.g., `REQ-2001`).

### Code

Create file: `src/app/module/order/DeliveryRequest.ts`

```typescript
import { Schema, model } from "mongoose";
import type { IDeliveryRequest } from "./deliveryRequest.interface";
import { EnumDeliveryRequestStatus } from "../../../util/enum";
import Counter from "./Counter";

const DeliveryRequestSchema = new Schema<IDeliveryRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumDeliveryRequestStatus),
      required: true,
      default: "pending",
    },
    deliveryWindow: {
      type: {
        start: Date,
        end: Date,
      },
    },
    guestStayDates: {
      type: {
        checkIn: Date,
        checkOut: Date,
      },
    },
    reviewedAt: {
      type: Date,
    },
    forceApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

DeliveryRequestSchema.index({ orderId: 1 });
DeliveryRequestSchema.index({ hostId: 1 });
DeliveryRequestSchema.index({ status: 1 });

DeliveryRequestSchema.pre("save", async function (next) {
  if (this.isNew && !this.requestId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "requestId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.requestId = `REQ-${counter.seq}`;
  }
  next();
});

const DeliveryRequest = model<IDeliveryRequest>(
  "DeliveryRequest",
  DeliveryRequestSchema,
);

export = DeliveryRequest;
```

### Commands

None required.

### Verification

Start server — `deliveryrequests` collection appears.

### Common Mistakes

- Using the same Counter `name` as orders — must use `"requestId"` not `"orderId"`. The Counter collection supports multiple named counters.

---

## Step 28 — Create Order Status Transition Validator

### What & Why

A state machine utility that validates legal order status transitions. Prevents invalid state changes (e.g., jumping from `pending` directly to `delivered`). Used by every endpoint that modifies order status.

### Code

Create file: `src/util/orderStateMachine.ts`

```typescript
import ApiError from "../error/ApiError";
const { status } = require("http-status");

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted_by_merchant", "cancelled"],
  pending_host_approval: ["approved", "cancelled"],
  approved: ["accepted_by_merchant", "cancelled"],
  accepted_by_merchant: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["driver_assigned", "cancelled"],
  driver_assigned: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

const validateTransition = (currentStatus: string, newStatus: string): void => {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Order with status "${currentStatus}" cannot be transitioned`,
    );
  }

  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Cannot transition order from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(", ")}`,
    );
  }
};

export { validateTransition, VALID_TRANSITIONS };
```

### Commands

None required.

### Verification

```typescript
// Quick test:
validateTransition("pending", "accepted_by_merchant"); // OK
validateTransition("pending", "delivered"); // Throws ApiError
```

### Common Mistakes

- Adding `cancelled` to `picked_up` and `out_for_delivery` transitions — per the plan, once picked up, only ADMIN can cancel (handled separately in the cancel logic, not via state machine).
- Forgetting `delivered` and `cancelled` are terminal states — no transitions OUT of them.

---

## Step 29 — Create Order Service — placeOrder

### What & Why

The most critical business logic: converts a cart into one or more orders (one per merchant). Handles both direct-address and property-code flows. For property-code orders, creates DeliveryRequests and puts the order in `pending_host_approval`.

### Code

Create file: `src/app/module/order/order.service.ts`

```typescript
const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Order from "./Order";
import DeliveryRequest from "./DeliveryRequest";
import Cart from "../cart/Cart";
import Property from "../property/Property";
import User from "../user/User";
import { Product } from "../product/Product";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import { validateTransition } from "../../../util/orderStateMachine";
import postNotification from "../../../util/postNotification";
import type { Request } from "express";

const DELIVERY_FEE = 5;
const SERVICE_FEE = 2;
const PLATFORM_COMMISSION_RATE = 0.15;
const DRIVER_PAYOUT_PER_ORDER = 3;

const placeOrder = async (userData: any, payload: Record<string, any>) => {
  const {
    propertyCode,
    deliveryAddress,
    deliveryLat,
    deliveryLong,
    specialInstructions,
  } = payload;

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
    const total = subtotal + DELIVERY_FEE + SERVICE_FEE;

    const orderData: Record<string, any> = {
      userId: userData.userId,
      merchantId,
      items: orderItems,
      subtotal,
      deliveryFee: DELIVERY_FEE,
      serviceFee: SERVICE_FEE,
      tax: 0,
      total,
      platformCommission,
      driverPayout: DRIVER_PAYOUT_PER_ORDER,
      merchantNetEarnings,
      specialInstructions,
    };

    if (isPropertyOrder) {
      orderData.status = "pending_host_approval";
      orderData.propertyId = property._id;
      orderData.propertyHostId = property.hostId;
      // Address NOT set yet — only revealed after PM approval
    } else {
      orderData.status = "pending";
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

    if (isPropertyOrder) {
      // Create DeliveryRequest for PM
      await DeliveryRequest.create({
        orderId: order._id,
        propertyId: property._id,
        hostId: property.hostId,
        customerId: userData.userId,
      });

      // Notify property host
      await postNotification(
        "New Delivery Request",
        `New delivery request for ${property.propertyName} (${order.orderId})`,
        property.hostId,
      );
    } else {
      // Notify merchant
      await postNotification(
        "New Order Received",
        `New order ${order.orderId} received`,
        merchantId,
      );
    }
  }

  // Clear cart
  cart.items = [];
  cart.propertyCode = undefined;
  await cart.save();

  return createdOrders;
};

// Continued in Step 30...
const OrderService = {
  placeOrder,
};

export { OrderService };
```

### Commands

None required.

### Verification

After routes are registered (Step 55), test with:

```
POST /order/place-order
Authorization: Bearer <user_token>
Content-Type: application/json

{ "deliveryAddress": "456 Oak Ave, Phoenix, AZ" }
```

Expected: Array of created orders (one per merchant in cart), cart cleared.

### Common Mistakes

- Forgetting to decrement product stock — if 2 users buy the last 3 items simultaneously, you get overselling. The `$inc: { quantity: -item.quantity }` handles this atomically.
- Not rounding financial calculations — floating point issues (e.g., `10.00 * 0.15 = 1.4999999`). Use `Math.round(x * 100) / 100`.
- Setting `deliveryAddress` on property-code orders — the address must NOT be set until PM approval. Only after approval does the property's `physicalAddress` get copied to the order.

---

## Step 30 — Create Order Service — Query Methods

### What & Why

Read methods for orders: get single order (with role-based field filtering), get my orders (role-aware), driver-specific queries, and order tracking.

### Code

Add to `src/app/module/order/order.service.ts` — insert these methods BEFORE the `OrderService` export object, and add them to the export:

```typescript
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
  let filter: Record<string, any> = {};

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
    filter.status = query.status;
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
```

Update the export object at the bottom of the file:

```typescript
const OrderService = {
  placeOrder,
  getOrder,
  getMyOrders,
  getActiveOrders,
  getPendingDeliveryRequests,
  trackOrder,
};

export { OrderService };
```

### Commands

None required.

### Verification

After routes registered, test `GET /order/get-my-orders` as each role and confirm role-appropriate filtering.

### Common Mistakes

- Not filtering `driverId: { $exists: false }` for pending delivery requests — this would show orders already assigned to other drivers.
- Leaking driver location on `trackOrder` to non-order-owners — the `userId` filter ensures only the customer who placed the order can track it.

---

## Step 31 — Create Payment Interface

### What & Why

TypeScript types for the Payment model that records Stripe payment intent details.

### Code

Create file: `src/app/module/payment/payment.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific.

---

## Step 32 — Create Payment Model

### What & Why

Mongoose schema for payment records. Indexes on `orderId`, `userId`, and `stripePaymentIntentId` for efficient lookups.

### Code

Create file: `src/app/module/payment/Payment.ts`

```typescript
import { Schema, model } from "mongoose";
import type { IPayment } from "./payment.interface";
import { EnumPaymentStatus } from "../../../util/enum";

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "usd",
    },
    status: {
      type: String,
      enum: Object.values(EnumPaymentStatus),
      required: true,
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
    },
    refundId: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    refundReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });

const Payment = model<IPayment>("Payment", PaymentSchema);

export = Payment;
```

### Commands

None required.

### Verification

`payments` collection created on server start.

### Common Mistakes

- None specific.

---

## Step 33 — Create Stripe Helper Service

### What & Why

Wraps the Stripe SDK with typed methods for PaymentIntent operations. All amounts are in **cents** (Stripe requirement). This is a low-level service — the Payment service (Step 34) uses it.

### Code

Create file: `src/app/module/payment/stripe.service.ts`

```typescript
import Stripe from "stripe";
import config from "../../../config";
import ApiError from "../../../error/ApiError";
const { status } = require("http-status");

const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// --- PaymentIntent Operations ---

const createPaymentIntent = async (
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  captureMethod: "automatic" | "manual" = "automatic",
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents
      currency,
      metadata,
      capture_method: captureMethod,
    });
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(status.BAD_REQUEST, `Stripe error: ${error.message}`);
  }
};

const capturePaymentIntent = async (
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe capture error: ${error.message}`,
    );
  }
};

const cancelPaymentIntent = async (
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe cancel error: ${error.message}`,
    );
  }
};

const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string,
): Promise<Stripe.Refund> => {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amount) refundData.amount = amount; // partial refund in cents
    if (reason) refundData.reason = reason as Stripe.RefundCreateParams.Reason;

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe refund error: ${error.message}`,
    );
  }
};

// --- Stripe Connect Operations ---

const createConnectAccount = async (
  email: string,
  country: string = "US",
): Promise<Stripe.Account> => {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe Connect error: ${error.message}`,
    );
  }
};

const createAccountLink = async (
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return accountLink;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe account link error: ${error.message}`,
    );
  }
};

const createTransfer = async (
  amount: number,
  destination: string,
  transferGroup: string,
  currency: string = "usd",
): Promise<Stripe.Transfer> => {
  try {
    const transfer = await stripe.transfers.create({
      amount, // in cents
      currency,
      destination,
      transfer_group: transferGroup,
    });
    return transfer;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe transfer error: ${error.message}`,
    );
  }
};

const createTransferReversal = async (
  transferId: string,
  amount?: number,
): Promise<Stripe.TransferReversal> => {
  try {
    const reversalData: Stripe.TransferReversalCreateParams = {};
    if (amount) reversalData.amount = amount;

    const reversal = await stripe.transfers.createReversal(
      transferId,
      reversalData,
    );
    return reversal;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe reversal error: ${error.message}`,
    );
  }
};

const getAccountStatus = async (
  accountId: string,
): Promise<{
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}> => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe account status error: ${error.message}`,
    );
  }
};

// Webhook signature verification
const constructWebhookEvent = (
  body: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event => {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
};

const StripeService = {
  createPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  createRefund,
  createConnectAccount,
  createAccountLink,
  createTransfer,
  createTransferReversal,
  getAccountStatus,
  constructWebhookEvent,
};

export { StripeService };
```

### Commands

None required. Stripe SDK is already installed (`stripe@20.4.1` in package.json).

### Verification

```typescript
// Quick test (temporarily in server.ts):
import { StripeService } from "./app/module/payment/stripe.service";
const pi = await StripeService.createPaymentIntent(1000, "usd", {
  test: "true",
});
console.log(pi.id); // pi_...
```

### Common Mistakes

- Passing dollar amounts instead of cents — `$10.00` must be `1000`.
- Not handling Stripe errors — every method wraps calls in try/catch to convert Stripe errors to `ApiError`.

---

## Step 34 — Create Payment Service

### What & Why

Business logic for creating payment intents, retrieving payments, and processing refunds. Determines capture method based on order type (manual for property-code orders, automatic for direct).

### Code

Create file: `src/app/module/payment/payment.service.ts`

```typescript
const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Payment from "./Payment";
import Order from "../order/Order";
import User from "../user/User";
import { StripeService } from "./stripe.service";
import { logger } from "../../../util/logger";

const createIntent = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  if (order.userId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You can only pay for your own orders",
    );
  }

  // Check not already paid
  const existingPayment = await Payment.findOne({
    orderId: order._id,
    status: "succeeded",
  });
  if (existingPayment) {
    throw new ApiError(status.BAD_REQUEST, "Order is already paid");
  }

  // Determine capture method
  const captureMethod = order.propertyId ? "manual" : "automatic";

  // Amount in cents
  const amountInCents = Math.round(order.total * 100);

  const paymentIntent = await StripeService.createPaymentIntent(
    amountInCents,
    payload.currency || "usd",
    {
      orderId: order._id.toString(),
      orderHumanId: order.orderId,
      userId: userData.userId,
    },
    captureMethod,
  );

  // Create payment record
  const payment = await Payment.create({
    orderId: order._id,
    userId: userData.userId,
    stripePaymentIntentId: paymentIntent.id,
    amount: amountInCents,
    currency: payload.currency || "usd",
    status: "unpaid",
  });

  // Link payment to order
  await Order.findByIdAndUpdate(order._id, { paymentId: payment._id });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentId: payment._id,
  };
};

const getPayment = async (userData: any, query: Record<string, any>) => {
  let payment;

  if (query.paymentId) {
    payment = await Payment.findById(query.paymentId)
      .populate({ path: "orderId", select: "orderId status total" })
      .lean();
  } else if (query.orderId) {
    payment = await Payment.findOne({ orderId: query.orderId })
      .populate({ path: "orderId", select: "orderId status total" })
      .lean();
  } else {
    throw new ApiError(status.BAD_REQUEST, "paymentId or orderId is required");
  }

  if (!payment) {
    throw new ApiError(status.NOT_FOUND, "Payment not found");
  }

  return payment;
};

const refund = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["paymentId"]);

  const payment = await Payment.findById(payload.paymentId);
  if (!payment) {
    throw new ApiError(status.NOT_FOUND, "Payment not found");
  }

  if (payment.status !== "succeeded") {
    throw new ApiError(
      status.BAD_REQUEST,
      "Can only refund succeeded payments",
    );
  }

  const refundAmountCents = payload.amount
    ? Math.round(payload.amount * 100)
    : undefined;

  const stripeRefund = await StripeService.createRefund(
    payment.stripePaymentIntentId,
    refundAmountCents,
    payload.reason,
  );

  payment.refundId = stripeRefund.id;
  payment.refundAmount = stripeRefund.amount / 100;
  payment.refundReason = payload.reason || "requested_by_admin";
  payment.status =
    refundAmountCents && refundAmountCents < payment.amount
      ? "partially_refunded"
      : "refunded";
  await payment.save();

  return payment;
};

// --- Stripe Connect Methods ---

const createConnectAccount = async (userData: any) => {
  const user = await User.findById(userData.userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (!["MERCHANT", "DRIVER"].includes(userData.role)) {
    throw new ApiError(
      status.FORBIDDEN,
      "Only merchants and drivers can create Connect accounts",
    );
  }

  if (user.stripeConnectAccountId) {
    // Already has account — just generate new link
    const accountLink = await StripeService.createAccountLink(
      user.stripeConnectAccountId,
      `${process.env.BASE_URL}/payment/connect-refresh`,
      `${process.env.BASE_URL}/payment/connect-return`,
    );
    return { accountLink: accountLink.url };
  }

  const account = await StripeService.createConnectAccount(user.email);

  user.stripeConnectAccountId = account.id;
  await user.save();

  const accountLink = await StripeService.createAccountLink(
    account.id,
    `${process.env.BASE_URL}/payment/connect-refresh`,
    `${process.env.BASE_URL}/payment/connect-return`,
  );

  return { accountLink: accountLink.url };
};

const getConnectStatus = async (userData: any) => {
  const user = await User.findById(userData.userId)
    .select("stripeConnectAccountId stripeConnectOnboarded")
    .lean();

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (!user.stripeConnectAccountId) {
    return { onboarded: false, accountId: null };
  }

  const stripeStatus = await StripeService.getAccountStatus(
    user.stripeConnectAccountId,
  );

  // Update onboarded status if charges are enabled
  if (stripeStatus.chargesEnabled && !user.stripeConnectOnboarded) {
    await User.findByIdAndUpdate(userData.userId, {
      stripeConnectOnboarded: true,
    });
  }

  return {
    onboarded: stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted,
    accountId: user.stripeConnectAccountId,
  };
};

// --- Payout Transfer Logic ---

const processOrderPayouts = async (orderId: string) => {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    logger.error(`processOrderPayouts: Order ${orderId} not found`);
    return;
  }

  const merchant = await User.findById(order.merchantId)
    .select("stripeConnectAccountId stripeConnectOnboarded")
    .lean();

  const driver = order.driverId
    ? await User.findById(order.driverId)
        .select("stripeConnectAccountId stripeConnectOnboarded")
        .lean()
    : null;

  const transferGroup = order.orderId;

  // Transfer to merchant
  if (merchant?.stripeConnectAccountId && merchant.stripeConnectOnboarded) {
    const merchantAmountCents = Math.round(
      (order.merchantNetEarnings || 0) * 100,
    );
    if (merchantAmountCents > 0) {
      try {
        await StripeService.createTransfer(
          merchantAmountCents,
          merchant.stripeConnectAccountId,
          transferGroup,
        );
      } catch (error: any) {
        logger.error(
          `Merchant transfer failed for order ${order.orderId}: ${error.message}`,
        );
      }
    }
  } else {
    logger.warn(
      `Merchant ${order.merchantId} has no onboarded Connect account. Skipping transfer.`,
    );
  }

  // Transfer to driver
  if (driver?.stripeConnectAccountId && driver.stripeConnectOnboarded) {
    const driverAmountCents = Math.round((order.driverPayout || 0) * 100);
    if (driverAmountCents > 0) {
      try {
        await StripeService.createTransfer(
          driverAmountCents,
          driver.stripeConnectAccountId,
          transferGroup,
        );
      } catch (error: any) {
        logger.error(
          `Driver transfer failed for order ${order.orderId}: ${error.message}`,
        );
      }
    }
  } else if (driver) {
    logger.warn(
      `Driver ${order.driverId} has no onboarded Connect account. Skipping transfer.`,
    );
  }
};

const PaymentService = {
  createIntent,
  getPayment,
  refund,
  createConnectAccount,
  getConnectStatus,
  processOrderPayouts,
};

export { PaymentService };
```

### Commands

None required.

### Verification

After routes registered, create a payment intent for an order and check you get a `clientSecret` back.

### Common Mistakes

- Not multiplying by 100 for Stripe amounts — `order.total` is in dollars, Stripe wants cents.
- Using `automatic` capture for property-code orders — these MUST use `manual` so the payment is only held (not charged) until PM approves.

---

## Step 35 — Create Stripe Webhook Handler

### What & Why

Handles Stripe webhook events to update Payment/Order records asynchronously. The webhook needs raw body parsing (not JSON) for signature verification.

### Code

Create file: `src/app/module/payment/payment.webhook.ts`

```typescript
import type { Request, Response } from "express";
import config from "../../../config";
import { StripeService } from "./stripe.service";
import Payment from "./Payment";
import { logger } from "../../../util/logger";

const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    event = StripeService.constructWebhookEvent(
      req.body, // raw body (Buffer)
      sig,
      config.stripe.stripe_webhook_secret as string,
    );
  } catch (error: any) {
    logger.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle events
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: "succeeded",
          paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
        },
      );
      logger.info(`Payment succeeded: ${paymentIntent.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as any;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: "failed" },
      );
      logger.warn(`Payment failed: ${paymentIntent.id}`);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as any;
      const paymentIntentId = charge.payment_intent;
      if (paymentIntentId) {
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          {
            status: "refunded",
            refundId: charge.refunds?.data?.[0]?.id,
            refundAmount: (charge.amount_refunded || 0) / 100,
          },
        );
      }
      logger.info(`Charge refunded: ${charge.id}`);
      break;
    }

    default:
      logger.info(`Unhandled webhook event: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

export { handleWebhook };
```

### Commands

None required.

### Verification

Set up a Stripe webhook in the Stripe Dashboard pointing to `https://yourdomain.com/payment/webhook` (or use `stripe listen --forward-to localhost:PORT/payment/webhook` for local testing). Confirm events are logged.

### Common Mistakes

- Using `express.json()` on the webhook route — the signature verification REQUIRES the raw body. The webhook route must use `express.raw()`.

---

## Step 36 — Create Payment Controller

### What & Why

Standard controller mapping for all Payment and Connect endpoints.

### Code

Create file: `src/app/module/payment/payment.controller.ts`

```typescript
const { default: status } = require("http-status");
import { PaymentService } from "./payment.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";

const createIntent = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.createIntent(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment intent created",
    data: result,
  });
});

const getPayment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.getPayment(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment retrieved",
    data: result,
  });
});

const refundPayment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.refund(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Refund processed",
    data: result,
  });
});

const createConnectAccount = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.createConnectAccount(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Connect account created",
    data: result,
  });
});

const getConnectStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.getConnectStatus(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Connect status retrieved",
    data: result,
  });
});

const PaymentController = {
  createIntent,
  getPayment,
  refundPayment,
  createConnectAccount,
  getConnectStatus,
};

export { PaymentController };
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific.

---

## Step 37 — Create Payment Routes and Register Webhook

### What & Why

Sets up payment routes. **Critical**: the webhook route needs raw body parsing, so it must be registered in `app.ts` BEFORE `express.json()`, or use a route-specific middleware.

### Code

Create file: `src/app/module/payment/payment.routes.ts`

```typescript
import express from "express";
import auth from "../../middleware/auth";
import { PaymentController } from "./payment.controller";
import config from "../../../config";

const router = express.Router();

router
  .post(
    "/create-intent",
    auth(config.auth_level.user),
    PaymentController.createIntent,
  )
  .get(
    "/get-payment",
    auth(config.auth_level.all),
    PaymentController.getPayment,
  )
  .post(
    "/refund",
    auth(config.auth_level.admin),
    PaymentController.refundPayment,
  )
  .post(
    "/create-connect-account",
    auth(config.auth_level.all),
    PaymentController.createConnectAccount,
  )
  .get(
    "/connect-status",
    auth(config.auth_level.all),
    PaymentController.getConnectStatus,
  );

export = router;
```

Now register the webhook route in `src/app.ts`. The webhook MUST come before `express.json()`:

Modify file: `src/app.ts`

Add the webhook import and route BEFORE the `express.json()` middleware:

```typescript
// Add at top of imports:
import { handleWebhook } from "./app/module/payment/payment.webhook";
import express from "express";

// Add BEFORE app.use(express.json()):
app.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);
```

Register payment routes in `src/app/routes/index.ts`:

```
// Add import:
import PaymentRoutes from "../module/payment/payment.routes";

// Add to moduleRoutes array:
{
  path: "/payment",
  route: PaymentRoutes,
},
```

### Commands

```bash
npm run dev
```

For local webhook testing:

```bash
stripe listen --forward-to localhost:5000/payment/webhook
```

### Verification

1. `POST /payment/create-intent` with a valid orderId returns `{ clientSecret, paymentIntentId }`
2. Stripe webhook events are logged in the terminal

### Common Mistakes

- Placing the webhook route AFTER `express.json()` — the JSON parser consumes the raw body, making signature verification fail. The raw route MUST come first.
- Forgetting `express.raw({ type: "application/json" })` — without this, `req.body` is undefined in the webhook handler.

---

## Step 38 — Create Payout Interface

### What & Why

Types for the Payout model that tracks merchant/driver withdrawal requests.

### Code

Create file: `src/app/module/payment/payout.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface IPayout extends Document {
  userId: Types.ObjectId;
  amount: number;
  status: string;
  type: string;
  stripeTransferId?: string;
  bankAccountLast4?: string;
  adminApprovedBy?: Types.ObjectId;
  adminApprovedAt?: Date;
  orderCount?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific.

---

## Step 39 — Create Payout Model

### What & Why

Mongoose schema for payout records.

### Code

Create file: `src/app/module/payment/Payout.ts`

```typescript
import { Schema, model } from "mongoose";
import type { IPayout } from "./payout.interface";
import { EnumPayoutStatus, EnumPayoutType } from "../../../util/enum";

const PayoutSchema = new Schema<IPayout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumPayoutStatus),
      required: true,
      default: "pending",
    },
    type: {
      type: String,
      enum: Object.values(EnumPayoutType),
      required: true,
    },
    stripeTransferId: {
      type: String,
    },
    bankAccountLast4: {
      type: String,
    },
    adminApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminApprovedAt: {
      type: Date,
    },
    orderCount: {
      type: Number,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

PayoutSchema.index({ userId: 1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ createdAt: -1 });

const Payout = model<IPayout>("Payout", PayoutSchema);

export = Payout;
```

### Commands

None required.

### Verification

`payouts` collection created on server start.

### Common Mistakes

- None specific.

---

## Steps 40-41 — Already Covered

Steps 40 (Connect helpers) and 41 (Connect service methods) are already included in Step 33 (`stripe.service.ts`) and Step 34 (`payment.service.ts`). The Connect account creation, account link generation, transfer, and reversal methods are all in `stripe.service.ts`. The `createConnectAccount` and `getConnectStatus` business logic is in `payment.service.ts`.

---

## Step 42 — Already Covered

The `processOrderPayouts` function is already included in Step 34 (`payment.service.ts`). It handles:

- Calculating merchant net earnings (subtotal - 15% commission)
- Transferring to merchant's Connect account
- Transferring driver payout to driver's Connect account
- Using orderId as transfer_group
- Graceful handling when Connect account is not onboarded

---

## Step 43 — Create Withdrawal and Earnings Services

### What & Why

Adds withdrawal request, payout history, and earnings aggregation methods to the Payment service.

### Code

Add to `src/app/module/payment/payment.service.ts` — insert before the `PaymentService` export object:

```typescript
import Payout from "./Payout";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";

const requestWithdrawal = async (
  userData: any,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["amount"]);

  const amount = Number(payload.amount);
  if (amount < 10) {
    throw new ApiError(status.BAD_REQUEST, "Minimum withdrawal amount is $10");
  }

  const user = await User.findById(userData.userId)
    .select("stripeConnectAccountId stripeConnectOnboarded")
    .lean();

  if (!user?.stripeConnectAccountId || !user.stripeConnectOnboarded) {
    throw new ApiError(
      status.BAD_REQUEST,
      "You must complete Stripe Connect onboarding before withdrawing",
    );
  }

  // Calculate available balance
  const totalEarnings = await calculateTotalEarnings(
    userData.userId,
    userData.role,
  );
  const totalWithdrawn = await Payout.aggregate([
    {
      $match: {
        userId: user._id,
        status: { $in: ["pending", "approved", "processing", "completed"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const withdrawn = totalWithdrawn[0]?.total || 0;
  const available = totalEarnings - withdrawn;

  if (amount > available) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Insufficient balance. Available: $${available.toFixed(2)}`,
    );
  }

  const payout = await Payout.create({
    userId: userData.userId,
    amount,
    type: "manual_withdrawal",
    status: "pending",
  });

  return payout;
};

const getMyPayouts = async (userData: any, query: QueryParams) => {
  const filter: Record<string, any> = { userId: userData.userId };
  if (query.status) {
    filter.status = query.status;
    delete query.status;
  }

  const payoutQuery = new QueryBuilder(Payout.find(filter).lean(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [payouts, meta] = await Promise.all([
    payoutQuery.modelQuery,
    payoutQuery.countTotal(),
  ]);

  return { meta, payouts };
};

const calculateTotalEarnings = async (
  userId: string,
  role: string,
): Promise<number> => {
  const field = role === "MERCHANT" ? "merchantId" : "driverId";
  const earningsField =
    role === "MERCHANT" ? "merchantNetEarnings" : "driverPayout";

  const result = await Order.aggregate([
    {
      $match: {
        [field]: new (require("mongoose").Types.ObjectId)(userId),
        status: "delivered",
      },
    },
    { $group: { _id: null, total: { $sum: `$${earningsField}` } } },
  ]);

  return result[0]?.total || 0;
};

const getMyEarnings = async (userData: any, query: Record<string, any>) => {
  const period = query.period || "week";
  const field = userData.role === "MERCHANT" ? "merchantId" : "driverId";
  const earningsField =
    userData.role === "MERCHANT" ? "merchantNetEarnings" : "driverPayout";

  let dateFilter: Record<string, any> = {};
  const now = new Date();

  switch (period) {
    case "today":
      dateFilter = {
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
        },
      };
      break;
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
      break;
    case "month":
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
      break;
  }

  const result = await Order.aggregate([
    {
      $match: {
        [field]: new (require("mongoose").Types.ObjectId)(userData.userId),
        status: "delivered",
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: `$${earningsField}` },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const total = result[0]?.total || 0;
  const orderCount = result[0]?.orderCount || 0;

  return {
    total: Math.round(total * 100) / 100,
    perOrder: orderCount > 0 ? Math.round((total / orderCount) * 100) / 100 : 0,
    orderCount,
  };
};

const getMyTransactions = async (userData: any, query: QueryParams) => {
  const orderQuery = new QueryBuilder(
    Order.find({
      merchantId: userData.userId,
      status: "delivered",
    })
      .select(
        "orderId subtotal platformCommission merchantNetEarnings total deliveryFee createdAt",
      )
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [transactions, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  return { meta, transactions };
};
```

Update the `PaymentService` export object:

```typescript
const PaymentService = {
  createIntent,
  getPayment,
  refund,
  createConnectAccount,
  getConnectStatus,
  processOrderPayouts,
  requestWithdrawal,
  getMyPayouts,
  getMyEarnings,
  getMyTransactions,
};

export { PaymentService };
```

### Commands

None required.

### Verification

After routes added, test `GET /payment/my-earnings?period=week` as a merchant/driver.

### Common Mistakes

- Not importing `Payout` and `QueryBuilder` — add these imports at the top of the file.
- Using raw string in `$match` for ObjectId — must convert with `new mongoose.Types.ObjectId(userId)` for aggregation pipeline.

---

## Step 44 — Add Withdrawal Controller Methods

### What & Why

Adds controller methods for the new payout/earnings endpoints.

### Code

Add to `src/app/module/payment/payment.controller.ts`:

```typescript
const requestWithdrawal = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.requestWithdrawal(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Withdrawal request submitted",
    data: result,
  });
});

const getMyPayouts = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.getMyPayouts(req.user, req.query as any);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payouts retrieved",
    data: result.payouts,
    meta: result.meta,
  });
});

const getMyEarnings = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.getMyEarnings(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Earnings retrieved",
    data: result,
  });
});

const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await PaymentService.getMyTransactions(
    req.user,
    req.query as any,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transactions retrieved",
    data: result.transactions,
    meta: result.meta,
  });
});
```

Update the `PaymentController` export:

```typescript
const PaymentController = {
  createIntent,
  getPayment,
  refundPayment,
  createConnectAccount,
  getConnectStatus,
  requestWithdrawal,
  getMyPayouts,
  getMyEarnings,
  getMyTransactions,
};
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific.

---

## Step 45 — Add Payout Routes and Verify

### What & Why

Adds the remaining payment routes and verifies the full payment flow.

### Code

Update `src/app/module/payment/payment.routes.ts` to include all routes:

```typescript
import express from "express";
import auth from "../../middleware/auth";
import { PaymentController } from "./payment.controller";
import config from "../../../config";

const router = express.Router();

router
  // Payment
  .post(
    "/create-intent",
    auth(config.auth_level.user),
    PaymentController.createIntent,
  )
  .get(
    "/get-payment",
    auth(config.auth_level.all),
    PaymentController.getPayment,
  )
  .post(
    "/refund",
    auth(config.auth_level.admin),
    PaymentController.refundPayment,
  )
  // Connect
  .post(
    "/create-connect-account",
    auth(config.auth_level.all),
    PaymentController.createConnectAccount,
  )
  .get(
    "/connect-status",
    auth(config.auth_level.all),
    PaymentController.getConnectStatus,
  )
  // Payouts & Earnings
  .post(
    "/request-withdrawal",
    auth(config.auth_level.all),
    PaymentController.requestWithdrawal,
  )
  .get(
    "/my-payouts",
    auth(config.auth_level.all),
    PaymentController.getMyPayouts,
  )
  .get(
    "/my-earnings",
    auth(config.auth_level.all),
    PaymentController.getMyEarnings,
  )
  .get(
    "/my-transactions",
    auth(config.auth_level.merchant),
    PaymentController.getMyTransactions,
  );

export = router;
```

### Commands

```bash
npm run dev
```

### Verification

1. `POST /payment/create-connect-account` as MERCHANT → returns `accountLink` URL
2. `GET /payment/connect-status` → returns `{ onboarded: false/true }`
3. `POST /payment/request-withdrawal` with `{ amount: 50 }` → creates payout with status `pending`
4. `GET /payment/my-earnings?period=week` → returns earnings summary

### Common Mistakes

- Using `auth_level.merchant` for Connect routes — both MERCHANT and DRIVER need Connect accounts. Use `auth_level.all` and validate role inside the service.
- `my-transactions` IS merchant-only — this shows per-order breakdown with platform fee column.

---

> **End of Part 2 — Steps 24-45 complete.**
> Continue with Part 3 for Property Host Approval, Merchant Orders, and Driver & Delivery (Steps 46-64).
