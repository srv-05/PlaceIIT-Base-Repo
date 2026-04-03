/**
 * BRANCH 1b: Auth Login Tests
 * Tests auth.controller.js login() function
 */
const { login } = require("../../controllers/auth.controller");
const User = require("../../models/User.model");
const { generateToken } = require("../../utils/generateToken");

jest.mock("../../models/User.model");
jest.mock("../../utils/generateToken");
jest.mock("../../services/email.service");

describe("Auth Controller - login", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("should return 400 if instituteId is missing", async () => {
    req.body = { password: "password123" };
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  test("should return 400 if password is missing", async () => {
    req.body = { instituteId: "STU001" };
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("should return 401 if user not found", async () => {
    req.body = { instituteId: "NONEXIST", password: "password123" };
    User.findOne.mockResolvedValue(null);
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid credentials" })
    );
  });

  test("should return 403 if account is deactivated", async () => {
    req.body = { instituteId: "STU001", password: "password123" };
    User.findOne.mockResolvedValue({
      _id: "user1",
      instituteId: "STU001",
      isActive: false,
      comparePassword: jest.fn(),
    });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "This account is deactivated" })
    );
  });

  test("should return 401 if password does not match", async () => {
    req.body = { instituteId: "STU001", password: "wrongpassword" };
    User.findOne.mockResolvedValue({
      _id: "user1",
      instituteId: "STU001",
      isActive: true,
      comparePassword: jest.fn().mockResolvedValue(false),
    });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid credentials" })
    );
  });

  test("should return 403 if role mismatch", async () => {
    req.body = { instituteId: "STU001", password: "password123", role: "admin" };
    User.findOne.mockResolvedValue({
      _id: "user1",
      instituteId: "STU001",
      isActive: true,
      role: "student",
      comparePassword: jest.fn().mockResolvedValue(true),
    });
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Access denied for this role" })
    );
  });

  test("should return JWT and user on successful login", async () => {
    req.body = { instituteId: "STU001", password: "password123" };
    const mockUser = {
      _id: { toString: () => "user123" },
      instituteId: "STU001",
      email: "student@test.com",
      role: "student",
      isActive: true,
      mustChangePassword: false,
      isMainAdmin: false,
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockResolvedValue(mockUser);
    User.updateOne = jest.fn().mockResolvedValue({});
    generateToken.mockReturnValue("mock-jwt-token");

    await login(req, res);

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: mockUser._id },
      expect.objectContaining({ lastLogin: expect.any(Date) })
    );
    expect(generateToken).toHaveBeenCalledWith({ id: mockUser._id, role: "student" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "mock-jwt-token",
        user: expect.objectContaining({
          id: "user123",
          instituteId: "STU001",
          role: "student",
        }),
      })
    );
  });

  test("should return 500 on unexpected error", async () => {
    req.body = { instituteId: "STU001", password: "pass" };
    User.findOne.mockRejectedValue(new Error("DB down"));
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
