import express from "express";
import auth from "../../middleware/auth";
import { CartController } from "./cart.controller";
import config from "../../../config";

const router = express.Router();

router
  .get("/get-cart", auth(config.auth_level.user), CartController.getCart)
  .post("/add-item", auth(config.auth_level.user), CartController.addItem)
  .patch(
    "/update-item",
    auth(config.auth_level.user),
    CartController.updateItem,
  )
  .delete(
    "/remove-item",
    auth(config.auth_level.user),
    CartController.removeItem,
  )
  .delete("/clear-cart", auth(config.auth_level.user), CartController.clearCart)
  .patch(
    "/set-property-code",
    auth(config.auth_level.user),
    CartController.setPropertyCode,
  );

export = router;
