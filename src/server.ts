import { logger, errorLogger } from "./util/logger";
import connectDB from "./connection/connectDB";
import seedAdmin from "./connection/seedAdmin";
import config from "./config";
import mainServer from "./connection/socket";

async function main() {
  try {
    await connectDB();
    logger.info(`DB Connected Successfully at ${new Date().toLocaleString()}`);

    await seedAdmin();

    const port = Number(process.env.PORT || config.port) || 8001;
    mainServer.listen(port, "0.0.0.0", () => {
      logger.info(`App listening on http://0.0.0.0:${port}`);
    });

    process.on("unhandledRejection", (error) => {
      errorLogger.error("Unhandled Rejection:", error);
    });

    process.on("uncaughtException", (error) => {
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
