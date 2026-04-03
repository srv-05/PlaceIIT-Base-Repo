/**
 * BRANCH 6d: CoCo Rounds Tests
 * Tests coco.controller.js addRound, getRounds, addStudentToRound
 */
const { addRound, getRounds } = require("../../controllers/coco.controller");
const InterviewRound = require("../../models/InterviewRound.model");
const roundService = require("../../services/round.service");

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

describe("CoCo Controller - Rounds", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "coco1" }, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("addRound", () => {
    test("should create a round via roundService", async () => {
      req.body = { companyId: "c1", roundNumber: 2, roundName: "Technical" };
      const mockRound = { _id: "r1", companyId: "c1", roundNumber: 2, roundName: "Technical" };
      roundService.createRound.mockResolvedValue(mockRound);

      await addRound(req, res);

      expect(roundService.createRound).toHaveBeenCalledWith("c1", 2, "Technical");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockRound);
    });

    test("should return 500 on error", async () => {
      req.body = { companyId: "c1", roundNumber: 1 };
      roundService.createRound.mockRejectedValue(new Error("Error"));
      await addRound(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getRounds", () => {
    test("should return rounds with students", async () => {
      req.params = { companyId: "c1" };
      const mockRounds = [
        {
          _id: "r1",
          companyId: "c1",
          roundNumber: 1,
          roundName: "Round 1",
          panels: [],
          toObject: jest.fn().mockReturnValue({
            _id: "r1",
            roundNumber: 1,
            roundName: "Round 1",
            panels: [],
          }),
        },
      ];
      const populateMock = jest.fn().mockResolvedValue(mockRounds);
      InterviewRound.find.mockReturnValue({ populate: populateMock });

      // Mock queue entries
      const Queue = require("../../models/Queue.model");
      const queuePopMock = jest.fn().mockResolvedValue([]);
      const queueFindMock = jest.fn().mockReturnValue({ populate: queuePopMock });
      Queue.find.mockImplementation(queueFindMock);

      await getRounds(req, res);

      expect(InterviewRound.find).toHaveBeenCalledWith({ companyId: "c1" });
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ roundNumber: 1, students: expect.any(Array) }),
        ])
      );
    });

    test("should return 500 on error", async () => {
      req.params = { companyId: "c1" };
      InterviewRound.find.mockImplementation(() => { throw new Error("DB Error"); });
      await getRounds(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
