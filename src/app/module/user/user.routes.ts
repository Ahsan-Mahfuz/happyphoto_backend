import express from "express";
import auth from "../../middleware/auth";
import { uploadFile } from "../../middleware/fileUploader";
import { UserController } from "./user.controller";
import config from "../../../config";

const router = express.Router();

router
  .get("/profile", auth(config.auth_level.all), UserController.getProfile)
  .patch(
    "/edit-profile",
    auth(config.auth_level.all),
    uploadFile(),
    UserController.updateProfile,
  )
  .delete(
    "/delete-account",
    auth(config.auth_level.all),
    UserController.deleteMyAccount,
  )
  .patch(
    "/update-driver-information",
    auth(config.auth_level.driver),
    uploadFile(),
    UserController.updateDriverInformation,
  )
  .patch(
    "/update-merchant-business-information",
    auth(config.auth_level.merchant),
    UserController.updateMerchantBusinessInformation,
  )
  .patch(
    "/update-merchant-store-location",
    auth(config.auth_level.merchant),
    UserController.updateMerchantStoreLocation,
  )
  .patch(
    "/update-merchant-store-profile",
    auth(config.auth_level.merchant),
    uploadFile(),
    UserController.updateMerchantStoreProfile,
  )
  .patch(
    "/update-merchant-documents",
    auth(config.auth_level.merchant),
    uploadFile(),
    UserController.updateMerchantDocument,
  )
  .patch(
    "/update-store-settings",
    auth(config.auth_level.merchant),
    UserController.updateStoreSettings,
  )
  .patch(
    "/submit-driver-application",
    auth(config.auth_level.driver),
    UserController.submitDriverApplication,
  );

export = router;
