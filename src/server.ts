import * as Sentry from "@sentry/node";
import { logger, errorLogger } from "./util/logger";
import connectDB from "./connection/connectDB";
import seedAdmin from "./connection/seedAdmin";
import config from "./config";
import mainServer from "./connection/socket";

// Optional crash/error reporting — Sentry.init with an empty dsn is a
// documented no-op (doesn't throw, doesn't send), so this is safe whether or
// not SENTRY_DSN is set.
Sentry.init({ dsn: config.sentry_dsn || "" });

async function main() {
  try {
    await connectDB();
    logger.info(`DB Connected Successfully at ${new Date().toLocaleString()}`);

    await seedAdmin();

    mainServer.listen(Number(config.port), config.base_url, () => {
      logger.info(`App listening on http://${config.base_url}:${config.port}`);
    });

    process.on("unhandledRejection", (error) => {
      Sentry.captureException(error);
      errorLogger.error("Unhandled Rejection:", error);
    });

    process.on("uncaughtException", (error) => {
      Sentry.captureException(error);
      errorLogger.error("Uncaught Exception:", error);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received");
    });
  } catch (err) {
    errorLogger.error("Main Function Error:", err);
  }
}

main();
