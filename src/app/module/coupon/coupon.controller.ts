const { default: status } = require("http-status");
import { Request, Response } from "express";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import { CouponService } from "./coupon.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user as AuthUserPayload;
};

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCoupon(requireUser(req), req.body);
  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});

const getMyCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getMyCoupons(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Coupons retrieved",
    meta: result.meta,
    data: result.coupons,
  });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.updateCoupon(requireUser(req), req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Coupon updated successfully",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.deleteCoupon(requireUser(req), req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.validateCoupon(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Coupon is valid",
    data: result,
  });
});

const CouponController = {
  createCoupon,
  getMyCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};

export { CouponController };
