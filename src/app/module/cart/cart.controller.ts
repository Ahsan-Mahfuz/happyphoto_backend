const { default: status } = require("http-status");
import { CartService } from "./cart.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";

const getCart = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.getCart(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart retrieved successfully",
    data: result,
  });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.addItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Item added to cart",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.updateItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart item updated",
    data: result,
  });
});

const removeItem = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.removeItem(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Item removed from cart",
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.clearCart(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cart cleared",
    data: result,
  });
});

const setPropertyCode = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await CartService.setPropertyCode(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property code set on cart",
    data: result,
  });
});

const CartController = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  setPropertyCode,
};

export { CartController };
