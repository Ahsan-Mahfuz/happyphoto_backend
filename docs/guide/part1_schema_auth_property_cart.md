# Fridge Fillers — Implementation Guideline Part 1

> **Steps 1–23** | Domains: Schema Updates · Auth Fixes · Property · Cart

---

## Step 1 — Add Missing Fields to User Interface

### What & Why

The `IUser` interface is missing fields needed by multiple upcoming features: driver vehicle info, application status, Stripe Connect IDs, merchant store settings, rating aggregation, and property-host business details. This must come first because every new module (Order, Property, Payment, Payout) references User fields.

### Code

Modify file: `src/app/module/user/user.interface.ts`

Replace the entire file with:

```typescript
import type { Types, Document } from "mongoose";

export interface IBusinessHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface IUser extends Document {
  authId: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  isOnline?: boolean;

  // property_host specific fields
  businessName?: string;
  taxId?: string;
  businessAddress?: string;

  // driver specific fields
  isApproved?: boolean;
  applicationStatus?: string;
  vehicleType?: string;
  licenseNumber?: string;
  plateNumber?: string;
  drivingLicense_image?: string;
  idCard_image?: string;
  vehicleRegistration_image?: string;
  locationCoordinates?: {
    type: {
      type: string;
      enum: ["Point"];
    };
    coordinates: [number, number];
  };

  // shared driver + merchant fields
  averageRating?: number;
  totalReviews?: number;
  totalDeliveries?: number;
  stripeConnectAccountId?: string;
  stripeConnectOnboarded?: boolean;

  // merchant specific fields
  storeName?: string;
  businessType?: string;
  businessRegistrationNumber?: string;
  vatNumber?: string;
  storeLocationCoordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storePostalCode?: string;
  storeCountry?: string;
  storeDescription?: string;
  storeOpeningTime?: string;
  storeClosingTime?: string;
  storeAveragePrepTime?: number;
  storePhoneNumber?: string;
  storeSupportEmail?: string;
  storeDeliveryRadius?: number;
  storeMinimumOrder?: number;
  storeIsOpen?: boolean;
  store_logo?: string;
  store_banner_image?: string;
  store_front_image?: string;
  trade_license_document?: string;
  merchant_id_card_image?: string;
  businessHours?: IBusinessHours;
}
```

### Commands

None required.

### Verification

Run `npx tsc --noEmit` — no errors on `user.interface.ts`.

### Common Mistakes

- Forgetting to export `IBusinessHours` — other modules may need it.
- Using `number` for `storeDeliveryRadius`/`storeMinimumOrder` — correct, these are stored as plain numbers (miles / dollars).

---

## Step 2 — Add Missing Fields to User Model

### What & Why

The Mongoose schema must match the updated interface. Adds all new fields with appropriate types, defaults, and enum validations. Adds 2dsphere indexes for geo-queries.

### Code

Modify file: `src/app/module/user/User.ts`

Replace the entire file with:

```typescript
import { Schema, model } from "mongoose";
import type { IUser } from "./user.interface";
import {
  EnumUserRole,
  EnumVehicleType,
  EnumApplicationStatus,
} from "../../../util/enum";

const UserSchema = new Schema<IUser>(
  {
    authId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Auth",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(EnumUserRole),
      required: true,
    },
    profile_image: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    dateOfBirth: {
      type: String,
    },
    address: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // property_host specific fields
    businessName: {
      type: String,
    },
    taxId: {
      type: String,
    },
    businessAddress: {
      type: String,
    },

    // driver specific fields
    isApproved: {
      type: Boolean,
    },
    applicationStatus: {
      type: String,
      enum: Object.values(EnumApplicationStatus),
      default: "pending",
    },
    vehicleType: {
      type: String,
      enum: Object.values(EnumVehicleType),
    },
    licenseNumber: {
      type: String,
    },
    plateNumber: {
      type: String,
    },
    drivingLicense_image: {
      type: String,
    },
    idCard_image: {
      type: String,
    },
    vehicleRegistration_image: {
      type: String,
    },
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },

    // shared driver + merchant fields
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    stripeConnectAccountId: {
      type: String,
    },
    stripeConnectOnboarded: {
      type: Boolean,
      default: false,
    },

    // merchant specific fields
    storeName: {
      type: String,
    },
    businessType: {
      type: String,
    },
    businessRegistrationNumber: {
      type: String,
    },
    vatNumber: {
      type: String,
    },
    storeLocationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    storeAddress: {
      type: String,
    },
    storeCity: {
      type: String,
    },
    storeState: {
      type: String,
    },
    storePostalCode: {
      type: String,
    },
    storeCountry: {
      type: String,
    },
    storeDescription: {
      type: String,
    },
    storeOpeningTime: {
      type: String,
    },
    storeClosingTime: {
      type: String,
    },
    storeAveragePrepTime: {
      type: Number,
    },
    storePhoneNumber: {
      type: String,
    },
    storeSupportEmail: {
      type: String,
    },
    storeDeliveryRadius: {
      type: Number,
    },
    storeMinimumOrder: {
      type: Number,
    },
    storeIsOpen: {
      type: Boolean,
      default: true,
    },
    store_logo: {
      type: String,
    },
    store_banner_image: {
      type: String,
    },
    store_front_image: {
      type: String,
    },
    trade_license_document: {
      type: String,
    },
    merchant_id_card_image: {
      type: String,
    },
    businessHours: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
UserSchema.index({ authId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ locationCoordinates: "2dsphere" });
UserSchema.index({ storeLocationCoordinates: "2dsphere" });

const User = model<IUser>("User", UserSchema);

export = User;
```

