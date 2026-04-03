const request = require("supertest");
const { createApp } = require("../utils/testApp");
const authController = require("../../controllers/auth.controller");
const { generateTestToken } = require("../utils/helpers");

// Mock the entire controller
jest.mock("../../controllers/auth.controller", () => ({
  login: jest.fn((req, res) => res.status(200).json({ success: true, from: "login" })),
  getMe: jest.fn((req, res) => res.status(200).json({ success: true, from: "getMe" })),
  register: jest.fn((req, res) => res.status(201).json({ success: true, from: "register" })),
  changePassword: jest.fn((req, res) => res.status(200).json({ success: true, from: "changePassword" })),
  sendOtp: jest.fn((req, res) => res.status(200).json({ success: true, from: "sendOtp" })),
  verifyOtp: jest.fn((req, res) => res.status(200).json({ success: true, from: "verifyOtp" })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ success: true, from: "resetPassword" }))
}));

// We need to bypass the actual DB-dependent protect middleware for route existence tests
jest.mock("../../middlewares/auth.middleware", () => ({
  protect: jest.fn((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
    req.user = { role: "admin", id: "admin1" };
    next();
  })
}));

describe("Auth Routes", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/auth/login", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(200);
    expect(authController.login).toHaveBeenCalled();
  });

  test("GET /api/auth/me should return 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me should reach controller with token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer mocktoken");
    expect(res.status).toBe(200);
    expect(authController.getMe).toHaveBeenCalled();
  });

  test("POST /api/auth/register should require token", async () => {
    const res = await request(app).post("/api/auth/register");
    expect(res.status).toBe(401);
  });

  test("POST /api/auth/register should reach controller with token and admin role", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", "Bearer mocktoken");
    expect(res.status).toBe(201);
    expect(authController.register).toHaveBeenCalled();
  });

  test("POST /api/auth/forgot-password/send-otp", async () => {
    const res = await request(app).post("/api/auth/forgot-password/send-otp");
    expect(res.status).toBe(200);
    expect(authController.sendOtp).toHaveBeenCalled();
  });

  test("POST /api/auth/forgot-password/verify-otp", async () => {
    const res = await request(app).post("/api/auth/forgot-password/verify-otp");
    expect(res.status).toBe(200);
    expect(authController.verifyOtp).toHaveBeenCalled();
  });

  test("POST /api/auth/forgot-password/reset", async () => {
    const res = await request(app).post("/api/auth/forgot-password/reset");
    expect(res.status).toBe(200);
    expect(authController.resetPassword).toHaveBeenCalled();
  });

  test("POST /api/auth/change-password should reach controller", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer mocktoken");
    expect(res.status).toBe(200);
    expect(authController.changePassword).toHaveBeenCalled();
  });
});
