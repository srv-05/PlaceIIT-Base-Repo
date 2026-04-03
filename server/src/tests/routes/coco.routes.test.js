const request = require("supertest");
const { createApp } = require("../utils/testApp");
const cocoController = require("../../controllers/coco.controller");
const adminController = require("../../controllers/admin.controller");

jest.mock("../../controllers/coco.controller", () => {
    const methods = [
        "getAssignedCompany", "getShortlistedStudents", "addStudentToQueue",
        "updateStudentStatus", "sendNotification", "toggleWalkIn",
        "addPanel", "getPanels", "updatePanel", "assignPanelStudent", "clearPanel",
        "getRounds", "addRound", "getPredefinedNotifications",
        "searchAllStudents", "addStudentToRound", "uploadStudentsToRound",
        "getCocoNotifications", "markNotifRead", "clearAllNotifications", "addStudentToCompany",
        "promoteStudentsViaExcel",
        "getPendingRequests", "acceptStudent", "rejectStudent", "markCompleted",
        "updateCompanyVenue"
    ];
    const mocks = {};
    methods.forEach(m => {
        mocks[m] = jest.fn((req, res) => res.status(200).json({ success: true }));
    });
    return mocks;
});

jest.mock("../../controllers/admin.controller");

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

describe("Coco Routes", () => {
  let app;
  let cocoToken, studentToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    cocoToken = `Bearer mocktoken coco`;
    studentToken = `Bearer mocktoken student`;
    jest.clearAllMocks();
  });

  test("GET /api/coco/company requires auth", async () => {
    const res = await request(app).get("/api/coco/company");
    expect(res.status).toBe(401);
  });

  test("GET /api/coco/company blocks non-coco roles", async () => {
    const res = await request(app).get("/api/coco/company").set("Authorization", studentToken);
    expect(res.status).toBe(403);
  });

  test("GET /api/coco/company reaches controller", async () => {
    const res = await request(app).get("/api/coco/company").set("Authorization", cocoToken);
    expect(res.status).toBe(200);
    expect(cocoController.getAssignedCompany).toHaveBeenCalled();
  });

  test("GET /api/coco/students/search reaches controller", async () => {
    const res = await request(app).get("/api/coco/students/search").set("Authorization", cocoToken);
    expect(res.status).toBe(200);
    expect(cocoController.searchAllStudents).toHaveBeenCalled();
  });
});