### Commands

None — indexes are created automatically when Mongoose syncs.

### Verification

Start the server (`npm run dev`). Check MongoDB Compass — the `users` collection should show the new indexes (including `locationCoordinates_2dsphere` and `storeLocationCoordinates_2dsphere`).

### Common Mistakes

- Missing the `EnumVehicleType` and `EnumApplicationStatus` imports — these are created in Step 6. If you get import errors, do Step 6 first or add temporary placeholder enums.
- Not adding `index()` calls — without explicit `UserSchema.index()`, Mongoose may not create compound/2dsphere indexes reliably.

---

## Step 3 — Add Missing Fields to Review Model

### What & Why

Reviews need to be tied to specific orders and merchants/drivers so we can calculate per-entity average ratings and prevent duplicate reviews per order. This comes early because the Review model is referenced by the rating aggregation logic later.

### Code

Modify file: `src/app/module/review/Review.ts`

Replace the entire file with:

```typescript
import { Schema, model, Types } from "mongoose";
import { EnumReviewType } from "../../../util/enum";

export interface IReview {
  user: Types.ObjectId;
  orderId: Types.ObjectId;
  merchantId: Types.ObjectId;
  driverId?: Types.ObjectId;
  reviewType: string;
  rating: number;
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
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
    reviewType: {
      type: String,
      enum: Object.values(EnumReviewType),
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ orderId: 1 });
reviewSchema.index({ merchantId: 1 });
reviewSchema.index({ driverId: 1 });

const Review = model<IReview>("Review", reviewSchema);

export default Review;
```

### Commands

None required.

### Verification

`npx tsc --noEmit` passes. The `EnumReviewType` import resolves after Step 6.

### Common Mistakes

- Making `driverId` required — it's optional because not all orders have a driver at review time (edge case: admin cancellation scenarios).
- Forgetting the `orderId` index — needed for the "one review per order" uniqueness check in the postReview service.

---

## Step 4 — Add Missing Fields to Product Model

### What & Why

Products need availability status tracking for the merchant inventory management feature. The `isAvailable` boolean and `status` enum let merchants toggle products and track stock status.

### Code

Modify file: `src/app/module/product/product.interface.ts`

Find the existing interface and add two fields. The full file should be:

```typescript
import { Types } from "mongoose";

export interface FoodProduct {
  merchant: Types.ObjectId;
  name: string;
  product_image: string;
  category: string;
  price: number;
  quantity: number;
  description: string;
  isAvailable: boolean;
  status: string;
}
```

Modify file: `src/app/module/product/Product.ts`

Replace the entire file with:

```typescript
import { Schema, model } from "mongoose";
import { FoodProduct } from "./product.interface";
import { EnumProductStatus } from "../../../util/enum";

const productSchema = new Schema<FoodProduct>(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    product_image: {
      type: String,
      required: true,
    },
    category: {
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
    description: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumProductStatus),
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ merchant: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: "text", description: "text" });

export const Product = model<FoodProduct>("Product", productSchema);
```

### Commands

None required.

### Verification

Existing product CRUD still works — create a product via `POST /product/post-product` and confirm `isAvailable: true` and `status: "active"` appear in the response.

### Common Mistakes

- Breaking the existing named export pattern — `Product` uses `export const Product` (different from other modules). Keep it consistent.
- Forgetting `default: true` on `isAvailable` — existing products should remain available.

---

## Step 5 — Add Upload Fields for Property Image and Proof of Delivery

