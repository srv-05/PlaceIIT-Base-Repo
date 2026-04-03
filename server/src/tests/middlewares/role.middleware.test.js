/**
 * BRANCH 2a: Role Middleware Tests
 * Tests role.middleware.js authorize() function
 */
const { authorize } = require("../../middlewares/role.middleware");

describe("Role Middleware - authorize", () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("should allow admin role on admin-only route", () => {
    req.user = { role: "admin" };
    const middleware = authorize("admin");
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("should block student role from admin-only route with 403", () => {
    req.user = { role: "student" };
    const middleware = authorize("admin");
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("should block company role from student route with 403", () => {
    req.user = { role: "company" };
    const middleware = authorize("student");
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("should allow coco on coco-or-admin route", () => {
    req.user = { role: "coco" };
    const middleware = authorize("coco", "admin");
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("should allow admin on coco-or-admin route", () => {
    req.user = { role: "admin" };
    const middleware = authorize("coco", "admin");
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("should block student from coco-or-admin route", () => {
    req.user = { role: "student" };
    const middleware = authorize("coco", "admin");
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Access denied"),
      })
    );
  });

  test("should include required roles in error message", () => {
    req.user = { role: "student" };
    const middleware = authorize("admin");
    middleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("admin"),
      })
    );
  });
});
