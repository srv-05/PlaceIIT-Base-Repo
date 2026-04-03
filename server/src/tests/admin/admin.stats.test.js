/**
 * BRANCH 5c: Admin Stats Tests (already partially in users, this adds broadcast/queries)
 * Tests admin.controller.js getQueries, respondToQuery, sendBroadcastNotification
 */
const {
  getQueries, respondToQuery, sendBroadcastNotification,
} = require("../../controllers/admin.controller");
const User = require("../../models/User.model");

jest.mock("../../models/Company.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Apc.model");
jest.mock("../../models/ExcelUpload.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/Query.model");
jest.mock("../../services/excel.service");
jest.mock("../../services/allocation.service");
jest.mock("../../services/email.service");
jest.mock("../../services/apc.service");
jest.mock("../../services/coco.service");
jest.mock("../../services/notification.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Admin Controller - Stats & Queries", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "admin1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("sendBroadcastNotification", () => {
    test("should return 400 if message missing", async () => {
      req.body = { audience: "students" };
      await sendBroadcastNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if audience missing", async () => {
      req.body = { message: "Hello" };
      await sendBroadcastNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should send notifications to students", async () => {
      req.body = { message: "Hello students", audience: "students" };
      const mockUsers = [{ _id: "s1" }, { _id: "s2" }];
      const selectMock = jest.fn().mockResolvedValue(mockUsers);
      User.find.mockReturnValue({ select: selectMock });

      const notifService = require("../../services/notification.service");
      notifService.sendNotification.mockResolvedValue({});

      await sendBroadcastNotification(req, res);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({ role: "student", isActive: true })
      );
      expect(notifService.sendNotification).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ sentCount: 2 })
      );
    });

    test("should send to everyone when audience is 'everyone'", async () => {
      req.body = { message: "Hello all", audience: "everyone" };
      const selectMock = jest.fn().mockResolvedValue([{ _id: "u1" }]);
      User.find.mockReturnValue({ select: selectMock });

      const notifService = require("../../services/notification.service");
      notifService.sendNotification.mockResolvedValue({});

      await sendBroadcastNotification(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ sentCount: 1 })
      );
    });
  });

  describe("respondToQuery", () => {
    test("should return 400 if response missing for non-resolved status", async () => {
      req.body = { status: "replied" };
      req.params = { id: "q1" };
      await respondToQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should respond to query and send notification", async () => {
      req.body = { response: "We will look into it", status: "replied" };
      req.params = { id: "q1" };
      const Apc = require("../../models/Apc.model");
      Apc.findOne.mockResolvedValue({ name: "Admin Person" });

      const Query = require("../../models/Query.model");
      Query.findByIdAndUpdate.mockResolvedValue({
        _id: "q1",
        subject: "Query Subject",
        studentUserId: "studentUser1",
      });

      const notifService = require("../../services/notification.service");
      notifService.sendNotification.mockResolvedValue({});

      await respondToQuery(req, res);

      expect(Query.findByIdAndUpdate).toHaveBeenCalledWith(
        "q1",
        expect.objectContaining({
          status: "replied",
          response: "We will look into it",
        }),
        { new: true }
      );
      expect(notifService.sendNotification).toHaveBeenCalled();
    });

    test("should return 404 if query not found", async () => {
      req.body = { response: "test", status: "replied" };
      req.params = { id: "nonexist" };
      const Apc = require("../../models/Apc.model");
      Apc.findOne.mockResolvedValue({ name: "Admin" });

      const Query = require("../../models/Query.model");
      Query.findByIdAndUpdate.mockResolvedValue(null);

      await respondToQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
