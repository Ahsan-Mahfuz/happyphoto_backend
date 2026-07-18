import { Router } from "express";
import auth from "../../middleware/auth";
import { ReviewController } from "./review.controller";
import config from "../../../config";

const router = Router();

router
  .post(
    "/post-review",
    auth(config.auth_level.all),
    ReviewController.postReview,
  )
  .get(
    "/get-all-reviews",
    auth(config.auth_level.all),
    ReviewController.getAllReviews,
  )
  .get("/get-review", auth(config.auth_level.all), ReviewController.getReview)
  .patch(
    "/update-review",
    auth(config.auth_level.all),
    ReviewController.updateReview,
  )
  .delete(
    "/delete-review",
    auth(config.auth_level.all),
    ReviewController.deleteReview,
  );

export = router;
