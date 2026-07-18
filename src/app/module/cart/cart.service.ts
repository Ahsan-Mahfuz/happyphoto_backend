const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Cart from "./Cart";
import { Product } from "../product/Product";
import Property from "../property/Property";

const getCart = async (userData: any) => {
  let cart = await Cart.findOne({ userId: userData.userId })
    .populate({
      path: "items.productId",
      select: "name product_image price quantity category",
    })
    .populate({
      path: "items.merchantId",
      select: "storeName store_logo",
    })
    .lean();

  if (!cart) {
    cart = await Cart.create({ userId: userData.userId, items: [] });
    return cart.toObject();
  }

  return cart;
};

const addItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId", "quantity"]);

  const product = await Product.findById(payload.productId).lean();
  if (!product) {
    throw new ApiError(status.NOT_FOUND, "Product not found");
  }

  if (!product.isAvailable || product.status !== "active") {
    throw new ApiError(status.BAD_REQUEST, "Product is not available");
  }

  if (product.quantity < payload.quantity) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Only ${product.quantity} items in stock`,
    );
  }

  let cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    cart = await Cart.create({ userId: userData.userId, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === payload.productId,
  );

  if (existingItemIndex > -1) {
    // Increment quantity
    cart.items[existingItemIndex].quantity += Number(payload.quantity);
  } else {
    // Add new item
    cart.items.push({
      productId: payload.productId,
      merchantId: product.merchant,
      quantity: Number(payload.quantity),
      price: product.price,
    });
  }

  await cart.save();
  return cart;
};

const updateItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId", "quantity"]);

  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === payload.productId,
  );

  if (itemIndex === -1) {
    throw new ApiError(status.NOT_FOUND, "Item not in cart");
  }

  const quantity = Number(payload.quantity);
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();
  return cart;
};

const removeItem = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["productId"]);

  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== payload.productId,
  );

  await cart.save();
  return cart;
};

const clearCart = async (userData: any) => {
  const cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    throw new ApiError(status.NOT_FOUND, "Cart not found");
  }

  cart.items = [];
  cart.propertyCode = undefined;
  await cart.save();
  return cart;
};

const setPropertyCode = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["propertyCode"]);

  // Validate property code exists and is active
  const property = await Property.findOne({
    propertyCode: payload.propertyCode,
    isActive: true,
  }).lean();

  if (!property) {
    throw new ApiError(status.NOT_FOUND, "Property not found or inactive");
  }

  let cart = await Cart.findOne({ userId: userData.userId });
  if (!cart) {
    cart = await Cart.create({
      userId: userData.userId,
      items: [],
    });
  }

  cart.propertyCode = payload.propertyCode;
  await cart.save();
  return cart;
};

const CartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  setPropertyCode,
};

export { CartService };
