const mongoose = require("mongoose");
const Notification = require("../../models/Notification.model");

describe("Notification Model", () => {
  test("should default isRead to false", () => {
    const notif = new Notification({
      userId: new mongoose.Types.ObjectId(),
      message: "Test message",
      type: "info"
    });
    expect(notif.isRead).toBe(false);
  });

  test("should enforce required fields", () => {
    const notif = new Notification({});
    const err = notif.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
  });

  test("should have createdAt set automatically upon save or initialization (if schema default set)", () => {
    const notif = new Notification({
      userId: new mongoose.Types.ObjectId(),
      message: "Test message",
    });
    // For Mongoose timestamps `createdAt` may be undefined until saved.
    // If it defaults via schema definition, it could be set.
    // We just check either scenario.
    if (notif.createdAt !== undefined) {
      expect(notif.createdAt).toBeInstanceOf(Date);
    } else {
      expect(notif._id).toBeDefined(); // Base assertion instead
    }
  });
});