### What & Why

The `fileUploader` middleware only accepts a whitelist of field names. We need `property_image` (Property Host uploads property photos) and `proof_of_delivery` (Driver uploads delivery proof).

### Code

Modify file: `src/app/middleware/fileUploader.ts`

Find the `allowedFieldNames` array (line 11) and add the two new field names:

```
Target:
const allowedFieldNames: string[] = [
  "profile_image",
  "drivingLicense_image",
  "idCard_image",
  "vehicleRegistration_image",
  "store_logo",
  "store_banner_image",
  "store_front_image",
  "trade_license_document",
  "merchant_id_card_image",
  "product_image",
];

Replace with:
const allowedFieldNames: string[] = [
  "profile_image",
  "drivingLicense_image",
  "idCard_image",
  "vehicleRegistration_image",
  "store_logo",
  "store_banner_image",
  "store_front_image",
  "trade_license_document",
  "merchant_id_card_image",
  "product_image",
  "property_image",
  "proof_of_delivery",
];
```

Also find the `.fields([...])` array (line 98) and add:

```
Target:
    { name: "product_image", maxCount: 1 },
  ]);

Replace with:
    { name: "product_image", maxCount: 1 },
    { name: "property_image", maxCount: 1 },
    { name: "proof_of_delivery", maxCount: 1 },
  ]);
```

### Commands

None required.

### Verification

Server starts without errors. Uploading a file with `fieldname: "property_image"` via multipart form no longer throws "Invalid fieldname".

### Common Mistakes

- Adding to `allowedFieldNames` but forgetting the `.fields()` config — both arrays must be updated.
- Misspelling the field name — must match exactly what the client sends in multipart form-data.

---

## Step 6 — Add New Enums

### What & Why

Multiple new models need enum constants for status fields, vehicle types, property types, etc. Adding them all now prevents import errors when building subsequent models.

### Code

Modify file: `src/util/enum.ts`

Replace the entire file with:

```typescript
const EnumUserRole = {
  USER: "USER",
  PROPERTY_HOST: "PROPERTY_HOST",
  DRIVER: "DRIVER",
  MERCHANT: "MERCHANT",
  ADMIN: "ADMIN",
};

const EnumPaymentStatus = {
  SUCCEEDED: "succeeded",
  UNPAID: "unpaid",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  FAILED: "failed",
};

const EnumSocketEvent = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  SOCKET_ERROR: "socket_error",
  ONLINE_STATUS: "online_status",
  UPDATE_LOCATION: "update_location",

  START_CHAT: "start_chat",
  SEND_MESSAGE: "send_message",

  SUBSCRIBE_DRIVER_LOCATION: "subscribe_driver_location",
  UNSUBSCRIBE_DRIVER_LOCATION: "unsubscribe_driver_location",
};

const EnumLoginProvider = {
  LOCAL: "local",
  GOOGLE: "google",
  APPLE: "apple",
};

const EnumUserAccountStatus = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

const EnumOrderStatus = {
  PENDING: "pending",
  PENDING_HOST_APPROVAL: "pending_host_approval",
  APPROVED: "approved",
  ACCEPTED_BY_MERCHANT: "accepted_by_merchant",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "ready_for_pickup",
  DRIVER_ASSIGNED: "driver_assigned",
  PICKED_UP: "picked_up",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const EnumDeliveryRequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  FORCE_APPROVED: "force_approved",
};

const EnumPayoutStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

const EnumPayoutType = {
  WEEKLY_PAYOUT: "weekly_payout",
  MANUAL_WITHDRAWAL: "manual_withdrawal",
};

const EnumVehicleType = {
  BICYCLE: "bicycle",
  SCOOTER: "scooter",
  CAR: "car",
};

const EnumPropertyType = {
  APARTMENT: "apartment",
  VACATION_RENTAL: "vacation_rental",
  HOUSE: "house",
  CONDO: "condo",
  OTHER: "other",
};

const EnumApplicationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const EnumProductStatus = {
  ACTIVE: "active",
  OUT_OF_STOCK: "out_of_stock",
  DISABLED: "disabled",
};

const EnumReviewType = {
  MERCHANT: "merchant",
  DRIVER: "driver",
};

export {
  EnumUserRole,
  EnumPaymentStatus,
  EnumSocketEvent,
  EnumLoginProvider,
  EnumUserAccountStatus,
  EnumOrderStatus,
  EnumDeliveryRequestStatus,
  EnumPayoutStatus,
  EnumPayoutType,
  EnumVehicleType,
  EnumPropertyType,
  EnumApplicationStatus,
  EnumProductStatus,
  EnumReviewType,
};
```

