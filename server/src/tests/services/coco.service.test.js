/**
 * BRANCH 8f: CoCo Service Tests
 * Tests coco.service.js createCoco
 */
const User = require("../../models/User.model");
const Coordinator = require("../../models/Coordinator.model");
const { sendCocoWelcomeEmail } = require("../../services/email.service");

jest.mock("../../models/User.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../services/email.service");

const { createCoco } = require("../../services/coco.service");

describe("CoCo Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("should throw if required fields missing", async () => {
    await expect(createCoco({ name: "Test" })).rejects.toThrow("required");
  });

  test("should throw on invalid email", async () => {
    await expect(createCoco({
      name: "T", email: "bad", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("Invalid email");
  });

  test("should throw on invalid phone", async () => {
    await expect(createCoco({
      name: "T", email: "t@t.com", rollNumber: "R1", contact: "123",
    })).rejects.toThrow("Invalid phone");
  });

  test("should throw if email exists", async () => {
    User.findOne.mockResolvedValue({ _id: "existing" });
    await expect(createCoco({
      name: "T", email: "t@t.com", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("already exists");
  });

  test("should throw if roll number exists", async () => {
    User.findOne.mockResolvedValue(null);
    Coordinator.findOne.mockResolvedValue({ _id: "existing" });
    await expect(createCoco({
      name: "T", email: "t@t.com", rollNumber: "R1", contact: "1234567890",
    })).rejects.toThrow("already exists");
  });

  test("should create coco successfully", async () => {
    User.findOne.mockResolvedValue(null);
    Coordinator.findOne.mockResolvedValue(null);
    Coordinator.countDocuments.mockResolvedValue(0);
    User.exists.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "u1" });
    Coordinator.create.mockResolvedValue({ _id: "c1", name: "CoCo" });
    sendCocoWelcomeEmail.mockResolvedValue({});

    const result = await createCoco({
      name: "CoCo", email: "coco@test.com", rollNumber: "CC001", contact: "1234567890",
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "coco", mustChangePassword: true })
    );
    expect(result.coco).toEqual({ _id: "c1", name: "CoCo" });
    expect(result.credentials).toEqual(
      expect.objectContaining({ instituteId: "coco1" })
    );
  });

  test("should throw partial success error if email fails", async () => {
    User.findOne.mockResolvedValue(null);
    Coordinator.findOne.mockResolvedValue(null);
    Coordinator.countDocuments.mockResolvedValue(0);
    User.exists.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: "u1" });
    Coordinator.create.mockResolvedValue({ _id: "c1" });
    sendCocoWelcomeEmail.mockRejectedValue(new Error("SMTP failed"));

    await expect(createCoco({
      name: "CoCo", email: "c@t.com", rollNumber: "CC1", contact: "1234567890",
    })).rejects.toThrow("Account created successfully, but welcome email failed");
  });

  test("should generate unique instituteId", async () => {
    User.findOne.mockResolvedValue(null);
    Coordinator.findOne.mockResolvedValue(null);
    Coordinator.countDocuments.mockResolvedValue(2);
    User.exists
      .mockResolvedValueOnce({ _id: "existing" }) // coco3 exists
      .mockResolvedValueOnce(null);                // coco4 is free
    User.create.mockResolvedValue({ _id: "u1" });
    Coordinator.create.mockResolvedValue({ _id: "c1" });
    sendCocoWelcomeEmail.mockResolvedValue({});

    const result = await createCoco({
      name: "C", email: "c@t.com", rollNumber: "R1", contact: "1234567890",
    });
    expect(result.credentials.instituteId).toBe("coco4");
  });
});
