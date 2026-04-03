/**
 * BRANCH 1c: Auth Middleware Tests
 * Tests auth.middleware.js protect() function
 */
const jwt = require("jsonwebtoken");
const { protect } = require("../../middlewares/auth.middleware");
const User = require("../../models/User.model");
const { TEST_JWT_SECRET, mockObjectId } = require("../utils/helpers");

jest.mock("../../models/User.model");

describe("Auth Middleware - protect", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("should return 401 if no Authorization header", async () => {
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized, no token" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 if Authorization header does not start with Bearer", async () => {
    req.headers.authorization = "Basic sometoken";
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 if token is malformed", async () => {
    req.headers.authorization = "Bearer invalidtoken";
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not authorized, token failed" })
    );
  });

  test("should return 401 if token has wrong secret", async () => {
    const badToken = jwt.sign({ id: "user1" }, "wrong_secret", { expiresIn: "1h" });
    req.headers.authorization = `Bearer ${badToken}`;
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return 401 if token is expired", async () => {
    const expiredToken = jwt.sign(
      { id: mockObjectId("user1") },
      TEST_JWT_SECRET,
      { expiresIn: "-1s" }
    );
    req.headers.authorization = `Bearer ${expiredToken}`;
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("should return 401 if user not found in DB", async () => {
    const userId = mockObjectId("user1");
    const token = jwt.sign({ id: userId }, TEST_JWT_SECRET, { expiresIn: "1h" });
    req.headers.authorization = `Bearer ${token}`;

    const mockSelect = jest.fn().mockResolvedValue(null);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User not found" })
    );
  });

  test("should attach user to req and call next on valid token", async () => {
    const userId = mockObjectId("user1");
    const token = jwt.sign({ id: userId }, TEST_JWT_SECRET, { expiresIn: "1h" });
    req.headers.authorization = `Bearer ${token}`;

    const mockUser = { _id: userId, role: "student", email: "s@test.com" };
    const mockSelect = jest.fn().mockResolvedValue(mockUser);
    User.findById.mockReturnValue({ select: mockSelect });

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
