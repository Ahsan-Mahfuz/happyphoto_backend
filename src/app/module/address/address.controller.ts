const { default: status } = require("http-status");
import { Request, Response } from "express";
import { AddressService } from "./address.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import ApiError from "../../../error/ApiError";

const addAddress = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await AddressService.addAddress(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Address added",
    data: result,
  });
});

const getAddresses = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await AddressService.getAddresses(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Addresses retrieved",
    data: result,
  });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await AddressService.updateAddress(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Address updated",
    data: result,
  });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await AddressService.deleteAddress(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Address deleted",
    data: result,
  });
});

const setDefaultAddress = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await AddressService.setDefaultAddress(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Default address updated",
    data: result,
  });
});

const AddressController = {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

export { AddressController };
