import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    totalPrice: {
      type: Number,
      
      min: 0,
    },
    dateAdded: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Inventory", inventorySchema);

