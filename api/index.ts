import type { VercelRequest, VercelResponse } from "@vercel/node";
import mongoose from "mongoose";

let cachedApp: any = null;
let cachedConnection: typeof mongoose | null = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  const { default: connectDB } = await import(
    "../src/connection/connectDB"
  );
  if (!cachedConnection || mongoose.connection.readyState !== 1) {
    cachedConnection = await connectDB();
  }
  const { default: app } = await import("../src/app");
  cachedApp = app;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel handler error:", error);
    res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
}
