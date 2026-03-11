const Notification = require("../models/Notification.model");
const { SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");

const sendNotification = async ({ recipientId, senderId, companyId, message, type = "general" }) => {
  const notif = await Notification.create({ recipientId, senderId, companyId, message, type });

  try {
    getIO().to(`user:${recipientId}`).emit(SOCKET_EVENTS.NOTIFICATION_SENT, notif);
  } catch (_) {}

  return notif;
};

module.exports = { sendNotification };
