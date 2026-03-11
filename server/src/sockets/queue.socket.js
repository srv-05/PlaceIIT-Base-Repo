// This file extends socket event handling beyond the base config/socket.js
// Import and call this in server.js after initSocket if you need custom handlers

const { SOCKET_EVENTS } = require("../utils/constants");
const queueService = require("../services/queue.service");

const registerQueueSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    // CoCo or admin requests live queue snapshot
    socket.on("queue:fetch", async ({ companyId }) => {
      try {
        const queue = await queueService.getQueue(companyId);
        socket.emit("queue:snapshot", { companyId, queue });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });
  });
};

module.exports = { registerQueueSocketHandlers };
