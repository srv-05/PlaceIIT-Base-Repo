/**
 * BRANCH 1a: Auth Signup/Register Tests
 * Tests auth.controller.js register() function
 */
const { register } = require("../../controllers/auth.controller");
const User = require("../../models/User.model");
const Student = require("../../models/Student.model");
const Coordinator = require("../../models/Coordinator.model");

jest.mock("../../models/User.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../models/Apc.model");
jest.mock("../../utils/generateToken");
jest.mock("../../services/email.service");

describe("Auth Controller - register", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("should return 400 if user already exists", async () => {
    req.body = {
      instituteId: "STU001",
      email: "student@test.com",
      password: "password123",
      role: "student",
      name: "Test Student",
      rollNumber: "CS001",
    };
    User.findOne.mockResolvedValue({ _id: "existing" });

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User already exists" })
    );
  });

  test("should create student user and student profile", async () => {
    req.body = {
      instituteId: "STU002",
      email: "newstudent@test.com",
      password: "password123",
      role: "student",
      name: "New Student",
      rollNumber: "CS002",
    };
    User.findOne.mockResolvedValue(null);
    const createdUser = { _id: "newuser1" };
    User.create.mockResolvedValue(createdUser);
    Student.create.mockResolvedValue({});

    await register(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        instituteId: "STU002",
        email: "newstudent@test.com",
        role: "student",
      })
    );
    expect(Student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "newuser1",
        name: "New Student",
        rollNumber: "CS002",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User registered successfully" })
    );
  });

  test("should create coordinator user and coordinator profile", async () => {
    req.body = {
      instituteId: "COCO001",
      email: "coco@test.com",
      password: "password123",
      role: "coco",
      name: "Test Coordinator",
      rollNumber: "CC001",
    };
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "newcoco1" });
    Coordinator.create.mockResolvedValue({});

    await register(req, res);

    expect(Coordinator.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "newcoco1",
        name: "Test Coordinator",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should handle admin role (no student/coco profile created)", async () => {
    req.body = {
      instituteId: "ADM001",
      email: "admin@test.com",
      password: "password123",
      role: "admin",
      name: "Admin",
    };
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "admin1" });

    await register(req, res);

    expect(Student.create).not.toHaveBeenCalled();
    expect(Coordinator.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should return 500 on unexpected error", async () => {
    req.body = {
      instituteId: "STU001",
      email: "s@t.com",
      password: "p",
      role: "student",
    };
    User.findOne.mockRejectedValue(new Error("DB error"));

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
