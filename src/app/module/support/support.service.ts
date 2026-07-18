const { default: status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import Counter from "../order/Counter";
import postNotification from "../../../util/postNotification";
import { EnumUserRole } from "../../../util/enum";
import {
  SupportTicket,
  EnumTicketStatus,
  EnumTicketCategory,
} from "./SupportTicket";

/**
 * Reserves the next ticket number. Done here rather than in a pre("save") hook
 * because Mongoose runs schema validation before later-registered save hooks,
 * which makes hook-generated required ids brittle.
 */
const nextTicketId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "ticketId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `TKT-${counter.seq}`;
};

const createTicket = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["subject", "category", "description"]);

  if (!Object.values(EnumTicketCategory).includes(payload.category)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `category must be one of: ${Object.values(EnumTicketCategory).join(", ")}`,
    );
  }

  const ticket = await SupportTicket.create({
    ticketId: await nextTicketId(),
    user: userData.userId,
    role: userData.role,
    subject: payload.subject,
    category: payload.category,
    description: payload.description,
    status: EnumTicketStatus.OPEN,
  });

  // Admins have no per-user inbox, so this lands in the shared admin feed.
  await postNotification(
    "New Support Ticket",
    `${ticket.ticketId}: ${ticket.subject}`,
  );

  return ticket;
};

const getMyTickets = async (userData: AuthUserPayload, query: QueryParams) => {
  const ticketQuery = new QueryBuilder(
    SupportTicket.find({ user: userData.userId }),
    query,
  )
    .search(["ticketId", "subject", "description"])
    .filter()
    .sort()
    .paginate();

  const [tickets, meta] = await Promise.all([
    ticketQuery.modelQuery,
    ticketQuery.countTotal(),
  ]);

  return { meta, tickets };
};

const getAllTickets = async (query: QueryParams) => {
  const ticketQuery = new QueryBuilder(
    SupportTicket.find().populate("user", "name email storeName profile_image"),
    query,
  )
    .search(["ticketId", "subject", "description"])
    .filter()
    .sort()
    .paginate();

  const [tickets, meta] = await Promise.all([
    ticketQuery.modelQuery,
    ticketQuery.countTotal(),
  ]);

  return { meta, tickets };
};

const replyToTicket = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["ticketId", "reply"]);

  const ticket = await SupportTicket.findById(payload.ticketId);
  if (!ticket) throw new ApiError(status.NOT_FOUND, "Ticket not found");

  ticket.adminReply = payload.reply;
  ticket.repliedBy = userData.userId as any;
  ticket.repliedAt = new Date();
  ticket.status = payload.status ?? EnumTicketStatus.RESOLVED;

  if (!Object.values(EnumTicketStatus).includes(ticket.status)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `status must be one of: ${Object.values(EnumTicketStatus).join(", ")}`,
    );
  }

  await ticket.save();

  await postNotification(
    "Support Ticket Updated",
    `Your ticket ${ticket.ticketId} has a reply from support.`,
    ticket.user,
  );

  return ticket;
};

const updateTicketStatus = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["ticketId", "status"]);

  if (!Object.values(EnumTicketStatus).includes(payload.status)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `status must be one of: ${Object.values(EnumTicketStatus).join(", ")}`,
    );
  }

  const ticket = await SupportTicket.findById(payload.ticketId);
  if (!ticket) throw new ApiError(status.NOT_FOUND, "Ticket not found");

  // The raiser may close their own ticket; anything else is admin-only.
  const isOwner = ticket.user.toString() === userData.userId;
  const isAdmin = userData.role === EnumUserRole.ADMIN;

  if (!isAdmin && !(isOwner && payload.status === EnumTicketStatus.CLOSED)) {
    throw new ApiError(
      status.FORBIDDEN,
      "You can only close your own tickets",
    );
  }

  ticket.status = payload.status;
  await ticket.save();
  return ticket;
};

const SupportService = {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyToTicket,
  updateTicketStatus,
};

export { SupportService };
