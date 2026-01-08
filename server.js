import dotenv from "dotenv";
dotenv.config() 
import express from "express"
import cors from "cors"
import { connectDB } from "./src/config/db.js";
import userAuthRoute from "./src/modules/user/user.routes.js"
import invoiceRoute from "./src/modules/invoice/invoice.routes.js"
import productRoute from "./src/modules/product/product.routes.js"
import createCashierRoute from "./src/modules/cashier/cashier.routes.js"
import employeeRoute from "./src/modules/employee/employee.routes.js"
import inventoryRoute from "./src/modules/inventory/inventory.routes.js"

const PORT = process.env.PORT

connectDB();

console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

const app = express();
app.use(express.json())

app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

console.log("CLIENT_URL:", process.env.CLIENT_URL);


app.use("/uploads", express.static("src/uploads"));

app.get("/test", (req, res) => {
  res.send("VERY VERY GOOD KIND2")
})
app.use("/api/auth/user", userAuthRoute)
app.use("/api/invoice", invoiceRoute)
app.use("/api/product", productRoute)
app.use("/api/cashier", createCashierRoute)
app.use("/api/employee", employeeRoute)
app.use("/api/inventory", inventoryRoute)


app.listen(PORT, () => {
    console.log(`Server is listening on PORT ${PORT}`)
})



