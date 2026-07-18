import { Types } from "mongoose";

export interface IReview {
  user: Types.ObjectId;
  targetId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  review: string;
}
