import dotenv from "dotenv";
dotenv.config() 
import express from "express"
import cors from "cors"
import { createServer } from "http";
import { connectDB } from "./src/config/db.js";
import { initializeSocket } from "./src/socket/socketServer.js";
import userAuthRoute from "./src/modules/user/user.routes.js"
import invoiceRoute from "./src/modules/invoice/invoice.routes.js"
import productRoute from "./src/modules/product/product.routes.js"
import createCashierRoute from "./src/modules/cashier/cashier.routes.js"
import employeeRoute from "./src/modules/employee/employee.routes.js"
import expensesRoute from "./src/modules/expenses/expenses.routes.js"
import qrcodeRoute from "./src/modules/qrcode/qrcode.routes.js"

const PORT = process.env.PORT

connectDB();

console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);
console.log("Loaded SECRET_KEY:", process.env.SECRET_KEY ? `${process.env.SECRET_KEY.substring(0, 2)}***` : "NOT SET (using default: dev2024)");

const app = express();
app.use(express.json())

app.use((req, _, next) => {
  console.log("➡️ Tenant header:", req.headers["x-tenant-domain"]);
  console.log("➡️ Request hostname:", req.hostname);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      "http://localhost:9000",
      "http://localhost:5173",
      "https://lamkabill.netlify.app",
      "https://arsicloudkitchen.in",
      "https://emveerest.emveemart.com",
      "http://192.168.1.5:9000",
      "http://192.168.29.110:9000",
      process.env.CLIENT_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      // For public endpoints, allow all origins
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Secret-Key", "X-Tenant-Domain"],
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
app.use("/api/expenses", expensesRoute)
app.use("/api/qrcode", qrcodeRoute)


// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Server is listening on PORT ${PORT}`)
    console.log(`Socket.io server initialized`)
})



