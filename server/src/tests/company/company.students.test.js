const request = require("supertest");
const { createApp } = require("../utils/testApp");
const Queue = require("../../models/Queue.model");
const { generateTestToken } = require("../utils/helpers");

jest.mock("../../models/Queue.model");

jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ message: "Not authorized" });
    const tokenParts = req.headers.authorization.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") return res.status(401).json({ message: "Not authorized" });
    next();
  })
}));

describe("Company Students/Queue Routes", () => {
  let app;
  let validToken;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    validToken = generateTestToken("company", "company1");
    jest.clearAllMocks();
  });

  describe("GET /api/company/:id/queue", () => {
    test("should return queue for a company", async () => {
      Queue.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([
            { studentId: "student1", position: 1 },
            { studentId: "student2", position: 2 }
          ])
        })
      });

      const res = await request(app)
        .get("/api/company/company1/queue")
        .set("Authorization", `Bearer ${validToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].position).toBe(1);
    });

    test("should handle error if DB query fails", async () => {
      Queue.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error("DB Error"))
        })
      });

      const res = await request(app)
        .get("/api/company/company1/queue")
        .set("Authorization", `Bearer ${validToken}`);
      
      expect(res.status).toBe(500);
      expect(res.body.message).toBe("DB Error");
    });
  });
});
