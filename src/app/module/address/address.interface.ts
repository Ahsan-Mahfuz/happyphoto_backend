import type { Types, Document } from "mongoose";

export interface IAddress extends Document {
  userId: Types.ObjectId;
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
