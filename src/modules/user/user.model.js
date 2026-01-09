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
      default: "ACK#",
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "cashier"],
      default: "cashier",
    },

    permissions: {
      type: [String], // Only used for cashier
      default: [],
    },
    resetToken: String,
    resetTokenExpire: Date,
    expiryDate: {
      type: Date,
      default: function() {
        // Default to 1 year from now if not provided
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