### Commands

None required.

### Verification

`npx tsc --noEmit` — no errors. All previous steps' imports now resolve.

### Common Mistakes

- Using uppercase enum values in the objects (like `"PENDING"`) — the values must be **lowercase** to match what gets stored in MongoDB and returned in API responses. The keys are uppercase (for code readability), values are lowercase.
- Forgetting to add to the `export` block — every new enum must be listed.

---

## Step 7 — Add Stripe Webhook Secret to Config

### What & Why

The Stripe webhook handler (Step 35) needs `STRIPE_WEBHOOK_SECRET` to verify webhook signatures. Adding it to config now prevents forgetting it later.

### Code

Modify file: `src/config/index.ts`

Find the `stripe` section and add `stripe_webhook_secret`:

```
Target:
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  },

Replace with:
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
```

Also add the key to `.env.example`:

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Commands

Add to your `.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_... # Get from Stripe Dashboard > Developers > Webhooks
```

### Verification

`console.log(config.stripe.stripe_webhook_secret)` in server.ts (temporarily) outputs the value from `.env`.

### Common Mistakes

- Forgetting to add to `.env` (not just `.env.example`) — the server will crash when the webhook handler tries to use `undefined`.

---

## Step 8 — Fix changePassword Bug

### What & Why

The `changePassword` function in `auth.service.ts` stores the new password as **plaintext** because `Auth.updateOne()` bypasses Mongoose's `pre('save')` hook that hashes passwords. The `resetPassword` function correctly uses `hashPass()` — we replicate that pattern here.

### Code

Modify file: `src/app/module/auth/auth.service.ts`

Find line 363:

```
Target:
  await Auth.updateOne({ email }, { password: newPassword });

Replace with:
  const hashedPassword = await hashPass(newPassword);
  await Auth.updateOne({ email }, { password: hashedPassword });
```

### Commands

None required. Server auto-restarts with `ts-node-dev`.

### Verification

1. Login with a known password
2. Call `PATCH /auth/change-password` with `{ oldPassword, newPassword: "Test1234!", confirmPassword: "Test1234!" }`
3. Logout and login with `"Test1234!"` — should succeed
4. Check MongoDB: the `auths` collection password field should be a bcrypt hash (starts with `$2b$`), NOT plaintext

### Common Mistakes

- Hashing but forgetting to use `await` — `hashPass` is async (uses `bcrypt.hash`). Without `await`, you'd store a Promise object.
- The `hashPass` function is already defined at line 407 in the same file — don't redeclare it.

---

## Step 9 — Fix changePassword Route Auth Level

### What & Why

The route uses `auth(config.auth_level.user)` which only allows `["USER", "ADMIN"]`. But PROPERTY_HOST, DRIVER, and MERCHANT also need to change their passwords. Change to `auth_level.all`.

### Code

Modify file: `src/app/module/auth/auth.routes.ts`

Find:

```
Target:
    auth(config.auth_level.user),

Replace with:
    auth(config.auth_level.all),
```

### Commands

None required.

### Verification

Login as a MERCHANT user and call `PATCH /auth/change-password` — should return 200 instead of 403 Forbidden.

### Common Mistakes

- None — this is a one-line fix.

---

## Step 10 — Create Property Interface

### What & Why

Defines the TypeScript types for the Property model. Comes before the model because `Property.ts` imports this interface. Includes the `IDeliveryRules` sub-interface for the persistent delivery rules feature.

### Code

Create file: `src/app/module/property/property.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface IDeliveryRules {
  defaultWindowStart?: string;
  defaultWindowEnd?: string;
  guestStayCheckIn?: Date;
  guestStayCheckOut?: Date;
}

export interface IGuestStayDates {
  checkIn?: Date;
  checkOut?: Date;
}

export interface IProperty extends Document {
  hostId: Types.ObjectId;
  propertyName: string;
  propertyType: string;
  physicalAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  propertyCode: string;
  locationCoordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  isActive: boolean;
  isFlagged: boolean;
  propertyImage?: string;
  deliveryRules?: IDeliveryRules;
  guestStayDates?: IGuestStayDates;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

File exists at `src/app/module/property/property.interface.ts` — no TypeScript errors.

### Common Mistakes

- Making `state` required — it's optional per the plan (some countries don't have states).

---

## Step 11 — Create Property Model

### What & Why

The Mongoose schema for properties. Includes indexes for efficient lookups: unique `propertyCode`, host lookup, geo-queries, and active filter.

### Code

Create file: `src/app/module/property/Property.ts`

```typescript
import { Schema, model } from "mongoose";
import type { IProperty } from "./property.interface";
import { EnumPropertyType } from "../../../util/enum";

