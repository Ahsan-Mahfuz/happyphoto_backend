const { status } = require("http-status");

import Auth from "../auth/Auth";
import User from "./User";
import deleteFalsyField from "../../../util/deleteFalsyField";
import ApiError from "../../../error/ApiError";
import unlinkFile from "../../../util/unlinkFile";
import { Request } from "express";
import { AuthUserPayload } from "../../../types/auth.types";
import { EnumUserRole } from "../../../util/enum";
import postNotification from "../../../util/postNotification";

const updateProfile = async (req: Request) => {
  const { body: data } = req;
  const { userId, authId } = req.user;
  const updateData: Record<string, any> = { ...data };
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  deleteFalsyField(data);
  const existingUser = await User.findById(userId).lean();

  let hasNewImage = false;
  if (files && files.profile_image) {
    updateData.profile_image = files.profile_image[0].path;
    hasNewImage = true;
  }

  const [auth, user] = await Promise.all([
    Auth.findByIdAndUpdate(
      authId,
      { name: updateData.name },
      {
        returnDocument: "after",
      },
    ),
    User.findByIdAndUpdate(
      userId,
      { ...updateData },
      {
        returnDocument: "after",
      },
    ).populate("authId"),
  ]);

  if (!auth || !user) throw new ApiError(status.NOT_FOUND, "User not found!");

  if (hasNewImage && existingUser && existingUser.profile_image) {
    unlinkFile(existingUser.profile_image);
  }

  return user;
};

const getProfile = async (userData: AuthUserPayload) => {
  const { userId, authId } = userData;

  const [auth, result] = await Promise.all([
    Auth.findById(authId).lean(),
    User.findById(userId).populate("authId").lean(),
  ]);

  if (!auth || !result) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (auth.isBlocked) {
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");
  }

  return result;
};

const deleteMyAccount = async (
  userData: { email: string },
  payload: { password: string },
) => {
  // Identity comes from the token, never the body — taking the email from the
  // payload let any authenticated caller delete a different account.
  const { email } = userData;
  const { password } = payload;

  const [auth, user] = await Promise.all([
    Auth.findOne({ email }).select("+password").lean(),
    User.findOne({ email }).lean(),
  ]);

  if (!auth || !user) {
    throw new ApiError(status.NOT_FOUND, "User does not exist");
  }

  if (!password || !auth.password) {
    throw new ApiError(status.BAD_REQUEST, "Password is required");
  }

  if (!(await Auth.isPasswordMatched(password, auth.password))) {
    throw new ApiError(status.FORBIDDEN, "Password is incorrect");
  }

  if (user.profile_image) {
    unlinkFile(user.profile_image);
  }

  await Promise.all([
    Auth.deleteOne({ _id: auth._id }),
    User.deleteOne({ _id: user._id }),
  ]);
};

const updateDriverInformation = async (req: Request) => {
  const { body: data, user } = req;
  const { userId } = user;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  const updatedData: Record<string, any> = {
    licenseNumber: data.licenseNumber,
    plateNumber: data.plateNumber,
  };

  deleteFalsyField(data);
  const existingUser = await User.findById(userId).lean();

  if (!existingUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }
  if (existingUser.role !== EnumUserRole.DRIVER) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  let replaceDrivingLicense = false;
  let replaceIdCard = false;
  let replaceVehicleRegistration = false;

  if (files?.drivingLicense_image) {
    updatedData.drivingLicense_image = files.drivingLicense_image[0].path;
    replaceDrivingLicense = true;
  }

  if (files?.idCard_image) {
    updatedData.idCard_image = files.idCard_image[0].path;
    replaceIdCard = true;
  }

  if (files?.vehicleRegistration_image) {
    updatedData.vehicleRegistration_image =
      files.vehicleRegistration_image[0].path;
    replaceVehicleRegistration = true;
  }

  const [userFromDB] = await Promise.all([
    User.findByIdAndUpdate(userId, updatedData, {
      returnDocument: "after",
    }).populate("authId"),
  ]);

  if (replaceDrivingLicense && existingUser.drivingLicense_image) {
    unlinkFile(existingUser.drivingLicense_image);
  }

  if (replaceIdCard && existingUser.idCard_image) {
    unlinkFile(existingUser.idCard_image);
  }

  if (replaceVehicleRegistration && existingUser.vehicleRegistration_image) {
    unlinkFile(existingUser.vehicleRegistration_image);
  }

  return userFromDB;
};

