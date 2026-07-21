import express from "express";
import auth from "../../middleware/auth";
import { OrderController } from "./order.controller";
import { uploadFile } from "../../middleware/fileUploader";
import config from "../../../config";

const router = express.Router();

router
  // Customer
  .post(
    "/place-order",
    auth(config.auth_level.user),
    OrderController.placeOrder,
  )
  .get("/get-order", auth(config.auth_level.all), OrderController.getOrder)
  .get(
    "/get-my-orders",
    auth(config.auth_level.all),
    OrderController.getMyOrders,
  )
  .get("/track", auth(config.auth_level.user), OrderController.trackOrder)
  // Merchant
  .patch(
    "/accept-order",
    auth(config.auth_level.merchant),
    OrderController.acceptOrder,
  )
  .patch(
    "/update-status",
    auth(config.auth_level.merchant),
    OrderController.updateOrderStatus,
  )
  // Driver
  .get(
    "/active-orders",
    auth(config.auth_level.driver),
    OrderController.getActiveOrders,
  )
  .get(
    "/driver-history",
    auth(config.auth_level.driver),
    OrderController.getDriverHistory,
  )
  .get(
    "/pending-requests",
    auth(config.auth_level.driver),
    OrderController.getPendingDeliveryRequests,
  )
  .patch(
    "/assign-driver",
    auth(config.auth_level.admin),
    OrderController.assignDriver,
  )
  .patch(
    "/accept-delivery",
    auth(config.auth_level.driver),
    OrderController.acceptDelivery,
  )
  .patch("/picked-up", auth(config.auth_level.driver), OrderController.pickedUp)
  .patch(
    "/out-for-delivery",
    auth(config.auth_level.driver),
    OrderController.outForDelivery,
  )
  .patch(
    "/deliver",
    auth(config.auth_level.driver),
    uploadFile(),
    OrderController.deliver,
  )
  // Cancel (all roles)
  .patch(
    "/cancel-order",
    auth(config.auth_level.all),
    OrderController.cancelOrder,
  );

export = router;