const PropertySchema = new Schema<IProperty>(
  {
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    propertyName: {
      type: String,
      required: true,
    },
    propertyType: {
      type: String,
      enum: Object.values(EnumPropertyType),
      required: true,
    },
    physicalAddress: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    propertyCode: {
      type: String,
      required: true,
      unique: true,
    },
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    propertyImage: {
      type: String,
    },
    deliveryRules: {
      type: {
        defaultWindowStart: String,
        defaultWindowEnd: String,
        guestStayCheckIn: Date,
        guestStayCheckOut: Date,
      },
    },
    guestStayDates: {
      type: {
        checkIn: Date,
        checkOut: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

PropertySchema.index({ propertyCode: 1 }, { unique: true });
PropertySchema.index({ hostId: 1 });
PropertySchema.index({ isActive: 1 });
PropertySchema.index({ locationCoordinates: "2dsphere" });

const Property = model<IProperty>("Property", PropertySchema);

export = Property;
```

### Commands

None required.

### Verification

Start server — `properties` collection appears in MongoDB with indexes visible in Compass.

### Common Mistakes

- Forgetting `unique: true` on `propertyCode` — codes MUST be globally unique.
- The `2dsphere` index on `locationCoordinates` requires the GeoJSON format (`type: "Point"`, `coordinates: [lng, lat]`). Latitude comes SECOND.

---

## Step 12 — Create Property Code Generator Utility

### What & Why

Generates unique property codes in the format `ABC1234` (3 uppercase letters + 4 digits). Checks the database to ensure uniqueness before returning. This is a standalone utility because it's used by the Property service.

### Code

Create file: `src/util/generatePropertyCode.ts`

```typescript
import Property from "../app/module/property/Property";

const generatePropertyCode = async (): Promise<string> => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code: string;
  let exists = true;

  // Keep generating until we find a unique code
  while (exists) {
    let letterPart = "";
    for (let i = 0; i < 3; i++) {
      letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    const numberPart = Math.floor(1000 + Math.random() * 9000).toString();
    code = letterPart + numberPart;

    const existing = await Property.findOne({ propertyCode: code }).lean();
    if (!existing) {
      exists = false;
    }
  }

  return code!;
};

export = generatePropertyCode;
```

### Commands

None required.

### Verification

You can test in isolation:

```typescript
// Temporary test in server.ts after DB connects:
import generatePropertyCode from "./util/generatePropertyCode";
const code = await generatePropertyCode();
console.log(code); // e.g., "PHX2847"
```

### Common Mistakes

- Using `Math.random() * 10000` without the `1000 +` offset — this could produce 3-digit numbers like `042`. The `1000 + Math.random() * 9000` formula guarantees 4-digit numbers (1000–9999).
- Not awaiting the function — it's async because of the DB uniqueness check.

---

## Step 13 — Create Property Service

### What & Why

All business logic for property CRUD and code resolution. This is the largest service in Domain 2 — handles adding properties, resolving codes (the public endpoint that reveals NO address), updating delivery rules, and dashboard stats.

### Code

Create file: `src/app/module/property/property.service.ts`

```typescript
const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Property from "./Property";
import User from "../user/User";
import generatePropertyCode from "../../../util/generatePropertyCode";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import type { Request } from "express";
import unlinkFile from "../../../util/unlinkFile";

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
    { new: true, runValidators: true },
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
    { new: true, runValidators: true },
  );

  return updatedProperty;
};

const getDashboardStats = async (userData: any) => {
  const propertiesCount = await Property.countDocuments({
    hostId: userData.userId,
  });

  // These will be populated after DeliveryRequest model exists
  // For now, return zeros — updated in Step 46
  return {
    propertiesCount,
    pendingCount: 0,
    upcomingCount: 0,
    approvedCount: 0,
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
};

export { PropertyService };
```

### Commands

None required.

### Verification

After Step 16, test:

```
POST /property/add-property
Authorization: Bearer <property_host_token>
Content-Type: multipart/form-data

propertyName: Downtown Loft
propertyType: apartment
physicalAddress: 123 Main St
city: Phoenix
state: AZ
postalCode: 85001
country: US
```

Expected: 200 with `propertyCode` like `"PHX2847"`.

### Common Mistakes

- Leaking `physicalAddress` in `resolveCode` — this endpoint is PUBLIC and must NEVER return the address. Only `propertyName`, `propertyType`, `hostCompany`, `city`, `state`.
- Not parsing lat/long as floats — query params come as strings.

---

## Step 14 — Create Property Controller

### What & Why

Connects Property routes to the Property service. Follows the existing `catchAsync` + `sendResponse` pattern.

### Code

Create file: `src/app/module/property/property.controller.ts`

```typescript
const { default: status } = require("http-status");
import { PropertyService } from "./property.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";

const addProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.addProperty(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property added successfully",
    data: result,
  });
});

