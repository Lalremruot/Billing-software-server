import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      default: "" 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

// Compound index to ensure category name is unique per user
categorySchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);

