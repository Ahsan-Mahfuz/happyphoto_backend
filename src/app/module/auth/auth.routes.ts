import express from "express";
import auth from "../../middleware/auth";
import { AuthController } from "../auth/auth.controller";
import config from "../../../config";
import limiter from "../../middleware/limiter";

const router = express.Router();

router
  .post("/register", limiter, AuthController.registrationAccount)
  .post("/login", limiter, AuthController.loginAccount)
  .post("/refresh-token", limiter, AuthController.refreshToken)
  .post("/activate-account", limiter, AuthController.activateAccount)
  .post(
    "/activation-code-resend",
    limiter,
    AuthController.resendActivationCode,
  )
  .post("/forgot-password", limiter, AuthController.forgotPass)
  .post("/forget-pass-otp-verify", limiter, AuthController.forgetPassOtpVerify)
  .post("/reset-password", limiter, AuthController.resetPassword)
  .patch(
    "/change-password",
    auth(config.auth_level.all),
    AuthController.changePassword,
  );

export = router;
