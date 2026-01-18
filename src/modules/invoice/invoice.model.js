import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  invoiceNumber: { type: String },
  invoiceDate: { type: String, required: true },
  invoiceDueDate: { type: String, required: false },
  customerName: { type: String, required: false },
  customerEmail: { type: String, required: false },
  customerPhone: { type: String, required: false },
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
  customerAddress: { type: String, required: false },
  tableNumber: { type: Number, required: false, min: 1, max: 15 },
  withPackaging: { type: Boolean, default: false },
  deliveryAddress: { type: String, required: false },
  deliveryCharge: { type: Number, default: 0, min: 0 },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      total: { type: Number, required: true },
    },
  ],
}, { timestamps: true });

invoiceSchema.pre("save", async function (next) {
  const invoice = this;
  if (invoice.status === "final" && !invoice.invoiceNumber) {
    try {
      const highestInvoice = await this.constructor
        .findOne({ user: invoice.user, invoiceNumber: { $exists: true, $ne: null } })
        .sort({ invoiceNumber: -1 })
        .select("invoiceNumber");

      let nextNumber = 1;
      
      if (highestInvoice && highestInvoice.invoiceNumber) {
        // Extract numeric part from invoice number (e.g., "INV#00001" -> 1)
        const match = highestInvoice.invoiceNumber.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Format with leading zeros (5 digits: 00001, 00002, etc.)
      const formattedNumber = String(nextNumber).padStart(5, "0");
      invoice.invoiceNumber = `INV${formattedNumber}`;
    } catch (error) {
      // If error occurs, fallback to timestamp-based number
      const fallbackNumber = String(Date.now()).slice(-5).padStart(5, "0");
      invoice.invoiceNumber = `INV${fallbackNumber}`;
    }
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
