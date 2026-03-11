const { Server } = require("socket.io");
const { CLIENT_URL } = require("./env");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room for a specific company queue
    socket.on("join:company", (companyId) => {
      socket.join(`company:${companyId}`);
    });

    // Join personal notification room
    socket.on("join:user", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIO };
