import mongoose from "mongoose";
import mongooseGlobalPlugin from "../utils/sanitize.js";

mongoose.plugin(mongooseGlobalPlugin);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.log("❌ MongoDB Connection Failed");
  }
};
