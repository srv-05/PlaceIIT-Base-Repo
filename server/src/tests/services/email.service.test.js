/**
 * BRANCH 8a: Email Service Tests
 * Tests email.service.js sendOtpEmail, sendWelcomeEmail, sendCocoWelcomeEmail, sendApcWelcomeEmail
 */
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

const nodemailer = require("nodemailer");
const mockTransporter = nodemailer.createTransport();

describe("Email Service", () => {
  let emailService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require to get fresh module with our mock
    jest.resetModules();
    jest.mock("nodemailer", () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn(),
      }),
    }));
    // Suppress console output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    emailService = require("../../services/email.service");
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe("sendOtpEmail", () => {
    test("should call sendMail with correct params", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockResolvedValue({ messageId: "msg1" });

      await emailService.sendOtpEmail("test@example.com", "123456");

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: expect.stringContaining("OTP"),
          html: expect.stringContaining("123456"),
        })
      );
    });

    test("should throw on transporter failure", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockRejectedValue(new Error("SMTP Error"));

      await expect(emailService.sendOtpEmail("test@test.com", "123456")).rejects.toThrow("SMTP Error");
    });
  });

  describe("sendWelcomeEmail", () => {
    test("should call sendMail with correct template", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockResolvedValue({ messageId: "msg2" });

      await emailService.sendWelcomeEmail("student@test.com", "John", "CS001", "username", "pass123");

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "student@test.com",
          subject: expect.stringContaining("Welcome"),
          html: expect.stringContaining("John"),
        })
      );
    });

    test("should throw on failure", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockRejectedValue(new Error("Send failed"));

      await expect(
        emailService.sendWelcomeEmail("s@t.com", "Name", "R1", "user", "pass")
      ).rejects.toThrow("Send failed");
    });
  });

  describe("sendCocoWelcomeEmail", () => {
    test("should call sendMail with Co-Co template", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockResolvedValue({ messageId: "msg3" });

      await emailService.sendCocoWelcomeEmail("coco@test.com", "CoCo User", "coco1", "pass123");

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "coco@test.com",
          subject: expect.stringContaining("Co-Co"),
        })
      );
    });
  });

  describe("sendApcWelcomeEmail", () => {
    test("should call sendMail with APC template", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockResolvedValue({ messageId: "msg4" });

      await emailService.sendApcWelcomeEmail("apc@test.com", "APC User", "apc1", "pass123");

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "apc@test.com",
          subject: expect.stringContaining("APC"),
        })
      );
    });

    test("should throw on failure", async () => {
      const transporter = require("nodemailer").createTransport();
      transporter.sendMail.mockRejectedValue(new Error("Auth failed"));

      await expect(
        emailService.sendApcWelcomeEmail("a@t.com", "N", "a1", "p")
      ).rejects.toThrow("Auth failed");
    });
  });
});
