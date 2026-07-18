import type { Types, Document } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  merchantId: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  propertyCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
