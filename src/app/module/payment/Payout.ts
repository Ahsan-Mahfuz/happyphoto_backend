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
