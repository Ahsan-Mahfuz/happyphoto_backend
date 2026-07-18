const { default: status } = require("http-status");
import { Request, Response } from "express";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import { MerchantService } from "./merchant.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user as AuthUserPayload;
};

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getDashboardStats(requireUser(req));
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved",
    data: result,
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getAnalytics(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Analytics retrieved",
    data: result,
  });
});

const getMyCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getMyCustomers(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Customers retrieved",
    meta: result.meta,
    data: result.customers,
  });
});

const getInventory = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getInventory(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Inventory retrieved",
    meta: result.meta,
    data: { products: result.products, summary: result.summary },
  });
});

const getLowStockProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getLowStockProducts(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Low stock products retrieved",
    data: result,
  });
});

const MerchantController = {
  getDashboardStats,
  getAnalytics,
  getMyCustomers,
  getInventory,
  getLowStockProducts,
};

export { MerchantController };
