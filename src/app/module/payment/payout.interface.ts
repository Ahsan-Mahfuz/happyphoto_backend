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
