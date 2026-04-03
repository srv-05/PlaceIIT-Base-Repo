/**
 * BRANCH 7a: Queue Management Tests
 * Tests queue.controller.js getQueue, updateQueueStatus, acceptRequest, rejectRequest
 */
const { getQueue, getPendingRequests, updateQueueStatus, acceptRequest, rejectRequest } = require("../../controllers/queue.controller");
const queueService = require("../../services/queue.service");

jest.mock("../../services/queue.service");

describe("Queue Controller", () => {
  let req, res;

  beforeEach(() => {
    req = { params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getQueue", () => {
    test("should return queue for a company", async () => {
      req.params = { companyId: "c1" };
      const mockQueue = [{ _id: "q1", position: 1 }, { _id: "q2", position: 2 }];
      queueService.getQueue.mockResolvedValue(mockQueue);

      await getQueue(req, res);

      expect(queueService.getQueue).toHaveBeenCalledWith("c1");
      expect(res.json).toHaveBeenCalledWith(mockQueue);
    });

    test("should return 500 on error", async () => {
      req.params = { companyId: "c1" };
      queueService.getQueue.mockRejectedValue(new Error("Error"));
      await getQueue(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getPendingRequests", () => {
    test("should return pending requests", async () => {
      req.params = { companyId: "c1" };
      const mockEntries = [{ _id: "e1", status: "pending" }];
      queueService.getPendingRequests.mockResolvedValue(mockEntries);

      await getPendingRequests(req, res);

      expect(queueService.getPendingRequests).toHaveBeenCalledWith("c1");
      expect(res.json).toHaveBeenCalledWith(mockEntries);
    });
  });

  describe("updateQueueStatus", () => {
    test("should update queue entry status", async () => {
      req.body = { studentId: "s1", companyId: "c1", status: "in_queue" };
      const mockResult = { status: "in_queue" };
      queueService.updateStatus.mockResolvedValue(mockResult);

      await updateQueueStatus(req, res);

      expect(queueService.updateStatus).toHaveBeenCalledWith("s1", "c1", "in_queue", undefined, undefined);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should return 400 on error", async () => {
      req.body = { studentId: "s1", companyId: "c1", status: "invalid" };
      queueService.updateStatus.mockRejectedValue(new Error("Bad status"));
      await updateQueueStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("acceptRequest", () => {
    test("should accept pending queue request", async () => {
      req.body = { studentId: "s1", companyId: "c1" };
      const mockResult = { status: "in_queue", position: 1 };
      queueService.acceptQueueRequest.mockResolvedValue(mockResult);

      await acceptRequest(req, res);

      expect(queueService.acceptQueueRequest).toHaveBeenCalledWith("s1", "c1");
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should return 400 if no pending request found", async () => {
      req.body = { studentId: "s1", companyId: "c1" };
      queueService.acceptQueueRequest.mockRejectedValue(new Error("No pending request"));
      await acceptRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("rejectRequest", () => {
    test("should reject pending queue request", async () => {
      req.body = { studentId: "s1", companyId: "c1" };
      const mockResult = { status: "rejected" };
      queueService.rejectQueueRequest.mockResolvedValue(mockResult);

      await rejectRequest(req, res);

      expect(queueService.rejectQueueRequest).toHaveBeenCalledWith("s1", "c1");
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should return 400 on error", async () => {
      req.body = { studentId: "s1", companyId: "c1" };
      queueService.rejectQueueRequest.mockRejectedValue(new Error("Error"));
      await rejectRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
