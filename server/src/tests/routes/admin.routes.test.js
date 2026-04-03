const request = require("supertest");
const { createApp } = require("../utils/testApp");
const adminController = require("../../controllers/admin.controller");
const { generateTestToken } = require("../utils/helpers");

// Mock controller
jest.mock("../../controllers/admin.controller", () => ({
  getStats: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCompanies: jest.fn((req, res) => res.status(200).json({ success: true })),
  addCompany: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateCompany: jest.fn((req, res) => res.status(200).json({ success: true })),
  searchStudents: jest.fn((req, res) => res.status(200).json({ success: true })),
  addStudent: jest.fn((req, res) => res.status(201).json({ success: true })),
  addApc: jest.fn((req, res) => res.status(201).json({ success: true })),
  getStudentCompanies: jest.fn((req, res) => res.status(200).json({ success: true })),
  getShortlistedStudents: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCocos: jest.fn((req, res) => res.status(200).json({ success: true })),
  addCoco: jest.fn((req, res) => res.status(201).json({ success: true })),
  assignCoco: jest.fn((req, res) => res.status(200).json({ success: true })),
  removeCoco: jest.fn((req, res) => res.status(200).json({ success: true })),
  getApcs: jest.fn((req, res) => res.status(200).json({ success: true })),
  removeApc: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadCompanyExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadShortlistExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadCocoExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadApcExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadStudentExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  uploadCocoRequirementsExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUploadStatus: jest.fn((req, res) => res.status(200).json({ success: true })),
  shortlistStudents: jest.fn((req, res) => res.status(200).json({ success: true })),
  autoAllocateCocos: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCocoConflicts: jest.fn((req, res) => res.status(200).json({ success: true })),
  getQueries: jest.fn((req, res) => res.status(200).json({ success: true })),
  respondToQuery: jest.fn((req, res) => res.status(200).json({ success: true })),
  getDriveState: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateDriveState: jest.fn((req, res) => res.status(200).json({ success: true })),
  sendBroadcastNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  getApcNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  markApcNotifRead: jest.fn((req, res) => res.status(200).json({ success: true })),
  clearAllApcNotifications: jest.fn((req, res) => res.status(200).json({ success: true }))
}));

// Mock middlewares
jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ message: "Not authorized" });
    const role = req.headers.authorization.split(" ")[2] || "admin";
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

jest.mock("../../middlewares/excelUpload.middleware", () => {
  return {
    single: () => (req, res, next) => next()
  };
});

describe("Admin Routes", () => {
  let app;
  let adminToken;
  let studentToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    adminToken = `Bearer mocktoken admin`;
    studentToken = `Bearer mocktoken student`;
    jest.clearAllMocks();
  });

  test("GET /api/admin/stats requires auth", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  test("GET /api/admin/stats requires admin role", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", studentToken);
    expect(res.status).toBe(403);
  });

  test("GET /api/admin/stats reaches controller for admin", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", adminToken);
    expect(res.status).toBe(200);
    expect(adminController.getStats).toHaveBeenCalled();
  });

  const routes = [
    { method: "get", path: "/api/admin/companies", action: adminController.getCompanies },
    { method: "post", path: "/api/admin/companies", action: adminController.addCompany },
    { method: "put", path: "/api/admin/companies/1", action: adminController.updateCompany },
    { method: "get", path: "/api/admin/students/search", action: adminController.searchStudents },
    { method: "post", path: "/api/admin/students/shortlist", action: adminController.shortlistStudents },
    { method: "get", path: "/api/admin/cocos", action: adminController.getCocos },
    { method: "get", path: "/api/admin/drive-state", action: adminController.getDriveState },
  ];

  routes.forEach(route => {
    test(`${route.method.toUpperCase()} ${route.path} reaches controller`, async () => {
      const res = await request(app)[route.method](route.path).set("Authorization", adminToken);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect(route.action).toHaveBeenCalled();
    });
  });
});
