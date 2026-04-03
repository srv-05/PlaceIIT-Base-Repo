/**
 * BRANCH 3d: Student Queries Tests
 * Tests student.controller.js submitQuery, getMyQueries
 */
const { submitQuery, getMyQueries } = require("../../controllers/student.controller");
const Query = require("../../models/Query.model");

jest.mock("../../models/Student.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Query.model");
jest.mock("../../models/Apc.model");
jest.mock("../../services/queue.service");
jest.mock("../../services/email.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Student Controller - Queries", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "user1" }, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("submitQuery", () => {
    test("should return 400 if subject missing", async () => {
      req.body = { message: "Need help" };
      await submitQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if message missing", async () => {
      req.body = { subject: "Help" };
      await submitQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should create and return query on success", async () => {
      req.body = { subject: "Schedule", message: "When is my interview?" };
      const mockQuery = {
        _id: "query1",
        studentUserId: "user1",
        subject: "Schedule",
        message: "When is my interview?",
        status: "pending",
      };
      Query.create.mockResolvedValue(mockQuery);

      await submitQuery(req, res);

      expect(Query.create).toHaveBeenCalledWith({
        studentUserId: "user1",
        subject: "Schedule",
        message: "When is my interview?",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockQuery);
    });

    test("should return 500 on DB error", async () => {
      req.body = { subject: "Test", message: "test" };
      Query.create.mockRejectedValue(new Error("DB Error"));
      await submitQuery(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getMyQueries", () => {
    test("should return queries for the student", async () => {
      const mockQueries = [
        {
          _id: "q1",
          subject: "Q1",
          status: "pending",
          respondedBy: null,
          toObject: jest.fn().mockReturnValue({
            _id: "q1",
            subject: "Q1",
            status: "pending",
            respondedBy: null,
          }),
        },
      ];
      // Chain: Query.find().populate("respondedBy", ...).sort()
      const sortMock = jest.fn().mockResolvedValue(mockQueries);
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      Query.find.mockReturnValue({ populate: populateMock });

      // Mock Apc for the responder name lookup
      const Apc = require("../../models/Apc.model");
      Apc.findOne = jest.fn().mockResolvedValue(null);

      await getMyQueries(req, res);

      expect(Query.find).toHaveBeenCalledWith({ studentUserId: "user1" });
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ _id: "q1", subject: "Q1" }),
        ])
      );
    });

    test("should attach responder name when respondedBy exists", async () => {
      const mockQueries = [
        {
          _id: "q2",
          subject: "Q2",
          respondedBy: { _id: "admin1" },
          toObject: jest.fn().mockReturnValue({
            _id: "q2",
            subject: "Q2",
            respondedBy: { _id: "admin1" },
          }),
        },
      ];
      const sortMock = jest.fn().mockResolvedValue(mockQueries);
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      Query.find.mockReturnValue({ populate: populateMock });

      const Apc = require("../../models/Apc.model");
      Apc.findOne = jest.fn().mockResolvedValue({ name: "Admin Person" });

      await getMyQueries(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ respondedByName: "Admin Person" }),
        ])
      );
    });

    test("should return 500 on error", async () => {
      Query.find.mockImplementation(() => {
        throw new Error("DB Error");
      });
      await getMyQueries(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
