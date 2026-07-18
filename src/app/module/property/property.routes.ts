import express from "express";
import auth from "../../middleware/auth";
import { PropertyController } from "./property.controller";
import { uploadFile } from "../../middleware/fileUploader";
import config from "../../../config";

const router = express.Router();

router
  .post(
    "/add-property",
    auth(config.auth_level.property_host),
    uploadFile(),
    PropertyController.addProperty,
  )
  .get(
    "/get-properties",
    auth(config.auth_level.property_host),
    PropertyController.getProperties,
  )
  .get(
    "/get-property",
    auth(config.auth_level.property_host),
    PropertyController.getProperty,
  )
  .patch(
    "/update-property",
    auth(config.auth_level.property_host),
    uploadFile(),
    PropertyController.updateProperty,
  )
  .delete(
    "/delete-property",
    auth(config.auth_level.property_host),
    PropertyController.deleteProperty,
  )
  .get(
    "/resolve-code",
    auth(config.auth_level.all),
    PropertyController.resolveCode,
  )
  .patch(
    "/update-delivery-rules",
    auth(config.auth_level.property_host),
    PropertyController.updateDeliveryRules,
  )
  .get(
    "/dashboard-stats",
    auth(config.auth_level.property_host),
    PropertyController.getDashboardStats,
  )
  .patch(
    "/approve-request",
    auth(config.auth_level.property_host),
    PropertyController.approveRequest,
  )
  .patch(
    "/reject-request",
    auth(config.auth_level.property_host),
    PropertyController.rejectRequest,
  )
  .get(
    "/pending-requests",
    auth(config.auth_level.property_host),
    PropertyController.getPendingRequests,
  )
  .get(
    "/scheduled-requests",
    auth(config.auth_level.property_host),
    PropertyController.getScheduledRequests,
  )
  .get(
    "/delivered-requests",
    auth(config.auth_level.property_host),
    PropertyController.getDeliveredRequests,
  );

export = router;
