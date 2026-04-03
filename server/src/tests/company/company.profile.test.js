const request = require("supertest");
const { createApp } = require("../utils/testApp");
const Company = require("../../models/Company.model");
const { generateTestToken } = require("../utils/helpers");

jest.mock("../../models/Company.model");

jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ message: "Not authorized" });
    const tokenParts = req.headers.authorization.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") return res.status(401).json({ message: "Not authorized" });
    next();
  })
}));

// We only test existing routes from company.routes.js
// Currently GET /api/company/:id is available
describe("Company Profile Routes", () => {
  let app;
  let validToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    validToken = generateTestToken("company", "company1");
    jest.clearAllMocks();
  });

  describe("GET /api/company/:id", () => {
    test("should return 401 if unauthenticated", async () => {
      const res = await request(app).get("/api/company/company1");
      expect(res.status).toBe(401);
    });

    test("should return company profile with valid data", async () => {
      Company.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn(),
        then: jest.fn((resolve) => resolve({ _id: "company1", name: "TechCorp" }))
      });
      // the controller awaits findById(id).populate...
      Company.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ _id: "company1", name: "TechCorp" })
        })
      });

      const res = await request(app)
        .get("/api/company/company1")
        .set("Authorization", `Bearer ${validToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("TechCorp");
    });
    
    test("should return 404 if company not found", async () => {
      Company.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      const res = await request(app)
        .get("/api/company/missing")
        .set("Authorization", `Bearer ${validToken}`);
      
      expect(res.status).toBe(404);
    });
  });
});
