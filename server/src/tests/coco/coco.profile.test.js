/**
 * BRANCH 6a: CoCo Profile Tests
 * Tests coco.controller.js getAssignedCompany
 */
const { getAssignedCompany } = require("../../controllers/coco.controller");
const Coordinator = require("../../models/Coordinator.model");
const DriveState = require("../../models/DriveState.model");

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

describe("CoCo Controller - Profile", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "coco1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getAssignedCompany", () => {
    test("should return empty array if coco not found", async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      Coordinator.findOne.mockReturnValue({ populate: populateMock });

      await getAssignedCompany(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should return empty array if no drive state", async () => {
      const populateMock = jest.fn().mockResolvedValue({
        assignedCompanies: [{ _id: "c1", day: 1, slot: "morning" }],
      });
      Coordinator.findOne.mockReturnValue({ populate: populateMock });
      DriveState.findOne.mockResolvedValue(null);

      await getAssignedCompany(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should filter companies by day and slot", async () => {
      const companies = [
        { _id: "c1", day: 1, slot: "morning" },
        { _id: "c2", day: 2, slot: "afternoon" },
        { _id: "c3", day: 1, slot: "morning" },
      ];
      const populateMock = jest.fn().mockResolvedValue({
        assignedCompanies: companies,
      });
      Coordinator.findOne.mockReturnValue({ populate: populateMock });
      DriveState.findOne.mockResolvedValue({ currentDay: 1, currentSlot: "morning" });

      await getAssignedCompany(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe("c1");
      expect(result[1]._id).toBe("c3");
    });

    test("should return empty if no companies match current slot", async () => {
      const companies = [{ _id: "c1", day: 1, slot: "morning" }];
      const populateMock = jest.fn().mockResolvedValue({
        assignedCompanies: companies,
      });
      Coordinator.findOne.mockReturnValue({ populate: populateMock });
      DriveState.findOne.mockResolvedValue({ currentDay: 2, currentSlot: "afternoon" });

      await getAssignedCompany(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should return 500 on error", async () => {
      Coordinator.findOne.mockImplementation(() => { throw new Error("DB Error"); });
      await getAssignedCompany(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
