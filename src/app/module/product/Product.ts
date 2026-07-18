import { Schema, model } from "mongoose";
import { FoodProduct } from "./product.interface";
import { EnumProductStatus } from "../../../util/enum";

const productSchema = new Schema<FoodProduct>(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    product_image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumProductStatus),
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ merchant: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: "text", description: "text" });

export const Product = model<FoodProduct>("Product", productSchema);