const updateMerchantBusinessInformation = async (
  userData: AuthUserPayload,
  payload: Record<string, string>,
) => {
  const { storeName, businessType, businessRegistrationNumber, vatNumber } =
    payload;
  const { userId } = userData;

  deleteFalsyField(payload);
  const existingUser = await User.findById(userId).lean();

  if (!existingUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }
  if (existingUser.role !== EnumUserRole.MERCHANT) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  const updatedData: Record<string, string> = {
    storeName,
    businessType,
    businessRegistrationNumber,
    vatNumber,
  };

  const [userFromDB] = await Promise.all([
    User.findByIdAndUpdate(userId, updatedData, {
      returnDocument: "after",
    }),
  ]);

  return userFromDB;
};

const updateMerchantStoreLocation = async (
  userData: AuthUserPayload,
  payload: Record<string, number | string>,
) => {
  const {
    storeLocationCoordinatesLat,
    storeLocationCoordinatesLong,
    storeAddress,
    storeCity,
    storeState,
    storePostalCode,
    storeCountry,
  } = payload;
  const { userId } = userData;

  deleteFalsyField(payload);
  const existingUser = await User.findById(userId).lean();

  if (!existingUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }
  if (existingUser.role !== EnumUserRole.MERCHANT) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  const updatedData: Record<
    string,
    string | number | { type: string; coordinates: number[] } | undefined
  > = {
    storeAddress,
    storeCity,
    storeState,
    storePostalCode,
    storeCountry,
  };

  // Only touch the coordinates when both halves are present and numeric.
  // Writing a partial pair produces [NaN, NaN], and omitting `type: "Point"`
  // makes the 2dsphere index reject the whole document with a 500.
  const long = Number(storeLocationCoordinatesLong);
  const lat = Number(storeLocationCoordinatesLat);
  const hasCoordinates =
    storeLocationCoordinatesLong !== undefined &&
    storeLocationCoordinatesLat !== undefined &&
    Number.isFinite(long) &&
    Number.isFinite(lat);

  if (hasCoordinates) {
    if (lat < -90 || lat > 90 || long < -180 || long > 180) {
      throw new ApiError(
        status.BAD_REQUEST,
        "Coordinates out of range: latitude must be -90..90 and longitude -180..180",
      );
    }
    updatedData.storeLocationCoordinates = {
      type: "Point",
      coordinates: [long, lat],
    };
  }

  const [userFromDB] = await Promise.all([
    User.findByIdAndUpdate(userId, updatedData, {
      returnDocument: "after",
    }),
  ]);

  return userFromDB;
};

