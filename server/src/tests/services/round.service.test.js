/**
 * BRANCH 8e: Round Service Tests
 * Tests round.service.js createRound, activateRound
 */
const InterviewRound = require("../../models/InterviewRound.model");
const Company = require("../../models/Company.model");

jest.mock("../../models/InterviewRound.model");
jest.mock("../../models/Company.model");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
  })),
}));

const { createRound, activateRound } = require("../../services/round.service");

describe("Round Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createRound", () => {
    test("should create a new round", async () => {
      const mockRound = { _id: "r1", companyId: "c1", roundNumber: 2, roundName: "Technical" };
      InterviewRound.create.mockResolvedValue(mockRound);

      const result = await createRound("c1", 2, "Technical");

      expect(InterviewRound.create).toHaveBeenCalledWith({
        companyId: "c1",
        roundNumber: 2,
        roundName: "Technical",
      });
      expect(result).toEqual(mockRound);
    });

    test("should use empty string as default roundName", async () => {
      InterviewRound.create.mockResolvedValue({ _id: "r1" });

      await createRound("c1", 1);

      expect(InterviewRound.create).toHaveBeenCalledWith({
        companyId: "c1",
        roundNumber: 1,
        roundName: "",
      });
    });
  });

  describe("activateRound", () => {
    test("should deactivate all rounds and activate the selected one", async () => {
      InterviewRound.updateMany.mockResolvedValue({});
      const mockRound = { _id: "r1", roundNumber: 2 };
      InterviewRound.findByIdAndUpdate.mockResolvedValue(mockRound);
      Company.findByIdAndUpdate.mockResolvedValue({});

      const result = await activateRound("c1", "r1");

      expect(InterviewRound.updateMany).toHaveBeenCalledWith({ companyId: "c1" }, { isActive: false });
      expect(InterviewRound.findByIdAndUpdate).toHaveBeenCalledWith("r1", { isActive: true }, { new: true });
      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith("c1", { currentRound: 2 });
      expect(result).toEqual(mockRound);
    });
  });
});
