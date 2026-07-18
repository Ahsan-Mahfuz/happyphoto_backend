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
