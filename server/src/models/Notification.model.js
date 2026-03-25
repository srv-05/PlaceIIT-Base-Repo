const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel" },
    senderModel: { type: String, enum: ["Student", "User"], default: "User" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    source: { type: String, enum: ["student", "apc", "system"], default: "system" },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["queue_update", "interview_call", "status_update", "general", "info", "warning"],
      default: "general",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
