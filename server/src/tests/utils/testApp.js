/**
 * Test-only Express application.
 * Mirrors the real server.js but without DB connection or socket.io.
 * Used by supertest in route-level integration tests.
 */
const express = require("express");

const authRoutes = require("../../routes/auth.routes");
const studentRoutes = require("../../routes/student.routes");
const cocoRoutes = require("../../routes/coco.routes");
const adminRoutes = require("../../routes/admin.routes");
const companyRoutes = require("../../routes/company.routes");
const queueRoutes = require("../../routes/queue.routes");
const { errorHandler, notFound } = require("../../middlewares/error.middleware");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/coco", cocoRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/company", companyRoutes);
  app.use("/api/queue", queueRoutes);

  app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date() }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
