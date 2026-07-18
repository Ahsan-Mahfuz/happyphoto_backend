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

// Must be "validate", not "save" — mongoose validates before running save hooks,
// so a required field generated on save fails validation first.
DeliveryRequestSchema.pre("validate", async function () {
  if (this.isNew && !this.requestId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "requestId" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true },
    );
    this.requestId = `REQ-${counter?.seq}`;
  }
});

const DeliveryRequest = model<IDeliveryRequest>(
  "DeliveryRequest",
  DeliveryRequestSchema,
);

export = DeliveryRequest;
