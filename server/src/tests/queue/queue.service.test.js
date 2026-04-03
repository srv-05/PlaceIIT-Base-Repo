/**
 * BRANCH 7c: Queue Service Tests
 * Tests queue.service.js in isolation with fully mocked dependencies
 */
const Queue = require("../../models/Queue.model");
const Company = require("../../models/Company.model");
const Student = require("../../models/Student.model");
const Panel = require("../../models/Panel.model");
const InterviewRound = require("../../models/InterviewRound.model");

jest.mock("../../models/Queue.model");
jest.mock("../../models/Company.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Panel.model");
jest.mock("../../models/InterviewRound.model");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

const queueService = require("../../services/queue.service");

describe("Queue Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getQueue", () => {
    test("should return queue sorted by position", async () => {
      const mockQueue = [{ _id: "q1", position: 1 }];
      const sortMock = jest.fn().mockResolvedValue(mockQueue);
      const pop3 = jest.fn().mockReturnValue({ sort: sortMock });
      const pop2 = jest.fn().mockReturnValue({ populate: pop3 });
      const pop1 = jest.fn().mockReturnValue({ populate: pop2 });
      Queue.find.mockReturnValue({ populate: pop1 });

      const result = await queueService.getQueue("c1");
      expect(Queue.find).toHaveBeenCalledWith({ companyId: "c1" });
      expect(result).toEqual(mockQueue);
    });
  });

  describe("getPendingRequests", () => {
    test("should return pending entries sorted by joinedAt", async () => {
      const mockEntries = [{ _id: "e1", status: "pending" }];
      const sortMock = jest.fn().mockResolvedValue(mockEntries);
      const pop1 = jest.fn().mockReturnValue({ sort: sortMock });
      Queue.find.mockReturnValue({ populate: pop1 });

      const result = await queueService.getPendingRequests("c1");
      expect(Queue.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "c1", status: "pending" })
      );
      expect(result).toEqual(mockEntries);
    });
  });

  describe("joinQueue", () => {
    test("should throw if company not found", async () => {
      Company.findById.mockResolvedValue(null);
      await expect(queueService.joinQueue("s1", "c1")).rejects.toThrow("Company not found");
    });

    test("should throw if walk-in not enabled", async () => {
      Company.findById.mockResolvedValue({ _id: "c1", isWalkInEnabled: false });
      await expect(queueService.joinQueue("s1", "c1", "Round 1", true)).rejects.toThrow("Walk-in is not enabled");
    });

    test("should throw if student not shortlisted (non-walkin)", async () => {
      Company.findById.mockResolvedValue({ _id: "c1", isWalkInEnabled: false });
      Queue.findOne.mockResolvedValue(null);
      Queue.exists.mockResolvedValue(null);
      Student.findById.mockResolvedValue({
        shortlistedCompanies: [],
      });

      await expect(queueService.joinQueue("s1", "c1", "Round 1", false)).rejects.toThrow("not shortlisted");
    });

    test("should create pending entry on success", async () => {
      Company.findById.mockResolvedValue({ _id: "c1", isWalkInEnabled: true });
      Queue.findOne.mockResolvedValue(null);
      Queue.exists.mockResolvedValue(null);
      Queue.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      const mockEntry = { _id: "q1", status: "pending", companyId: "c1" };
      Queue.create.mockResolvedValue(mockEntry);
      Student.findById.mockResolvedValue({ _id: "s1", name: "Test" });

      const result = await queueService.joinQueue("s1", "c1", "Round 1", true);
      expect(Queue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "c1",
          studentId: "s1",
          status: "pending",
        })
      );
      expect(result).toEqual(mockEntry);
    });

    test("should throw QUEUE_CONFLICT if active in another company", async () => {
      Company.findById.mockResolvedValue({ _id: "c1", isWalkInEnabled: true });
      Queue.findOne.mockResolvedValue(null);
      Queue.exists.mockResolvedValue(null);
      // Active in another company
      const activeElsewhere = [{
        _id: "q2",
        status: "in_queue",
        companyId: { _id: "c2", name: "Other Corp", isWalkInEnabled: false },
        isWalkIn: false,
        round: "Round 1",
      }];
      const findMock = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(activeElsewhere) });
      Queue.find.mockImplementation(findMock);

      try {
        await queueService.joinQueue("s1", "c1", "Round 1", true);
        fail("Should have thrown");
      } catch (err) {
        expect(err.code).toBe("QUEUE_CONFLICT");
        expect(err.conflictCompanyName).toBe("Other Corp");
      }
    });
  });

  describe("leaveQueue", () => {
    test("should throw if no active queue entry found", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      Queue.find.mockReturnValue({ sort: sortMock });

      await expect(queueService.leaveQueue("s1", "c1")).rejects.toThrow("No active queue entry");
    });

    test("should throw if student is in interview", async () => {
      const entries = [{ _id: "q1", status: "in_interview", round: "Round 1" }];
      const sortMock = jest.fn().mockResolvedValue(entries);
      Queue.find.mockReturnValue({ sort: sortMock });

      await expect(queueService.leaveQueue("s1", "c1")).rejects.toThrow("Cannot exit queue while in an active interview");
    });

    test("should set entries to EXITED and recalculate positions", async () => {
      const entries = [
        { _id: "q1", status: "in_queue", round: "Round 1", position: 2, roundId: null },
      ];
      const sortMock = jest.fn().mockResolvedValue(entries);
      Queue.find.mockReturnValue({ sort: sortMock });
      Queue.updateMany.mockResolvedValue({});

      // Recalculate mock
      const trailingEntries = [];
      const recalcSortMock = jest.fn().mockResolvedValue(trailingEntries);
      // Override Queue.find for recalculation - use mockImplementation
      Queue.find.mockImplementation((filter) => {
        if (filter.position) {
          return { sort: recalcSortMock };
        }
        return { sort: sortMock };
      });

      Student.findById.mockResolvedValue({ _id: "s1", userId: "u1" });

      const result = await queueService.leaveQueue("s1", "c1", "Round 1");
      expect(result).toEqual({ message: "Left queue successfully" });
    });
  });

  describe("acceptQueueRequest", () => {
    test("should throw if no pending request", async () => {
      const populateMock = jest.fn().mockResolvedValue(null);
      Queue.findOne.mockReturnValue({ populate: populateMock });

      await expect(queueService.acceptQueueRequest("s1", "c1")).rejects.toThrow("No pending request");
    });

    test("should accept and assign position", async () => {
      const mockEntry = {
        _id: "q1",
        companyId: "c1",
        studentId: "s1",
        status: "pending",
        round: "Round 1",
        isWalkIn: false,
        save: jest.fn().mockResolvedValue({}),
      };

      // Queue.findOne is called multiple times with different patterns:
      // 1. Initial find (with populate) - returns pending entry
      // 2. Last position lookup (with sort) - returns null (no existing in_queue entries)
      Queue.findOne.mockImplementation((filter) => {
        // If status is pending, it's the initial lookup
        if (filter && filter.status === "pending") {
          return { populate: jest.fn().mockResolvedValue(mockEntry) };
        }
        // If status is an $in array, it's the position lookup
        if (filter && filter.status && filter.status.$in) {
          return { sort: jest.fn().mockResolvedValue(null) };
        }
        return { populate: jest.fn().mockResolvedValue(null) };
      });

      InterviewRound.findOne.mockResolvedValue(null);
      InterviewRound.create.mockResolvedValue({ _id: "r1", roundNumber: 1, roundName: "Round 1" });

      Company.findByIdAndUpdate.mockResolvedValue({});
      Student.findByIdAndUpdate.mockResolvedValue({});
      Student.findById.mockResolvedValue({ _id: "s1", userId: "u1" });

      const result = await queueService.acceptQueueRequest("s1", "c1", "Round 1");
      expect(mockEntry.status).toBe("in_queue");
      expect(mockEntry.save).toHaveBeenCalled();
    });
  });

  describe("rejectQueueRequest", () => {
    test("should throw if no pending request", async () => {
      // rejectQueueRequest calls Queue.findOne() without .populate(), so mock directly
      Queue.findOne.mockReturnValue(null);
      await expect(queueService.rejectQueueRequest("s1", "c1")).rejects.toThrow("No pending request");
    });

    test("should set status to rejected", async () => {
      const mockEntry = {
        _id: "q1",
        status: "pending",
        save: jest.fn().mockResolvedValue({}),
      };
      Queue.findOne.mockReturnValue(mockEntry);
      Student.findById.mockResolvedValue({ _id: "s1", userId: "u1" });

      const result = await queueService.rejectQueueRequest("s1", "c1");
      expect(mockEntry.status).toBe("rejected");
      expect(mockEntry.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("hasActiveQueue", () => {
    test("should return undefined if no active entries", async () => {
      const populateMock = jest.fn().mockResolvedValue([]);
      Queue.find.mockReturnValue({ populate: populateMock });

      const result = await queueService.hasActiveQueue("s1");
      expect(result).toBeUndefined();
    });

    test("should return active entry", async () => {
      const active = { status: "in_queue", isWalkIn: false, companyId: { isWalkInEnabled: false } };
      const populateMock = jest.fn().mockResolvedValue([active]);
      Queue.find.mockReturnValue({ populate: populateMock });

      const result = await queueService.hasActiveQueue("s1");
      expect(result).toEqual(active);
    });
  });

  describe("hasInterviewHistoryForCompany", () => {
    test("should return false if no history", async () => {
      Queue.exists.mockResolvedValue(null);
      const result = await queueService.hasInterviewHistoryForCompany("s1", "c1");
      expect(result).toBe(false);
    });

    test("should return true if history exists", async () => {
      Queue.exists.mockResolvedValue({ _id: "q1" });
      const result = await queueService.hasInterviewHistoryForCompany("s1", "c1");
      expect(result).toBe(true);
    });
  });
});
