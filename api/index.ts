import mongoose from "mongoose";
import app from "../src/app";
import connectDB from "../src/connection/connectDB";

let isConnected = false;

async function ensureDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await connectDB();
  isConnected = true;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureDB();
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel handler error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
}
