import express, { Request, Response } from "express";
import cors from "cors";
import { handleWebhook } from "./app/module/payment/payment.webhook";
import globalErrorHandler from "./app/middleware/globalErrorHandler";
import routes from "./app/routes";
import NotFoundHandler from "./error/NotFoundHandler";
import cookieParser from "cookie-parser";
import corsOptions from "./util/corsOptions";

const app = express();

app.use(cors(corsOptions));
app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use("/", routes);

app.get("/", async (req: Request, res: Response) => {
  res.json("Welcome to Fridge Fillers");
});

app.use(globalErrorHandler);
app.use(NotFoundHandler.handle);

export = app;
