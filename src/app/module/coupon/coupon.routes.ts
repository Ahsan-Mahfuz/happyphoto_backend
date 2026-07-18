import express from "express";
import auth from "../../middleware/auth";
import { CouponController } from "./coupon.controller";
import config from "../../../config";

const router = express.Router();

router
  .post(
    "/create-coupon",
    auth(config.auth_level.merchant),
    CouponController.createCoupon,
  )
  .get(
    "/my-coupons",
    auth(config.auth_level.merchant),
    CouponController.getMyCoupons,
  )
  .patch(
    "/update-coupon",
    auth(config.auth_level.merchant),
    CouponController.updateCoupon,
  )
  .delete(
    "/delete-coupon",
    auth(config.auth_level.merchant),
    CouponController.deleteCoupon,
  )
  // Customers need to check a code against a store before checkout.
  .get("/validate", auth(config.auth_level.all), CouponController.validateCoupon);

export = router;
