const { status } = require("http-status");
import type { NextFunction, Request, Response } from "express";
import config from "../../config";
import ApiError from "../../error/ApiError";
import { jwtHelpers } from "../../util/jwtHelpers";
import Auth from "../module/auth/Auth";
import type { AuthUserPayload } from "../../types/auth.types";

const auth =
  (roles: string[], isAccessible = true) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;
      if (!tokenWithBearer && !isAccessible) return next();
      if (!tokenWithBearer) {
        throw new ApiError(
          status.UNAUTHORIZED,
          "You are not authorized for this role",
        );
      }
      if (!tokenWithBearer.startsWith("Bearer ")) {
        throw new ApiError(status.UNAUTHORIZED, "Invalid token format");
      }

      const token = tokenWithBearer.slice("Bearer ".length).trim();
      if (!token) {
        throw new ApiError(status.UNAUTHORIZED, "Invalid token format");
      }

      const verifyUser = jwtHelpers.verifyToken<AuthUserPayload>(
        token,
        config.jwt.secret,
      );
      req.user = verifyUser;

      const isExist = await Auth.findById(verifyUser.authId);
      if (!isExist) {
        throw new ApiError(status.UNAUTHORIZED, "You are not authorized");
      }

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(
          status.FORBIDDEN,
          "Access Forbidden: You do not have permission to perform this action",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export = auth;
