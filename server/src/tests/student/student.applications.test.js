/**
 * BRANCH 3c: Student Applications / Companies Tests
 * Tests student.controller.js getMyCompanies, joinQueue, leaveQueue
 */
const { getMyCompanies, joinQueue, leaveQueue } = require("../../controllers/student.controller");
const Student = require("../../models/Student.model");
const Queue = require("../../models/Queue.model");
const Company = require("../../models/Company.model");
const queueService = require("../../services/queue.service");

jest.mock("../../models/Student.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Query.model");
jest.mock("../../models/User.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../services/queue.service");
jest.mock("../../services/email.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Student Controller - Applications", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "user1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("joinQueue", () => {
    test("should return 404 if student not found", async () => {
      req.body = { companyId: "comp1" };
      Student.findOne.mockResolvedValue(null);

      await joinQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should call queueService.joinQueue on success", async () => {
      req.body = { companyId: "comp1", round: "Round 1" };
      const mockStudent = { _id: "student1" };
      Student.findOne.mockResolvedValue(mockStudent);

      // Mock DriveState to skip drive state checks
      const DriveState = require("../../models/DriveState.model");
      DriveState.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const mockResult = { _id: "queue1", status: "pending" };
      queueService.joinQueue.mockResolvedValue(mockResult);

      await joinQueue(req, res);

      expect(queueService.joinQueue).toHaveBeenCalledWith("student1", "comp1", "Round 1", false);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should return 409 on QUEUE_CONFLICT error", async () => {
      req.body = { companyId: "comp1" };
      Student.findOne.mockResolvedValue({ _id: "student1" });

      const DriveState = require("../../models/DriveState.model");
      DriveState.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      const conflictErr = new Error("Already in queue");
      conflictErr.code = "QUEUE_CONFLICT";
      conflictErr.conflictCompanyId = "comp2";
      conflictErr.conflictCompanyName = "Other Corp";
      conflictErr.conflictRound = "Round 1";
      queueService.joinQueue.mockRejectedValue(conflictErr);

      await joinQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "QUEUE_CONFLICT" })
      );
    });

    test("should return 400 on generic error", async () => {
      req.body = { companyId: "comp1" };
      Student.findOne.mockResolvedValue({ _id: "student1" });

      const DriveState = require("../../models/DriveState.model");
      DriveState.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      queueService.joinQueue.mockRejectedValue(new Error("Some error"));
      await joinQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("leaveQueue", () => {
    test("should return 404 if student not found", async () => {
      req.body = { companyId: "comp1" };
      Student.findOne.mockResolvedValue(null);

      await leaveQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should call queueService.leaveQueue on success", async () => {
      req.body = { companyId: "comp1", round: "Round 1" };
      Student.findOne.mockResolvedValue({ _id: "student1" });
      queueService.leaveQueue.mockResolvedValue({ message: "Left queue successfully" });

      await leaveQueue(req, res);

      expect(queueService.leaveQueue).toHaveBeenCalledWith("student1", "comp1", "Round 1");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Left queue successfully" })
      );
    });

    test("should return 400 on error", async () => {
      req.body = { companyId: "comp1" };
      Student.findOne.mockResolvedValue({ _id: "student1" });
      queueService.leaveQueue.mockRejectedValue(new Error("No active entry"));

      await leaveQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