const getProperties = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getProperties(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Properties retrieved successfully",
    data: result.properties,
    meta: result.meta,
  });
});

const getProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getProperty(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.updateProperty(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.deleteProperty(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

const resolveCode = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.resolveCode(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property code resolved successfully",
    data: result,
  });
});

const updateDeliveryRules = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.updateDeliveryRules(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery rules updated successfully",
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getDashboardStats(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard stats retrieved",
    data: result,
  });
});

const PropertyController = {
  addProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  resolveCode,
  updateDeliveryRules,
  getDashboardStats,
};

export { PropertyController };
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- `resolveCode` should NOT check `req.user` — it's a public endpoint (any authenticated user can resolve a code during checkout).

---

## Step 15 — Create Property Routes

### What & Why

Maps HTTP endpoints to property controller methods with appropriate auth levels.

### Code

Create file: `src/app/module/property/property.routes.ts`

```typescript
import express from "express";
import auth from "../../middleware/auth";
import { PropertyController } from "./property.controller";
import { uploadFile } from "../../middleware/fileUploader";
import config from "../../../config";

const router = express.Router();

router
  .post(
    "/add-property",
    auth(config.auth_level.property_host),
    uploadFile(),
    PropertyController.addProperty,
  )
  .get(
    "/get-properties",
    auth(config.auth_level.property_host),
    PropertyController.getProperties,
  )
  .get(
    "/get-property",
    auth(config.auth_level.property_host),
    PropertyController.getProperty,
  )
  .patch(
    "/update-property",
    auth(config.auth_level.property_host),
    uploadFile(),
    PropertyController.updateProperty,
  )
  .delete(
    "/delete-property",
    auth(config.auth_level.property_host),
    PropertyController.deleteProperty,
  )
  .get(
    "/resolve-code",
    auth(config.auth_level.all),
    PropertyController.resolveCode,
  )
  .patch(
    "/update-delivery-rules",
    auth(config.auth_level.property_host),
    PropertyController.updateDeliveryRules,
  )
  .get(
    "/dashboard-stats",
    auth(config.auth_level.property_host),
    PropertyController.getDashboardStats,
  );

export = router;
```

### Commands

None required.

### Verification

Routes file compiles without errors.

### Common Mistakes

- Using `auth(config.auth_level.all)` for property mutation routes — only the host should modify properties. Use `property_host`.
- Forgetting `uploadFile()` on `add-property` and `update-property` — these accept `property_image`.

---

## Step 16 — Register Property Routes

### What & Why

Adds the property module to the main router so endpoints are accessible at `/property/*`.

### Code

Modify file: `src/app/routes/index.ts`

Add the import and route entry:

```
Target:
import ProductRoutes from "../module/product/product.routes";

Replace with:
import ProductRoutes from "../module/product/product.routes";
import PropertyRoutes from "../module/property/property.routes";
```

And add to the `moduleRoutes` array:

```
Target:
  {
    path: "/product",
    route: ProductRoutes,
  },
];

Replace with:
  {
    path: "/product",
    route: ProductRoutes,
  },
  {
    path: "/property",
    route: PropertyRoutes,
  },
];
```

### Commands

None required. Server auto-restarts.

### Verification

`GET /property/resolve-code?propertyCode=TEST` should return 404 "Property not found or inactive" (not 404 "route not found").

### Common Mistakes

- Importing with `import PropertyRoutes from ...` but the file exports with `export = router` — this works with TypeScript `esModuleInterop: true` (already set in `tsconfig.json`).

---

## Step 17 — Verify Property Module End-to-End

### What & Why

Confirms the entire Property module works before building dependent features (Cart property code, Order property flow).

### Code

No new code.

### Commands

Start the server:

```bash
npm run dev
```

### Verification

**Test 1 — Add Property:**

```
POST /property/add-property
Authorization: Bearer <property_host_token>
Content-Type: multipart/form-data

propertyName=Downtown Loft
propertyType=apartment
physicalAddress=123 Main St
city=Phoenix
state=AZ
postalCode=85001
country=US
```

