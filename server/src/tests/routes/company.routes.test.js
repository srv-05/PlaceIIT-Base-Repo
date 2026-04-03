const request = require("supertest");
const { createApp } = require("../utils/testApp");
const companyController = require("../../controllers/company.controller");
const { generateTestToken } = require("../utils/helpers");

jest.mock("../../controllers/company.controller", () => ({
  getCompany: jest.fn((req, res) => res.status(200).json({ success: true, from: "getCompany" })),
  getCompanyQueue: jest.fn((req, res) => res.status(200).json({ success: true, from: "getCompanyQueue" }))
}));

// Route test bypassing realistic mock DB, just checks if endpoint reaches controller
jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.user = { id: "user1", role: "company" };
    next();
  })
}));

describe("Company Routes", () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    token = generateTestToken("company");
    jest.clearAllMocks();
  });

  test("GET /api/company/:id requires auth", async () => {
    const res = await request(app).get("/api/company/company1");
    expect(res.status).toBe(401);
  });

  test("GET /api/company/:id reaches controller", async () => {
    const res = await request(app)
      .get("/api/company/company1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(companyController.getCompany).toHaveBeenCalled();
  });

  test("GET /api/company/:id/queue requires auth", async () => {
    const res = await request(app).get("/api/company/company1/queue");
    expect(res.status).toBe(401);
  });

  test("GET /api/company/:id/queue reaches controller", async () => {
    const res = await request(app)
      .get("/api/company/company1/queue")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(companyController.getCompanyQueue).toHaveBeenCalled();
  });
});
