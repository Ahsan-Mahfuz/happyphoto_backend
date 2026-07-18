import express from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import ProductController from "./product.controller";
import { uploadFile } from "../../middleware/fileUploader";

const router = express.Router();

router
  .post(
    "/post-product",
    auth(config.auth_level.merchant),
    uploadFile(),
    ProductController.createProduct,
  )
  .get(
    "/get-product",
    auth(config.auth_level.all),
    ProductController.getProduct,
  )
  .get(
    "/get-all-products",
    auth(config.auth_level.all),
    ProductController.getAllProducts,
  )
  .patch(
    "/update-product",
    auth(config.auth_level.merchant),
    uploadFile(),
    ProductController.updateProduct,
  )
  .delete(
    "/delete-product",
    auth(config.auth_level.merchant),
    ProductController.deleteProduct,
  );

export default router;