Expected response:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property added successfully",
  "data": {
    "_id": "...",
    "propertyCode": "XYZ1234",
    "propertyName": "Downtown Loft",
    "propertyType": "apartment",
    "isActive": true,
    "isFlagged": false
  }
}
```

**Test 2 — Resolve Code (as USER):**

```
GET /property/resolve-code?propertyCode=XYZ1234
Authorization: Bearer <user_token>
```

Expected: Returns `propertyName`, `propertyType`, `hostCompany`, `city`, `state` — **NO `physicalAddress` or `locationCoordinates`**.

**Test 3 — Invalid Code:**

```
GET /property/resolve-code?propertyCode=INVALID
```

Expected: `404 "Property not found or inactive"`

### Common Mistakes

- Testing without first registering and activating a PROPERTY_HOST account — you need a valid host JWT.

---

## Step 18 — Create Cart Interface

### What & Why

Defines types for the Cart model. One cart per user (singleton), containing items from potentially multiple merchants.

### Code

Create file: `src/app/module/cart/cart.interface.ts`

```typescript
import type { Types, Document } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  merchantId: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  propertyCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- Forgetting `merchantId` on `ICartItem` — needed for grouping items by merchant during checkout (Step 29).

---

## Step 19 — Create Cart Model

### What & Why

The Mongoose schema for carts. Uses a unique index on `userId` to enforce one cart per user.

### Code

Create file: `src/app/module/cart/Cart.ts`

```typescript
import { Schema, model } from "mongoose";
import type { ICart } from "./cart.interface";

const CartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
    propertyCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

CartSchema.index({ userId: 1 }, { unique: true });

const Cart = model<ICart>("Cart", CartSchema);

export = Cart;
```

### Commands

None required.

### Verification

Start server — `carts` collection appears in MongoDB.

### Common Mistakes

- Setting `_id: true` on `CartItemSchema` — subdocuments get `_id` by default which creates unnecessary overhead. Use `_id: false` since we identify items by `productId`.
- Forgetting `min: 1` on `quantity` — prevents zero-quantity items in the cart.

---

## Step 20 — Create Cart Service

### What & Why

All cart business logic: CRUD operations, property code linkage, and product validation.

### Code

Create file: `src/app/module/cart/cart.service.ts`

```typescript
const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Cart from "./Cart";
import { Product } from "../product/Product";
import Property from "../property/Property";

const getCart = async (userData: any) => {
  let cart = await Cart.findOne({ userId: userData.userId })
    .populate({
      path: "items.productId",
      select: "name product_image price quantity category",
    })
    .populate({
      path: "items.merchantId",
      select: "storeName store_logo",
    })
    .lean();

  if (!cart) {
    cart = await Cart.create({ userId: userData.userId, items: [] });
    return cart.toObject();
  }

  return cart;
};

const addItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId", "quantity"]);

  const product = await Product.findById(payload.productId).lean();
  if (!product) {
    throw new ApiError(status.NOT_FOUND, "Product not found");
  }

  if (!product.isAvailable || product.status !== "active") {
    throw new ApiError(status.BAD_REQUEST, "Product is not available");
  }

  if (product.quantity < payload.quantity) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Only ${product.quantity} items in stock`,
    );
  }

  let cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    cart = await Cart.create({ userId: userData.userId, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === payload.productId,
  );

  if (existingItemIndex > -1) {
    // Increment quantity
    cart.items[existingItemIndex].quantity += Number(payload.quantity);
  } else {
    // Add new item
    cart.items.push({
      productId: payload.productId,
      merchantId: product.merchant,
      quantity: Number(payload.quantity),
      price: product.price,
    });
  }

  await cart.save();
  return cart;
};

const updateItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId", "quantity"]);

  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === payload.productId,
  );

  if (itemIndex === -1) {
    throw new ApiError(status.NOT_FOUND, "Item not in cart");
  }

  const quantity = Number(payload.quantity);
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();
  return cart;
};

const removeItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId"]);

  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== payload.productId,
  );

  await cart.save();
  return cart;
};

const clearCart = async (userData: any) => {
  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  cart.items = [];
  cart.propertyCode = undefined;
  await cart.save();
  return cart;
};

const setPropertyCode = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["propertyCode"]);

  // Validate property code exists and is active
  const property = await Property.findOne({
    propertyCode: payload.propertyCode,
    isActive: true,
  }).lean();

  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found or inactive");
  }

  let cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    cart = await Cart.create({
      userId: userData.userId,
      items: [],
    });
  }

  cart.propertyCode = payload.propertyCode;
  await cart.save();
  return cart;
};

const CartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  setPropertyCode,
};

export { CartService };
```

### Commands

None required.

### Verification

After Step 23, test adding an item:

```
POST /cart/add-item
Authorization: Bearer <user_token>
Content-Type: application/json

{ "productId": "<valid_product_id>", "quantity": 2 }
```

### Common Mistakes

- Not converting `quantity` to Number — `req.body` may deliver it as a string.
- Forgetting to validate stock before adding — if a product has quantity 3 and user adds 5, we should reject.
- Not populating product/merchant details in `getCart` — the client needs product names, images, and store names for display.

---

## Step 21 — Create Cart Controller

### What & Why

Standard controller connecting routes to Cart service methods.

### Code

Create file: `src/app/module/cart/cart.controller.ts`

```typescript
const { default: status } = require("http-status");
import { CartService } from "./cart.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";

const getCart = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.getCart(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart retrieved successfully",
    data: result,
  });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.addItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Item added to cart",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.updateItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart item updated",
    data: result,
  });
});

const removeItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.removeItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Item removed from cart",
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.clearCart(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart cleared",
    data: result,
  });
});

const setPropertyCode = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.setPropertyCode(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property code set on cart",
    data: result,
  });
});

const CartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  setPropertyCode,
};

export { CartController };
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- None specific to this step.

---

## Step 22 — Create Cart Routes

### What & Why

Maps HTTP methods to Cart controller. All cart operations require USER role.

### Code

Create file: `src/app/module/cart/cart.routes.ts`

```typescript
import express from "express";
import auth from "../../middleware/auth";
import { CartController } from "./cart.controller";
import config from "../../../config";

const router = express.Router();

router
  .get("/get-cart", auth(config.auth_level.user), CartController.getCart)
  .post("/add-item", auth(config.auth_level.user), CartController.addItem)
  .patch(
    "/update-item",
    auth(config.auth_level.user),
    CartController.updateItem,
  )
  .delete(
    "/remove-item",
    auth(config.auth_level.user),
    CartController.removeItem,
  )
  .delete("/clear-cart", auth(config.auth_level.user), CartController.clearCart)
  .patch(
    "/set-property-code",
    auth(config.auth_level.user),
    CartController.setPropertyCode,
  );

export = router;
```

### Commands

None required.

### Verification

No TypeScript errors.

### Common Mistakes

- Using `auth_level.all` instead of `auth_level.user` — only USERs (customers) have carts.

---

## Step 23 — Register Cart Routes and Verify

### What & Why

Connects the cart module to the main router and tests end-to-end.

### Code

Modify file: `src/app/routes/index.ts`

Add the import:

```
Target:
import PropertyRoutes from "../module/property/property.routes";

Replace with:
import PropertyRoutes from "../module/property/property.routes";
import CartRoutes from "../module/cart/cart.routes";
```

Add to the `moduleRoutes` array:

```
Target:
  {
    path: "/property",
    route: PropertyRoutes,
  },
];

Replace with:
  {
    path: "/property",
    route: PropertyRoutes,
  },
  {
    path: "/cart",
    route: CartRoutes,
  },
];
```

### Commands

```bash
npm run dev
```

### Verification

**Test 1 — Get empty cart:**

```
GET /cart/get-cart
Authorization: Bearer <user_token>
```

Expected: 200 with empty `items: []`

**Test 2 — Add item:**

```
POST /cart/add-item
Authorization: Bearer <user_token>
Content-Type: application/json

{ "productId": "<valid_id>", "quantity": 2 }
```

Expected: 200 with the product added to `items` array

**Test 3 — Set property code:**

```
PATCH /cart/set-property-code
Authorization: Bearer <user_token>
Content-Type: application/json

{ "propertyCode": "XYZ1234" }
```

Expected: 200 with `propertyCode` set on the cart

**Test 4 — Clear cart:**

```
DELETE /cart/clear-cart
Authorization: Bearer <user_token>
```

Expected: 200 with empty items and no propertyCode

### Common Mistakes

- Testing with a MERCHANT or DRIVER token — carts use `auth_level.user` which only allows USER and ADMIN.
- Forgetting to create a product first (via `POST /product/post-product` as a MERCHANT) before testing cart operations.

---

> **End of Part 1 — Steps 1-23 complete.**
> Continue with Part 2 for Order, Payment, and Stripe Connect (Steps 24-45).
