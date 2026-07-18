const { default: status } = require("http-status");
import fs from "fs/promises";
import ApiError from "../error/ApiError";
import { errorLogger } from "./logger";

const unlinkFile = async (filePath: string): Promise<boolean> => {
  try {
    if (!filePath) {
      throw new ApiError(status.BAD_REQUEST, "File path is required");
    }

    // 2. Properly await the access check
    await fs.access(filePath);

    // 3. Properly await the actual file deletion
    await fs.unlink(filePath);

    return true;
  } catch (error) {
    // Rethrow so the caller knows the unlink failed.
    errorLogger.error("Error unlinking file:", error);
    throw error;
  }
};

export = unlinkFile;