const updateMerchantStoreProfile = async (req: Request) => {
  const {
    storeDescription,
    storeOpeningTime,
    storeClosingTime,
    storeAveragePrepTime,
  } = req.body;
  const { userId } = req.user;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  const updatedData: Record<string, any> = {
    storeDescription,
    storeOpeningTime,
    storeClosingTime,
    storeAveragePrepTime,
  };

  deleteFalsyField(updatedData);
  const existingUser = await User.findById(userId).lean();

  if (!existingUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  let replaceStoreLogo = false;
  let replaceStoreBannerImage = false;

  if (files?.store_logo) {
    updatedData.store_logo = files.store_logo[0].path;
    replaceStoreLogo = true;
  }

  if (files?.store_banner_image) {
    updatedData.store_banner_image = files.store_banner_image[0].path;
    replaceStoreBannerImage = true;
  }

  const [userFromDB] = await Promise.all([
    User.findByIdAndUpdate(userId, updatedData, {
      returnDocument: "after",
    }),
  ]);

  if (replaceStoreLogo && existingUser.store_logo) {
    unlinkFile(existingUser.store_logo);
  }

  if (replaceStoreBannerImage && existingUser.store_banner_image) {
    unlinkFile(existingUser.store_banner_image);
  }

  return userFromDB;
};

const updateMerchantDocument = async (req: Request) => {
  const { userId } = req.user;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  const updatedData: Record<string, any> = {};

  const existingUser = await User.findById(userId).lean();

  if (!existingUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }
  if (existingUser.role !== EnumUserRole.MERCHANT) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }

  let replaceStoreFrontImage = false;
  let replaceTradeLicenseDocument = false;
  let replaceMerchantIdCardImage = false;

  if (files?.store_front_image) {
    updatedData.store_front_image = files.store_front_image[0].path;
    replaceStoreFrontImage = true;
  }

  if (files?.trade_license_document) {
    updatedData.trade_license_document = files.trade_license_document[0].path;
    replaceTradeLicenseDocument = true;
  }

  if (files?.merchant_id_card_image) {
    updatedData.merchant_id_card_image = files.merchant_id_card_image[0].path;
    replaceMerchantIdCardImage = true;
  }

  const [userFromDB] = await Promise.all([
    User.findByIdAndUpdate(userId, updatedData, {
      returnDocument: "after",
    }),
  ]);

  if (replaceStoreFrontImage && existingUser.store_front_image) {
    unlinkFile(existingUser.store_front_image);
  }

  if (replaceTradeLicenseDocument && existingUser.trade_license_document) {
    unlinkFile(existingUser.trade_license_document);
  }

  if (replaceMerchantIdCardImage && existingUser.merchant_id_card_image) {
    unlinkFile(existingUser.merchant_id_card_image);
  }

  return userFromDB;
};

const updateStoreSettings = async (
  userData: any,
  payload: Record<string, any>,
) => {
  if (userData.role !== "MERCHANT") {
    throw new ApiError(
      status.FORBIDDEN,
      "Only merchants can update store settings",
    );
  }

  const updateData: Record<string, any> = {};

  if (payload.businessHours !== undefined)
    updateData.businessHours = payload.businessHours;
  if (payload.storeDeliveryRadius !== undefined)
    updateData.storeDeliveryRadius = Number(payload.storeDeliveryRadius);
  if (payload.storeMinimumOrder !== undefined)
    updateData.storeMinimumOrder = Number(payload.storeMinimumOrder);
  if (payload.storePhoneNumber !== undefined)
    updateData.storePhoneNumber = payload.storePhoneNumber;
  if (payload.storeSupportEmail !== undefined)
    updateData.storeSupportEmail = payload.storeSupportEmail;
  if (typeof payload.storeIsOpen === "boolean")
    updateData.storeIsOpen = payload.storeIsOpen;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(status.BAD_REQUEST, "No valid fields to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userData.userId,
    updateData,
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  return updatedUser;
};

const submitDriverApplication = async (
  userData: any,
  payload: Record<string, any>,
) => {
  if (userData.role !== "DRIVER") {
    throw new ApiError(
      status.FORBIDDEN,
      "Only drivers can submit applications",
    );
  }

  const user = await User.findById(userData.userId);
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  // Validate required fields
  if (!payload.vehicleType) {
    throw new ApiError(status.BAD_REQUEST, "Vehicle type is required");
  }

  // Check required documents are uploaded
  if (!user.drivingLicense_image) {
    throw new ApiError(status.BAD_REQUEST, "Driving license image is required");
  }
  if (!user.idCard_image) {
    throw new ApiError(status.BAD_REQUEST, "ID card image is required");
  }
  if (!user.vehicleRegistration_image) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Vehicle registration image is required",
    );
  }

  user.vehicleType = payload.vehicleType;
  if (payload.licenseNumber) user.licenseNumber = payload.licenseNumber;
  if (payload.plateNumber) user.plateNumber = payload.plateNumber;
  user.applicationStatus = "pending";
  await user.save();

  // Notify admin (toId = null routes to AdminNotification)
  await postNotification(
    "New Driver Application",
    `Driver ${user.name} has submitted an application for review`,
    null,
  );

  return {
    message: "Application submitted successfully. Pending admin review.",
  };
};

const UserService = {
  getProfile,
  deleteMyAccount,
  updateProfile,
  updateDriverInformation,
  updateMerchantBusinessInformation,
  updateMerchantStoreLocation,
  updateMerchantStoreProfile,
  updateMerchantDocument,
  updateStoreSettings,
  submitDriverApplication,
};

export { UserService };
