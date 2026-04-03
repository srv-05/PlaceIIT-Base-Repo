const request = require("supertest");
const { createApp } = require("../utils/testApp");
const queueController = require("../../controllers/queue.controller");

jest.mock("../../controllers/queue.controller", () => ({
  getQueue: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPendingRequests: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateQueueStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  acceptRequest: jest.fn((req, res) => res.status(200).json({ success: true })),
  rejectRequest: jest.fn((req, res) => res.status(200).json({ success: true }))
}));

jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ message: "Not authorized" });
    const role = req.headers.authorization.split(" ")[2] || "coco";
    req.user = { id: "user1", role };
    next();
  })
}));

jest.mock("../../middlewares/role.middleware", () => ({
  authorize: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
    next();
  }
}));

describe("Queue Routes", () => {
  let app;
  let cocoToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    cocoToken = `Bearer mocktoken coco`;
    jest.clearAllMocks();
  });

  test("GET /api/queue/:companyId requires auth", async () => {
    const res = await request(app).get("/api/queue/company1");
    expect(res.status).toBe(401);
  });

  test("GET /api/queue/:companyId reaches controller", async () => {
    const res = await request(app).get("/api/queue/company1").set("Authorization", cocoToken);
    expect(res.status).toBe(200);
    expect(queueController.getQueue).toHaveBeenCalled();
  });

  test("GET /api/queue/:companyId/pending reaches controller for coco", async () => {
    const res = await request(app).get("/api/queue/company1/pending").set("Authorization", cocoToken);
    expect(res.status).toBe(200);
    expect(queueController.getPendingRequests).toHaveBeenCalled();
  });

  test("PUT /api/queue/status reaches controller", async () => {
    const res = await request(app).put("/api/queue/status").set("Authorization", cocoToken);
    expect(res.status).toBe(200);
    expect(queueController.updateQueueStatus).toHaveBeenCalled();
  });
});
