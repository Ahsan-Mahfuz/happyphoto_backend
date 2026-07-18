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
