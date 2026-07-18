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
  flaggedReason?: string;
  flaggedAt?: Date;
  propertyImage?: string;
  deliveryRules?: IDeliveryRules;
  guestStayDates?: IGuestStayDates;
  createdAt: Date;
  updatedAt: Date;
}
