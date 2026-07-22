import mongoose from "mongoose";
import config from "../config";

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }
    await mongoose.connect(config.database_url);
    console.log(`DB connection successful! at ${new Date().toLocaleString()}`);
    return mongoose;
  } catch (err) {
    console.error("DB Connection Error:", err);
    throw err;
  }
};

export = connectDB;
