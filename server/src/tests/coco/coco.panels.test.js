/**
 * BRANCH 6c: CoCo Panels Tests
 * Tests coco.controller.js addPanel, getPanels, updatePanel, assignPanelStudent, clearPanel
 */
const { addPanel, getPanels, clearPanel } = require("../../controllers/coco.controller");
const Panel = require("../../models/Panel.model");
const InterviewRound = require("../../models/InterviewRound.model");
const Queue = require("../../models/Queue.model");

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

describe("CoCo Controller - Panels", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "coco1" }, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("addPanel", () => {
    test("should create panel with provided name", async () => {
      req.body = { companyId: "c1", panelName: "Panel A", interviewers: ["Mr. X"], venue: "Room 1" };
      const mockPanel = { _id: "p1", panelName: "Panel A", companyId: "c1" };
      Panel.create.mockResolvedValue(mockPanel);

      await addPanel(req, res);

      expect(Panel.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "c1", panelName: "Panel A" })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockPanel);
    });

    test("should auto-generate panel name if not provided", async () => {
      req.body = { companyId: "c1", panelName: "", interviewers: [] };
      Panel.countDocuments.mockResolvedValue(2);
      Panel.create.mockResolvedValue({ _id: "p1", panelName: "Panel 3" });

      await addPanel(req, res);

      expect(Panel.create).toHaveBeenCalledWith(
        expect.objectContaining({ panelName: "Panel 3" })
      );
    });

    test("should link panel to round if roundId provided", async () => {
      req.body = { companyId: "c1", roundId: "r1", panelName: "Panel B" };
      Panel.create.mockResolvedValue({ _id: "p1" });
      InterviewRound.findByIdAndUpdate.mockResolvedValue({});

      await addPanel(req, res);

      expect(InterviewRound.findByIdAndUpdate).toHaveBeenCalledWith(
        "r1",
        { $push: { panels: "p1" } }
      );
    });

    test("should return 500 on error", async () => {
      req.body = { companyId: "c1", panelName: "P" };
      Panel.create.mockRejectedValue(new Error("DB Error"));
      await addPanel(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getPanels", () => {
    test("should return panels for a company", async () => {
      req.params = { companyId: "c1" };
      const mockPanels = [{ _id: "p1", panelName: "Panel A" }];
      const populateMock2 = jest.fn().mockResolvedValue(mockPanels);
      const populateMock1 = jest.fn().mockReturnValue({ populate: populateMock2 });
      Panel.find.mockReturnValue({ populate: populateMock1 });

      await getPanels(req, res);
      expect(Panel.find).toHaveBeenCalledWith({ companyId: "c1" });
      expect(res.json).toHaveBeenCalledWith(mockPanels);
    });
  });

  describe("clearPanel", () => {
    test("should return 404 if panel not found", async () => {
      req.params = { id: "p1" };
      const populateMock = jest.fn().mockResolvedValue(null);
      Panel.findById.mockReturnValue({ populate: populateMock });

      await clearPanel(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should clear panel and mark student as completed", async () => {
      req.params = { id: "p1" };
      const mockPanel = {
        _id: "p1",
        companyId: "c1",
        currentStudent: "s1",
        roundId: { roundName: "Round 1", roundNumber: 1 },
        status: "occupied",
        save: jest.fn().mockResolvedValue({}),
      };
      const populateMock = jest.fn().mockResolvedValue(mockPanel);
      Panel.findById.mockReturnValue({ populate: populateMock });

      const mockQueueEntry = {
        studentId: "s1",
        status: "in_interview",
        save: jest.fn().mockResolvedValue({}),
      };
      const sortMock = jest.fn().mockResolvedValue(mockQueueEntry);
      Queue.findOne.mockReturnValue({ sort: sortMock });

      await clearPanel(req, res);

      expect(mockQueueEntry.status).toBe("completed");
      expect(mockPanel.status).toBe("unoccupied");
      expect(mockPanel.currentStudent).toBeNull();
      expect(res.json).toHaveBeenCalledWith(mockPanel);
    });
  });
});
