import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    invoicePrefix: {
      type: String,
      default: "INV#",
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetToken: String,
    resetTokenExpire: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
