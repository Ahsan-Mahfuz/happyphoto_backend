const { default: status } = require("http-status");
import { Request, Response } from "express";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import { SupportService } from "./support.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user as AuthUserPayload;
};

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.createTicket(requireUser(req), req.body);
  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Ticket submitted successfully",
    data: result,
  });
});

const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getMyTickets(
    requireUser(req),
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Tickets retrieved",
    meta: result.meta,
    data: result.tickets,
  });
});

const getAllTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.getAllTickets(req.query as QueryParams);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Tickets retrieved",
    meta: result.meta,
    data: result.tickets,
  });
});

const replyToTicket = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.replyToTicket(requireUser(req), req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Reply sent successfully",
    data: result,
  });
});

const updateTicketStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportService.updateTicketStatus(
    requireUser(req),
    req.body,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Ticket status updated",
    data: result,
  });
});

const SupportController = {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyToTicket,
  updateTicketStatus,
};

export { SupportController };
