/**
 * BRANCH 7d: Queue Socket Tests
 * Tests queue.socket.js registerQueueSocketHandlers
 */
const { registerQueueSocketHandlers } = require("../../sockets/queue.socket");
const queueService = require("../../services/queue.service");

jest.mock("../../services/queue.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Queue Socket Handlers", () => {
  let mockIo, mockSocket;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
    };
    mockIo = {
      on: jest.fn((event, callback) => {
        if (event === "connection") {
          callback(mockSocket);
        }
      }),
    };
    jest.clearAllMocks();
  });

  test("should register connection handler", () => {
    registerQueueSocketHandlers(mockIo);
    expect(mockIo.on).toHaveBeenCalledWith("connection", expect.any(Function));
  });

  test("should register queue:fetch handler on connection", () => {
    registerQueueSocketHandlers(mockIo);
    expect(mockSocket.on).toHaveBeenCalledWith("queue:fetch", expect.any(Function));
  });

  test("should fetch queue and emit snapshot on queue:fetch", async () => {
    registerQueueSocketHandlers(mockIo);

    // Get the queue:fetch handler
    const fetchHandler = mockSocket.on.mock.calls.find(c => c[0] === "queue:fetch")[1];

    const mockQueue = [{ _id: "q1", position: 1 }];
    queueService.getQueue.mockResolvedValue(mockQueue);

    await fetchHandler({ companyId: "c1" });

    expect(queueService.getQueue).toHaveBeenCalledWith("c1");
    expect(mockSocket.emit).toHaveBeenCalledWith("queue:snapshot", {
      companyId: "c1",
      queue: mockQueue,
    });
  });

  test("should emit error on queue:fetch failure", async () => {
    registerQueueSocketHandlers(mockIo);

    const fetchHandler = mockSocket.on.mock.calls.find(c => c[0] === "queue:fetch")[1];
    queueService.getQueue.mockRejectedValue(new Error("DB Error"));

    await fetchHandler({ companyId: "c1" });

    expect(mockSocket.emit).toHaveBeenCalledWith("error", {
      message: "DB Error",
    });
  });
});
