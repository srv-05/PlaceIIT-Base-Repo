/**
 * BRANCH 8b: Notification Service Tests
 * Tests notification.service.js sendNotification
 */
const Notification = require("../../models/Notification.model");

jest.mock("../../models/Notification.model");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
  })),
}));

const notificationService = require("../../services/notification.service");

describe("Notification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendNotification", () => {
    test("should create notification and emit socket event", async () => {
      const mockNotif = {
        _id: "n1",
        recipientId: "user1",
        message: "Test notification",
        type: "general",
        isRead: false,
      };
      Notification.create.mockResolvedValue(mockNotif);

      const result = await notificationService.sendNotification({
        recipientId: "user1",
        senderId: "admin1",
        message: "Test notification",
        type: "general",
      });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: "user1",
          senderId: "admin1",
          message: "Test notification",
          type: "general",
        })
      );
      expect(result).toEqual(mockNotif);
    });

    test("should use default values for optional fields", async () => {
      Notification.create.mockResolvedValue({ _id: "n2" });

      await notificationService.sendNotification({
        recipientId: "user1",
        message: "Test",
      });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          senderModel: "User",
          source: "system",
          type: "general",
        })
      );
    });

    test("should not throw if socket emission fails", async () => {
      const { getIO } = require("../../config/socket");
      getIO.mockImplementation(() => {
        throw new Error("Socket not initialized");
      });
      Notification.create.mockResolvedValue({ _id: "n3" });

      // Should not throw
      const result = await notificationService.sendNotification({
        recipientId: "user1",
        message: "Test",
      });
      expect(result).toEqual({ _id: "n3" });
    });

    test("should handle all notification fields", async () => {
      Notification.create.mockResolvedValue({ _id: "n4" });

      await notificationService.sendNotification({
        recipientId: "user1",
        senderId: "sender1",
        senderModel: "Student",
        source: "student",
        companyId: "c1",
        queryId: "q1",
        message: "Full notification",
        type: "queue_update",
      });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: "user1",
          senderId: "sender1",
          senderModel: "Student",
          source: "student",
          companyId: "c1",
          queryId: "q1",
          message: "Full notification",
          type: "queue_update",
        })
      );
    });
  });
});
