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
    tipAmount: {
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

// Auto-generate orderId. This must run on "validate", not "save": mongoose runs
// validation before the save hooks, so a required field generated here would
// fail validation before the hook ever ran.
OrderSchema.pre("validate", async function () {
  if (this.isNew && !this.orderId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "orderId" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true },
    );
    this.orderId = `ORD-${counter?.seq}`;
  }
});

const Order = model<IOrder>("Order", OrderSchema);

export = Order;
