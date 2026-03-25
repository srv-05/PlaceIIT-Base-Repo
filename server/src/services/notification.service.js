const Notification = require("../models/Notification.model");
const { SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");

const sendNotification = async ({ recipientId, senderId, senderModel = "User", source = "system", companyId, message, type = "general" }) => {
  const notif = await Notification.create({ recipientId, senderId, senderModel, source, companyId, message, type });

  try {
    getIO().to(`user:${recipientId}`).emit(SOCKET_EVENTS.NOTIFICATION_SENT, notif);
  } catch (_) {}

  return notif;
};

module.exports = { sendNotification };
