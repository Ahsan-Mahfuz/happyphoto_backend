import { Schema, Types, model } from "mongoose";

const EnumTicketStatus = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

const EnumTicketCategory = {
  ORDERS: "orders",
  PAYMENTS: "payments",
  PRODUCTS: "products",
  ACCOUNT: "account",
  TECHNICAL: "technical",
  OTHER: "other",
};

interface ISupportTicket {
  _id: Types.ObjectId;
  ticketId: string;
  user: Types.ObjectId;
  role: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  adminReply?: string;
  repliedBy?: Types.ObjectId;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: {
      type: String,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Snapshot of the raiser's role, so admin can triage without a join.
    role: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(EnumTicketCategory),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EnumTicketStatus),
      default: EnumTicketStatus.OPEN,
    },
    adminReply: {
      type: String,
    },
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    repliedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

SupportTicketSchema.index({ user: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1 });

const SupportTicket = model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export { SupportTicket, ISupportTicket, EnumTicketStatus, EnumTicketCategory };
