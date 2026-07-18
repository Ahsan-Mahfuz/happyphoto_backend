import { Types } from "mongoose";

export interface FoodProduct {
  merchant: Types.ObjectId;
  name: string;
  product_image: string;
  category: string;
  price: number;
  quantity: number;
  description: string;
  isAvailable: boolean;
  status: string;
}
