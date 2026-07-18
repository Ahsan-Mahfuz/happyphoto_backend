import Notification from "../app/module/notification/Notification";
import AdminNotification from "../app/module/notification/AdminNotification";
import { Types } from "mongoose";
import { errorLogger } from "./logger";

const postNotification = async (
  title: string,
  message: string,
  toId: string | Types.ObjectId | null = null,
): Promise<void> => {
  if (!title || !message) {
    throw new Error("Missing required fields: title, or message");
  }

  try {
    if (!toId) {
      await AdminNotification.create({ title, message });
    } else {
      await Notification.create({ toId, title, message });
    }
  } catch (error) {
    errorLogger.error("Failed to post notification:", error);
  }
};

export = postNotification;
