import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
    },
    position: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);

