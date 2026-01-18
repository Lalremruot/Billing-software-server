import { Server } from "socket.io";

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          "http://localhost:9000",
          "http://localhost:5173",
          "https://lamkabill.netlify.app",
          "http://192.168.29.109:9000",
          process.env.CLIENT_URL
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.includes(allowed))) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for now
        }
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle user authentication/room joining
    socket.on("join-restaurant", (userId) => {
      if (userId) {
        socket.join(`restaurant-${userId}`);
        console.log(`Socket ${socket.id} joined restaurant-${userId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitNewOrder = (userId, order) => {
  const socketIO = getIO();
  socketIO.to(`restaurant-${userId}`).emit("new-order", {
    order,
    timestamp: new Date().toISOString(),
  });
  console.log(`Emitted new order to restaurant-${userId}:`, order._id);
};

export const emitOrderUpdate = (userId, order) => {
  const socketIO = getIO();
  socketIO.to(`restaurant-${userId}`).emit("order-updated", {
    order,
    timestamp: new Date().toISOString(),
  });
  console.log(`Emitted order update to restaurant-${userId}:`, order._id);
};

