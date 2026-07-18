const { default: status } = require("http-status");
import sendResponse from "../../../util/sendResponse";
import { AdminService } from "./admin.service";
import catchAsync from "../../../util/catchAsync";
import { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateProfile(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await AdminService.getProfile(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin retrieved successfully",
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  await AdminService.deleteMyAccount(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted!",
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Users retrieved",
    meta: result.meta,
    data: result.users,
  });
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.blockUser(
    req.body.authId,
    req.body.isBlocked,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User block status updated",
    data: result,
  });
});

const approveDriver = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.approveDriver(req.body.userId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Driver approved",
    data: result,
  });
});

const rejectDriver = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.rejectDriver(req.body.userId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Driver rejected",
    data: result,
  });
});

const approveMerchant = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.approveMerchant(req.body.userId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Merchant approved",
    data: result,
  });
});

const approvePropertyHost = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.approvePropertyHost(req.body.userId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Property Host approved",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllOrders(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Orders retrieved",
    meta: result.meta,
    data: result.orders,
  });
});

const getAllDeliveryRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AdminService.getAllDeliveryRequests(
      req.query as QueryParams,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Requests retrieved",
      meta: result.meta,
      data: result.requests,
    });
  },
);

const forceApproveRequest = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user as AuthUserPayload;
  const result = await AdminService.forceApproveRequest(userId, req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Request force approved",
    data: result,
  });
});

const rejectRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.rejectRequest(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Request rejected",
    data: result,
  });
});

const getAllStores = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllStores(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Stores retrieved",
    meta: result.meta,
    data: result.stores,
  });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllProperties(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Properties retrieved",
    meta: result.meta,
    data: result.properties,
  });
});

const flagProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.flagProperty(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.isFlagged ? "Property flagged" : "Property flag cleared",
    data: result,
  });
});

const setPropertyStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.setPropertyStatus(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.isActive ? "Property enabled" : "Property disabled",
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllPayments(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Payments retrieved",
    meta: result.meta,
    data: result.transactions,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved",
    data: result,
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAnalytics(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Analytics retrieved",
    data: result,
  });
});

const broadcastNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.broadcastNotification(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: `Notification sent to ${result.delivered} user(s)`,
    data: result,
  });
});

const AdminController = {
  updateProfile,
  getProfile,
  deleteMyAccount,
  getAllUsers,
  blockUser,
  approveDriver,
  rejectDriver,
  approveMerchant,
  approvePropertyHost,
  getAllOrders,
  getAllDeliveryRequests,
  forceApproveRequest,
  rejectRequest,
  getAllStores,
  getAllProperties,
  flagProperty,
  setPropertyStatus,
  getAllPayments,
  getDashboardStats,
  getAnalytics,
  broadcastNotification,
};

export { AdminController };
