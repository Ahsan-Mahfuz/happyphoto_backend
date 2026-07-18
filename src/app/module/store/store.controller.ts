import { Request, Response } from "express";
import catchAsync from "../../../util/catchAsync";
import sendResponse from "../../../util/sendResponse";
import { StoreService } from "./store.service";
const { default: httpStatus } = require("http-status");

const getNearbyStores = catchAsync(async (req: Request, res: Response) => {
  const { meta, result } = await StoreService.getNearbyStores(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Nearby stores retrieved successfully",
    meta,
    data: result,
  });
});

const getStoreDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await StoreService.getStoreDetails(req.query.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Store details retrieved successfully",
    data: result,
  });
});

const getStoreProducts = catchAsync(async (req: Request, res: Response) => {
  const { id, ...query } = req.query;
  const { meta, result } = await StoreService.getStoreProducts(
    id as string,
    query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Store products retrieved successfully",
    meta,
    data: result,
  });
});

export const StoreController = {
  getNearbyStores,
  getStoreDetails,
  getStoreProducts,
};
