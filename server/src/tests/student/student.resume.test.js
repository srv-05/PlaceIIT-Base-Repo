/**
 * BRANCH 3b: Student Resume Tests
 * Tests student.controller.js uploadResume
 */
const { uploadResume } = require("../../controllers/student.controller");
const Student = require("../../models/Student.model");

jest.mock("../../models/Student.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Query.model");
jest.mock("../../services/queue.service");
jest.mock("../../services/email.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Student Controller - Resume", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "user1" }, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("should return 400 if no file uploaded", async () => {
    req.file = undefined;
    await uploadResume(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No file uploaded" })
    );
  });

  test("should upload resume successfully", async () => {
    req.file = { path: "uploads/resumes/user1-123.pdf" };
    Student.findOneAndUpdate.mockResolvedValue({
      _id: "student1",
      resume: "uploads/resumes/user1-123.pdf",
    });

    await uploadResume(req, res);

    expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "user1" },
      { resume: "uploads/resumes/user1-123.pdf" },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Resume uploaded successfully" })
    );
  });

  test("should return 404 if student not found during resume upload", async () => {
    req.file = { path: "uploads/resumes/user1-123.pdf" };
    Student.findOneAndUpdate.mockResolvedValue(null);

    await uploadResume(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("should handle backslashes in file path", async () => {
    req.file = { path: "uploads\\resumes\\user1-123.pdf" };
    Student.findOneAndUpdate.mockResolvedValue({
      _id: "student1",
      resume: "uploads/resumes/user1-123.pdf",
    });

    await uploadResume(req, res);

    expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "user1" },
      { resume: "uploads/resumes/user1-123.pdf" },
      { new: true }
    );
  });

  test("should return 500 on DB error", async () => {
    req.file = { path: "uploads/resume.pdf" };
    Student.findOneAndUpdate.mockRejectedValue(new Error("DB Error"));

    await uploadResume(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
