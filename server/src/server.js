const http = require("http");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { initSocket } = require("./config/socket");
const { PORT, CLIENT_URL } = require("./config/env");
const { errorHandler, notFound } = require("./middlewares/error.middleware");
const { registerQueueSocketHandlers } = require("./sockets/queue.socket");

// Routes
const authRoutes = require("./routes/auth.routes");
const studentRoutes = require("./routes/student.routes");
const cocoRoutes = require("./routes/coco.routes");
const adminRoutes = require("./routes/admin.routes");
const companyRoutes = require("./routes/company.routes");
const queueRoutes = require("./routes/queue.routes");

// Init
connectDB();
const app = express();
const server = http.createServer(app);
const io = initSocket(server);
registerQueueSocketHandlers(io);

// Middlewares
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/coco", cocoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/queue", queueRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date() }));

// Error handling
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
