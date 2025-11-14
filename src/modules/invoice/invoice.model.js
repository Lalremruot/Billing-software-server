import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invoiceNumber: { type: String },
  invoiceDate: { type: String, required: true },
  invoiceDueDate: { type: String, required: false },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },
  status: {
    type: String,
    enum: ["draft", "final"],
    default: "draft",
  },
  paymentMode: {
    type: String,
    enum: ["online", "cash"],
    default: "cash",
  },
  customerAddress: { type: String, required: true },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      total: { type: Number, required: true },
    },
  ],
}, { timestamps: true });

invoiceSchema.pre("save", function (next) {
  const invoice = this;
  if (invoice.status === "final" && !invoice.invoiceNumber) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    invoice.invoiceNumber = `INV#${randomNum}`;
  }
  next();
});


invoiceSchema.pre("validate", function (next) {
  this.items.forEach((item) => {
    if (!item.total) item.total = item.quantity * item.price;
  });
  next();
});

export default mongoose.model("Invoice", invoiceSchema);
