import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    itemName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    image: { 
      type: String, 
      default: "" 
    },
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    category: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Category", 
      required: true 
    },
    description: { 
      type: String, 
      default: "" 
    },
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", menuItemSchema);

