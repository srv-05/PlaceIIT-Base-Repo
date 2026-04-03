/**
 * BRANCH 2b: Error Middleware Tests
 * Tests error.middleware.js errorHandler() and notFound()
 */
const { errorHandler, notFound } = require("../../middlewares/error.middleware");

describe("Error Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { originalUrl: "/api/test" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    // Suppress console.error during tests
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("errorHandler", () => {
    test("should return error with statusCode from err object", () => {
      const err = new Error("Bad Request");
      err.statusCode = 400;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Bad Request" })
      );
    });

    test("should default to 500 if no statusCode on err", () => {
      const err = new Error("Something broke");
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Something broke" })
      );
    });

    test("should default message to Internal Server Error if none provided", () => {
      const err = {};
      err.stack = "stack trace";
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal Server Error" })
      );
    });

    test("should include stack trace in development mode", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      const err = new Error("Dev error");
      err.stack = "Error: Dev error\n    at test.js:1";
      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stack: expect.any(String) })
      );
      process.env.NODE_ENV = origEnv;
    });

    test("should NOT include stack trace in production mode", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const err = new Error("Prod error");
      err.stack = "Error: Prod error\n    at test.js:1";
      errorHandler(err, req, res, next);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.stack).toBeUndefined();
      process.env.NODE_ENV = origEnv;
    });

    test("should handle errors with custom statusCode 422", () => {
      const err = new Error("Validation failed");
      err.statusCode = 422;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });

  describe("notFound", () => {
    test("should return 404 with route info", () => {
      req.originalUrl = "/api/nonexistent";
      notFound(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("/api/nonexistent"),
        })
      );
    });

    test("should include the original URL in the message", () => {
      req.originalUrl = "/api/unknown/path";
      notFound(req, res, next);
      expect(res.json).toHaveBeenCalledWith({
        message: "Route not found: /api/unknown/path",
      });
    });
  });
});
