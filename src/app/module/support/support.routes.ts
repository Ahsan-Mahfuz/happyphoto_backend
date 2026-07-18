import express from "express";
import auth from "../../middleware/auth";
import { SupportController } from "./support.controller";
import config from "../../../config";

const router = express.Router();

router
  // Any signed-in participant can raise a ticket, not just merchants.
  .post(
    "/create-ticket",
    auth(config.auth_level.all),
    SupportController.createTicket,
  )
  .get("/my-tickets", auth(config.auth_level.all), SupportController.getMyTickets)
  .patch(
    "/update-status",
    auth(config.auth_level.all),
    SupportController.updateTicketStatus,
  )
  .get(
    "/all-tickets",
    auth(config.auth_level.admin),
    SupportController.getAllTickets,
  )
  .patch(
    "/reply",
    auth(config.auth_level.admin),
    SupportController.replyToTicket,
  );

export = router;
