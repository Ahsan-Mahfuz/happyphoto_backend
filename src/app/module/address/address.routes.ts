import { Router } from "express";
import auth from "../../middleware/auth";
import { AddressController } from "./address.controller";
import config from "../../../config";

const router = Router();

router
  .post(
    "/add-address",
    auth(config.auth_level.all),
    AddressController.addAddress,
  )
  .get(
    "/get-addresses",
    auth(config.auth_level.all),
    AddressController.getAddresses,
  )
  .patch(
    "/update-address",
    auth(config.auth_level.all),
    AddressController.updateAddress,
  )
  .delete(
    "/delete-address",
    auth(config.auth_level.all),
    AddressController.deleteAddress,
  )
  .patch(
    "/set-default",
    auth(config.auth_level.all),
    AddressController.setDefaultAddress,
  );

export = router;
