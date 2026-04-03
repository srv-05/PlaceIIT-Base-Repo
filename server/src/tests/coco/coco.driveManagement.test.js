/**
 * BRANCH 6b: CoCo Drive Management Tests
 * Tests coco.controller.js toggleWalkIn, updateStudentStatus, updateCompanyVenue
 */
const { toggleWalkIn, updateStudentStatus, updateCompanyVenue } = require("../../controllers/coco.controller");
const Company = require("../../models/Company.model");
const Queue = require("../../models/Queue.model");
const queueService = require("../../services/queue.service");

jest.mock("../../models/Coordinator.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/InterviewRound.model");
jest.mock("../../models/Panel.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/User.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../services/notification.service");
jest.mock("../../services/queue.service");
jest.mock("../../services/round.service");
jest.mock("../../services/email.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("CoCo Controller - Drive Management", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "coco1" }, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("toggleWalkIn", () => {
    test("should return 404 if company not found", async () => {
      req.params = { companyId: "comp1" };
      req.body = { enabled: true };
      Company.findById.mockResolvedValue(null);

      await toggleWalkIn(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should toggle walk-in on", async () => {
      req.params = { companyId: "comp1" };
      req.body = { enabled: true };
      Company.findById.mockResolvedValue({ _id: "comp1", isWalkInEnabled: false, venue: "Room 1" });
      Company.findByIdAndUpdate.mockResolvedValue({
        _id: "comp1",
        isWalkInEnabled: true,
        name: "Corp",
        venue: "Room 1",
      });

      // Mock student/user lookups for notifications
      const Student = require("../../models/Student.model");
      const User = require("../../models/User.model");
      Student.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
      User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      await toggleWalkIn(req, res);

      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
        "comp1",
        { isWalkInEnabled: true },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isWalkInEnabled: true })
      );
    });

    test("should toggle walk-in off and exit walk-in queue entries", async () => {
      req.params = { companyId: "comp1" };
      req.body = { enabled: false };
      Company.findById.mockResolvedValue({ _id: "comp1", isWalkInEnabled: true });
      Company.findByIdAndUpdate.mockResolvedValue({ _id: "comp1", isWalkInEnabled: false });

      // Mock affected walk-in queue entries
      Queue.find.mockResolvedValue([]);
      Queue.updateMany.mockResolvedValue({});

      await toggleWalkIn(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isWalkInEnabled: false })
      );
    });
  });

  describe("updateStudentStatus", () => {
    test("should normalize status and call queueService.updateStatus", async () => {
      req.body = { studentId: "s1", companyId: "c1", status: "in-queue", round: "Round 1" };
      queueService.updateStatus.mockResolvedValue({ status: "in_queue" });

      await updateStudentStatus(req, res);

      expect(queueService.updateStatus).toHaveBeenCalledWith(
        "s1", "c1", "in_queue", undefined, undefined, "Round 1"
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: "in_queue" })
      );
    });

    test("should normalize in-interview status", async () => {
      req.body = { studentId: "s1", companyId: "c1", status: "in-interview" };
      queueService.updateStatus.mockResolvedValue({ status: "in_interview" });

      await updateStudentStatus(req, res);
      expect(queueService.updateStatus).toHaveBeenCalledWith(
        "s1", "c1", "in_interview", undefined, undefined, "Round 1"
      );
    });

    test("should return 400 on error", async () => {
      req.body = { studentId: "s1", companyId: "c1", status: "in_queue" };
      queueService.updateStatus.mockRejectedValue(new Error("Not found"));

      await updateStudentStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updateCompanyVenue", () => {
    test("should return 400 if venue is empty", async () => {
      req.params = { companyId: "c1" };
      req.body = { venue: "" };
      await updateCompanyVenue(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 404 if company not found", async () => {
      req.params = { companyId: "c1" };
      req.body = { venue: "New Room" };
      Company.findById.mockResolvedValue(null);
      await updateCompanyVenue(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should update venue and notify when venue changes", async () => {
      req.params = { companyId: "c1" };
      req.body = { venue: "New Room" };
      Company.findById.mockResolvedValue({
        _id: "c1",
        name: "Corp",
        venue: "Old Room",
        isWalkInEnabled: false,
        shortlistedStudents: [],
      });
      Company.findByIdAndUpdate.mockResolvedValue({
        _id: "c1",
        name: "Corp",
        venue: "New Room",
      });

      const Student = require("../../models/Student.model");
      const User = require("../../models/User.model");
      Student.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
      User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      await updateCompanyVenue(req, res);
      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
        "c1",
        { venue: "New Room" },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ venue: "New Room" })
      );
    });
  });
});
