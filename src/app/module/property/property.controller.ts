const { default: status } = require("http-status");
import { PropertyService } from "./property.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";

const addProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.addProperty(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property added successfully",
    data: result,
  });
});

const getProperties = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getProperties(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Properties retrieved successfully",
    data: result.properties,
    meta: result.meta,
  });
});

const getProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getProperty(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.updateProperty(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.deleteProperty(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

const resolveCode = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.resolveCode(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Property code resolved successfully",
    data: result,
  });
});

const updateDeliveryRules = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.updateDeliveryRules(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery rules updated successfully",
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getDashboardStats(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Dashboard stats retrieved",
    data: result,
  });
});

const approveRequest = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.approveRequest(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request approved",
    data: result,
  });
});

const rejectRequest = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.rejectRequest(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery request rejected",
    data: result,
  });
});

const getPendingRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getPendingRequests(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pending requests retrieved",
    data: result.requests,
    meta: result.meta,
  });
});

const getScheduledRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getScheduledRequests(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Scheduled requests retrieved",
    data: result.requests,
    meta: result.meta,
  });
});

const getDeliveredRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await PropertyService.getDeliveredRequests(
    req.user,
    // req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivered requests retrieved",
    data: result.requests,
  });
});

const PropertyController = {
  addProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  resolveCode,
  updateDeliveryRules,
  getDashboardStats,
  approveRequest,
  rejectRequest,
  getPendingRequests,
  getScheduledRequests,
  getDeliveredRequests,
};

export { PropertyController };
