/**
 * BRANCH 8c: APC Service Tests
 * Tests apc.service.js createApc
 */
const User = require("../../models/User.model");
const Apc = require("../../models/Apc.model");
const { sendApcWelcomeEmail } = require("../../services/email.service");

jest.mock("../../models/User.model");
jest.mock("../../models/Apc.model");
jest.mock("../../services/email.service");

const { createApc } = require("../../services/apc.service");

describe("APC Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("should throw if required fields missing", async () => {
    await expect(createApc({ name: "Test" })).rejects.toThrow("required");
  });

  test("should throw on invalid email format", async () => {
    await expect(createApc({
      name: "Test", email: "invalidemail", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("Invalid email");
  });

  test("should throw on invalid phone format", async () => {
    await expect(createApc({
      name: "Test", email: "test@test.com", rollNumber: "R1", contact: "123",
    })).rejects.toThrow("Invalid phone");
  });

  test("should throw if email already exists", async () => {
    User.findOne.mockResolvedValue({ _id: "existing" });
    await expect(createApc({
      name: "Test", email: "test@test.com", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("already exists");
  });

  test("should throw if roll number already exists", async () => {
    User.findOne.mockResolvedValue(null);
    Apc.findOne.mockResolvedValue({ _id: "existing" });
    await expect(createApc({
      name: "Test", email: "test@test.com", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("already exists");
  });

  test("should create APC and user successfully", async () => {
    User.findOne.mockResolvedValue(null);
    Apc.findOne.mockResolvedValue(null);
    Apc.countDocuments.mockResolvedValue(0);
    User.exists.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "newuser1" });
    Apc.create.mockResolvedValue({ _id: "newapc1", name: "APC Test" });
    sendApcWelcomeEmail.mockResolvedValue({});

    const result = await createApc({
      name: "APC Test",
      email: "apc@test.com",
      rollNumber: "APC001",
      contact: "1234567890",
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "apc@test.com",
        role: "admin",
        mustChangePassword: true,
      })
    );
    expect(Apc.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "newuser1",
        name: "APC Test",
      })
    );
    expect(result.emailSent).toBe(true);
  });

  test("should handle email send failure gracefully", async () => {
    User.findOne.mockResolvedValue(null);
    Apc.findOne.mockResolvedValue(null);
    Apc.countDocuments.mockResolvedValue(0);
    User.exists.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "newuser1" });
    Apc.create.mockResolvedValue({ _id: "newapc1" });
    sendApcWelcomeEmail.mockRejectedValue(new Error("SMTP failed"));

    const result = await createApc({
      name: "APC", email: "a@t.com", rollNumber: "R1", contact: "1234567890",
    });
    expect(result.emailSent).toBe(false);
  });
});
