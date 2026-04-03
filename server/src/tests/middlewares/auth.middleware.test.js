const { protect } = require("../../middlewares/auth.middleware");
const { verifyToken } = require("../../utils/generateToken");
const User = require("../../models/User.model");

jest.mock("../../utils/generateToken");
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

  test("missing Authorization header should return 401", async () => {
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, no token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("malformed Authorization header should return 401", async () => {
    req.headers.authorization = "BearerTokenNoSpace";
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("token verification failure should return 401", async () => {
    req.headers.authorization = "Bearer invalidtoken";
    verifyToken.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, token failed" });
    expect(next).not.toHaveBeenCalled();
  });

  test("expired token should return 401", async () => {
    req.headers.authorization = "Bearer expiredtoken";
    verifyToken.mockImplementation(() => {
      throw new Error("Token expired");
    });

    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, token failed" });
  });

  test("user not found from token should return 401", async () => {
    req.headers.authorization = "Bearer validtoken";
    verifyToken.mockReturnValue({ id: "user123" });
    
    // mock User.findById() chaining
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null)
    });

    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    expect(next).not.toHaveBeenCalled();
  });

  test("valid token should call next and set req.user", async () => {
    req.headers.authorization = "Bearer validtoken";
    verifyToken.mockReturnValue({ id: "user123" });
    
    const mockUser = { id: "user123", email: "test@domain.com" };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    await protect(req, res, next);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
});
