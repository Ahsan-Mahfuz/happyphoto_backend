import { Schema, Types, model } from "mongoose";

const EnumDiscountType = {
  PERCENT: "percent",
  FLAT: "flat",
};

interface ICoupon {
  _id: Types.ObjectId;
  merchant: Types.ObjectId;
  code: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  expiresAt: Date;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Stored uppercase so lookups are case-insensitive without a collation.
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: Object.values(EnumDiscountType),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Omitted means unlimited redemptions.
    usageLimit: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// A code only has to be unique within a merchant's own store.
CouponSchema.index({ merchant: 1, code: 1 }, { unique: true });
CouponSchema.index({ expiresAt: 1 });

const Coupon = model<ICoupon>("Coupon", CouponSchema);

export { Coupon, ICoupon, EnumDiscountType };
