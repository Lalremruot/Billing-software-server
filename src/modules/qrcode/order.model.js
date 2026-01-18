import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    tableId: { 
      type: String, 
      required: true, 
      trim: true 
    },
    tableName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    items: [
      {
        menuItemId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "MenuItem", 
          required: true 
        },
        itemName: { 
          type: String, 
          required: true 
        },
        quantity: { 
          type: Number, 
          required: true, 
          min: 1 
        },
        price: { 
          type: Number, 
          required: true, 
          min: 0 
        },
        total: { 
          type: Number, 
          required: true, 
          min: 0 
        },
      },
    ],
    totalAmount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
      default: "pending",
    },
    customerName: { 
      type: String, 
      default: "" 
    },
    customerPhone: { 
      type: String, 
      default: "" 
    },
    notes: { 
      type: String, 
      default: "" 
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

