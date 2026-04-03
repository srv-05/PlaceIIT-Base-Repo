const request = require("supertest");
const { createApp } = require("../utils/testApp");
const studentController = require("../../controllers/student.controller");
const adminController = require("../../controllers/admin.controller");

jest.mock("../../controllers/student.controller", () => ({
  getProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  getMyCompanies: jest.fn((req, res) => res.status(200).json({ success: true })),
  joinQueue: jest.fn((req, res) => res.status(200).json({ success: true })),
  joinWalkIn: jest.fn((req, res) => res.status(200).json({ success: true })),
  leaveQueue: jest.fn((req, res) => res.status(200).json({ success: true })),
  confirmSwitch: jest.fn((req, res) => res.status(200).json({ success: true })),
  getWalkIns: jest.fn((req, res) => res.status(200).json({ success: true })),
  getQueuePosition: jest.fn((req, res) => res.status(200).json({ success: true })),
  getNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  markNotifRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  markAllNotifRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  clearAllNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  submitQuery: jest.fn((req, res) => res.status(200).json({ success: true })),
  getMyQueries: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadResume: jest.fn((req, res) => res.status(200).json({ success: true }))
}));

jest.mock("../../controllers/admin.controller");

jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ message: "Not authorized" });
    const role = req.headers.authorization.split(" ")[2] || "student";
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

describe("Student Routes", () => {
  let app;
  let studentToken;
  let adminToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    studentToken = `Bearer mocktoken student`;
    adminToken = `Bearer mocktoken admin`;
    jest.clearAllMocks();
  });

  test("should block unauthenticated requests", async () => {
    const res = await request(app).get("/api/student/profile");
    expect(res.status).toBe(401);
  });

  test("should block non-student roles", async () => {
    const res = await request(app).get("/api/student/profile").set("Authorization", adminToken);
    expect(res.status).toBe(403);
  });

  test("GET /api/student/profile routes to controller", async () => {
    const res = await request(app).get("/api/student/profile").set("Authorization", studentToken);
    expect(res.status).toBe(200);
    expect(studentController.getProfile).toHaveBeenCalled();
  });

  test("POST /api/student/queue/join routes to controller", async () => {
    const res = await request(app).post("/api/student/queue/join").set("Authorization", studentToken);
    expect(res.status).toBe(200);
    expect(studentController.joinQueue).toHaveBeenCalled();
  });
});
