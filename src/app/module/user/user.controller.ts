const { default: status } = require("http-status");
import { UserService } from "./user.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { Request, Response } from "express";
import ApiError from "../../../error/ApiError";

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateProfile(req);

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
  const result = await UserService.getProfile(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  await UserService.deleteMyAccount(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted!",
  });
});

const updateDriverInformation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.updateDriverInformation(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Your documents have been submitted successfully.",
      data: result,
    });
  },
);

const updateMerchantBusinessInformation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.updateMerchantBusinessInformation(
      req.user,
      req.body,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Business information updated successfully",
      data: result,
    });
  },
);

const updateMerchantStoreLocation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.updateMerchantStoreLocation(
      req.user,
      req.body,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Store location updated successfully",
      data: result,
    });
  },
);

const updateMerchantStoreProfile = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.updateMerchantStoreProfile(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Store profile updated successfully",
      data: result,
    });
  },
);

const updateMerchantDocument = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.updateMerchantDocument(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Merchant documents updated successfully",
      data: result,
    });
  },
);

const updateStoreSettings = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await UserService.updateStoreSettings(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Store settings updated successfully",
    data: result,
  });
});

const submitDriverApplication = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
    }
    const result = await UserService.submitDriverApplication(
      req.user,
      req.body,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Application submitted",
      data: result,
    });
  },
);

const UserController = {
  deleteMyAccount,
  getProfile,
  updateProfile,
  updateDriverInformation,
  updateMerchantBusinessInformation,
  updateMerchantStoreLocation,
  updateMerchantStoreProfile,
  updateMerchantDocument,
  updateStoreSettings,
  submitDriverApplication,
};

export { UserController };
