import mongoose from "mongoose";


const productSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productName: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);


export default mongoose.model("Product", productSchema)