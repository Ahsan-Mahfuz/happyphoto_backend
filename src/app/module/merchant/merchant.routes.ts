import express from "express";
import auth from "../../middleware/auth";
import { MerchantController } from "./merchant.controller";
import config from "../../../config";

const router = express.Router();

// Every route here is scoped to the caller's own store via req.user.userId.
router
  .get(
    "/dashboard",
    auth(config.auth_level.merchant),
    MerchantController.getDashboardStats,
  )
  .get(
    "/analytics",
    auth(config.auth_level.merchant),
    MerchantController.getAnalytics,
  )
  .get(
    "/my-customers",
    auth(config.auth_level.merchant),
    MerchantController.getMyCustomers,
  )
  .get(
    "/inventory",
    auth(config.auth_level.merchant),
    MerchantController.getInventory,
  )
  .get(
    "/low-stock",
    auth(config.auth_level.merchant),
    MerchantController.getLowStockProducts,
  );

export = router;
