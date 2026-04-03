/**
 * BRANCH 5a: Admin Users Tests
 * Tests admin.controller.js getStats, searchStudents, addStudent, addCoco, getCocos, addApc, removeApc
 */
const {
  getStats, searchStudents, addStudent, addCoco, getCocos,
  getApcs, addApc, removeApc,
} = require("../../controllers/admin.controller");
const Student = require("../../models/Student.model");
const Coordinator = require("../../models/Coordinator.model");
const Company = require("../../models/Company.model");
const User = require("../../models/User.model");
const Apc = require("../../models/Apc.model");

jest.mock("../../models/Student.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Apc.model");
jest.mock("../../models/ExcelUpload.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Queue.model");
jest.mock("../../services/excel.service");
jest.mock("../../services/allocation.service");
jest.mock("../../services/email.service");
jest.mock("../../services/apc.service");
jest.mock("../../services/coco.service");
jest.mock("../../services/notification.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Admin Controller - Users", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "admin1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    test("should return stats with counts", async () => {
      Student.countDocuments.mockResolvedValue(100);
      Coordinator.countDocuments.mockResolvedValue(10);
      Company.countDocuments.mockResolvedValue(5);

      await getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        students: 100,
        coordinators: 10,
        companies: 5,
      });
    });

    test("should return 500 on error", async () => {
      Student.countDocuments.mockRejectedValue(new Error("DB Error"));
      await getStats(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("addStudent", () => {
    test("should return 400 if required fields missing", async () => {
      req.body = { name: "Test" };
      await addStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if phone number is invalid", async () => {
      req.body = { name: "Test", rollNumber: "CS001", email: "test@test.com", phone: "123" };
      await addStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("10 digits") })
      );
    });

    test("should return 400 if user already exists", async () => {
      req.body = { name: "Test", rollNumber: "CS001", email: "test@test.com", phone: "1234567890" };
      User.findOne.mockResolvedValue({ _id: "existing" });
      await addStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if student record already exists", async () => {
      req.body = { name: "Test", rollNumber: "CS001", email: "test@test.com", phone: "1234567890" };
      User.findOne.mockResolvedValue(null);
      Student.findOne.mockResolvedValue({ _id: "existing" });
      await addStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should create student successfully", async () => {
      req.body = { name: "Test Student", rollNumber: "CS002", email: "new@test.com", phone: "1234567890" };
      User.findOne.mockResolvedValue(null);
      Student.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: "newuser1" });
      Student.create.mockResolvedValue({ _id: "newstudent1", name: "Test Student" });
      const { sendWelcomeEmail } = require("../../services/email.service");
      sendWelcomeEmail.mockResolvedValue({});

      // Mock emitStatsUpdate internals
      Student.countDocuments.mockResolvedValue(1);
      Coordinator.countDocuments.mockResolvedValue(0);
      Company.countDocuments.mockResolvedValue(0);

      await addStudent(req, res);

      expect(User.create).toHaveBeenCalled();
      expect(Student.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Student added") })
      );
    });
  });

  describe("getCocos", () => {
    test("should return coordinators with email", async () => {
      const mockCocos = [
        {
          name: "CoCo 1",
          userId: { email: "coco@test.com", instituteId: "COCO001" },
          assignedCompanies: [],
          toObject: jest.fn().mockReturnValue({
            name: "CoCo 1",
            userId: { email: "coco@test.com", instituteId: "COCO001" },
            assignedCompanies: [],
          }),
        },
      ];
      const populateMock2 = jest.fn().mockResolvedValue(mockCocos);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Coordinator.find.mockReturnValue({ populate: populateMock1 });

      await getCocos(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: "coco@test.com" }),
        ])
      );
    });
  });

  describe("getApcs", () => {
    test("should return APC list with email", async () => {
      const mockApcs = [
        {
          name: "APC 1",
          userId: { email: "apc@test.com", instituteId: "APC001" },
          toObject: jest.fn().mockReturnValue({
            name: "APC 1",
            userId: { email: "apc@test.com", instituteId: "APC001" },
          }),
        },
      ];
      const populateMock = jest.fn().mockResolvedValue(mockApcs);
      Apc.find.mockReturnValue({ populate: populateMock });

      await getApcs(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: "apc@test.com" }),
        ])
      );
    });
  });

  describe("addApc", () => {
    test("should return 403 if not main admin", async () => {
      req.body = { name: "A", email: "a@t.com", rollNumber: "R1", contact: "1234567890" };
      User.findById.mockResolvedValue({ isMainAdmin: false });
      await addApc(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("should create APC if main admin", async () => {
      req.body = { name: "APC New", email: "apc@t.com", rollNumber: "R2", contact: "1234567890" };
      User.findById.mockResolvedValue({ isMainAdmin: true });

      const { createApc } = require("../../services/apc.service");
      createApc.mockResolvedValue({ emailSent: true, apc: { _id: "a1" } });

      Student.countDocuments.mockResolvedValue(0);
      Coordinator.countDocuments.mockResolvedValue(0);
      Company.countDocuments.mockResolvedValue(0);

      await addApc(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("removeApc", () => {
    test("should return 403 if not main admin", async () => {
      req.body = { apcId: "apc1" };
      User.findById.mockResolvedValue({ isMainAdmin: false });
      await removeApc(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("should remove APC and associated user", async () => {
      req.body = { apcId: "apc1" };
      User.findById.mockResolvedValue({ isMainAdmin: true });
      Apc.findById.mockResolvedValue({ _id: "apc1", userId: "user1" });
      User.findByIdAndDelete.mockResolvedValue({});
      Apc.findByIdAndDelete.mockResolvedValue({});

      await removeApc(req, res);
      expect(User.findByIdAndDelete).toHaveBeenCalledWith("user1");
      expect(Apc.findByIdAndDelete).toHaveBeenCalledWith("apc1");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "APC removed successfully" })
      );
    });
  });
});
