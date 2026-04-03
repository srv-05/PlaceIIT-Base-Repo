/**
 * BRANCH 3a: Student Profile Tests
 * Tests student.controller.js getProfile, updateProfile
 */
const { getProfile, updateProfile } = require("../../controllers/student.controller");
const Student = require("../../models/Student.model");
const User = require("../../models/User.model");

jest.mock("../../models/Student.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Query.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../services/queue.service");
jest.mock("../../services/email.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Student Controller - Profile", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "user1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    test("should return student profile on success", async () => {
      const mockStudent = {
        _id: "student1",
        name: "Test Student",
        rollNumber: "CS001",
        userId: { email: "s@test.com" },
      };
      const populateMock2 = jest.fn().mockResolvedValue(mockStudent);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Student.findOne.mockReturnValue({ populate: populateMock1 });

      await getProfile(req, res);

      expect(Student.findOne).toHaveBeenCalledWith({ userId: "user1" });
      expect(res.json).toHaveBeenCalledWith(mockStudent);
    });

    test("should return 404 if student not found", async () => {
      const populateMock2 = jest.fn().mockResolvedValue(null);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Student.findOne.mockReturnValue({ populate: populateMock1 });

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Student not found" })
      );
    });

    test("should return 500 on error", async () => {
      Student.findOne.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await getProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateProfile", () => {
    test("should update student profile and return updated data", async () => {
      req.body = { contact: "9876543210", branch: "CSE", batch: "2024" };
      Student.findOneAndUpdate.mockResolvedValue({});

      const updatedStudent = {
        _id: "student1",
        name: "Test Student",
        contact: "9876543210",
        branch: "CSE",
      };
      const populateMock2 = jest.fn().mockResolvedValue(updatedStudent);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Student.findOne.mockReturnValue({ populate: populateMock1 });

      await updateProfile(req, res);

      expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user1" },
        expect.objectContaining({ contact: "9876543210", profileCompleted: true }),
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedStudent);
    });

    test("should update email on User model if provided", async () => {
      req.body = { email: "newemail@test.com", contact: "1234567890" };
      Student.findOneAndUpdate.mockResolvedValue({});
      User.findByIdAndUpdate.mockResolvedValue({});

      const updatedStudent = { _id: "s1", name: "S" };
      const populateMock2 = jest.fn().mockResolvedValue(updatedStudent);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Student.findOne.mockReturnValue({ populate: populateMock1 });

      await updateProfile(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user1", { email: "newemail@test.com" });
    });

    test("should return 404 if updated student not found", async () => {
      req.body = { contact: "1234567890" };
      Student.findOneAndUpdate.mockResolvedValue({});

      const populateMock2 = jest.fn().mockResolvedValue(null);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Student.findOne.mockReturnValue({ populate: populateMock1 });

      await updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
