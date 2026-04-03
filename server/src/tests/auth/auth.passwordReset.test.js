/**
 * BRANCH 1d: Auth Password Reset Tests
 * Tests sendOtp, verifyOtp, resetPassword, changePassword from auth.controller.js
 */
const { sendOtp, verifyOtp, resetPassword, changePassword } = require("../../controllers/auth.controller");
const User = require("../../models/User.model");
const Student = require("../../models/Student.model");
const { sendOtpEmail } = require("../../services/email.service");

jest.mock("../../models/User.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../models/Apc.model");
jest.mock("../../services/email.service");
jest.mock("../../utils/generateToken");

describe("Auth Controller - Password Reset (OTP)", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: { id: "user1" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // --- sendOtp ---
  describe("sendOtp", () => {
    test("should return 400 if email is missing", async () => {
      req.body = {};
      await sendOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 404 if user not found", async () => {
      req.body = { email: "nonexist@test.com" };
      User.findOne.mockResolvedValue(null);
      await sendOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should return 403 if account is deactivated", async () => {
      req.body = { email: "test@test.com" };
      User.findOne.mockResolvedValue({ email: "test@test.com", isActive: false, role: "student" });
      await sendOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test("should return 404 if role does not match", async () => {
      req.body = { email: "test@test.com", role: "admin" };
      User.findOne.mockResolvedValue({ _id: "u1", email: "test@test.com", isActive: true, role: "student" });
      await sendOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should send OTP email on success", async () => {
      req.body = { email: "test@test.com" };
      User.findOne.mockResolvedValue({ _id: "u1", email: "test@test.com", isActive: true, role: "student" });
      User.updateOne = jest.fn().mockResolvedValue({});
      sendOtpEmail.mockResolvedValue({});

      await sendOtp(req, res);

      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: "u1" },
        expect.objectContaining({ otpCode: expect.any(String), otpExpiry: expect.any(Date) })
      );
      expect(sendOtpEmail).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "OTP sent to your email address" })
      );
    });

    test("should handle apc role mapping", async () => {
      req.body = { email: "admin@test.com", role: "apc" };
      User.findOne.mockResolvedValue({ _id: "u1", email: "admin@test.com", isActive: true, role: "admin" });
      User.updateOne = jest.fn().mockResolvedValue({});
      sendOtpEmail.mockResolvedValue({});

      await sendOtp(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "OTP sent to your email address" })
      );
    });
  });

  // --- verifyOtp ---
  describe("verifyOtp", () => {
    test("should return 400 if email or otp missing", async () => {
      req.body = { email: "test@test.com" };
      await verifyOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if user not found or no otpCode", async () => {
      req.body = { email: "test@test.com", otp: "123456" };
      User.findOne.mockResolvedValue(null);
      await verifyOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if OTP expired", async () => {
      req.body = { email: "test@test.com", otp: "123456" };
      User.findOne.mockResolvedValue({
        email: "test@test.com",
        otpCode: "123456",
        otpExpiry: new Date(Date.now() - 60000), // expired
        role: "student",
      });
      await verifyOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("expired") })
      );
    });

    test("should return 400 if OTP is incorrect", async () => {
      req.body = { email: "test@test.com", otp: "000000" };
      User.findOne.mockResolvedValue({
        email: "test@test.com",
        otpCode: "123456",
        otpExpiry: new Date(Date.now() + 600000),
        role: "student",
      });
      await verifyOtp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Incorrect") })
      );
    });

    test("should return success on valid OTP", async () => {
      req.body = { email: "test@test.com", otp: "123456" };
      User.findOne.mockResolvedValue({
        email: "test@test.com",
        otpCode: "123456",
        otpExpiry: new Date(Date.now() + 600000),
        role: "student",
      });
      await verifyOtp(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "OTP verified successfully" })
      );
    });
  });

  // --- resetPassword ---
  describe("resetPassword", () => {
    test("should return 400 if email, otp, or newPassword missing", async () => {
      req.body = { email: "test@test.com", otp: "123456" };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if password too short", async () => {
      req.body = { email: "test@test.com", otp: "123456", newPassword: "abc" };
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if user not found or no OTP set", async () => {
      req.body = { email: "test@test.com", otp: "123456", newPassword: "newpass123" };
      User.findOne.mockResolvedValue(null);
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if OTP expired", async () => {
      req.body = { email: "test@test.com", otp: "123456", newPassword: "newpass123" };
      User.findOne.mockResolvedValue({
        otpCode: "123456",
        otpExpiry: new Date(Date.now() - 60000),
        role: "student",
      });
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if OTP incorrect", async () => {
      req.body = { email: "test@test.com", otp: "000000", newPassword: "newpass123" };
      User.findOne.mockResolvedValue({
        otpCode: "123456",
        otpExpiry: new Date(Date.now() + 600000),
        role: "student",
      });
      await resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should reset password on valid OTP", async () => {
      const mockUser = {
        otpCode: "123456",
        otpExpiry: new Date(Date.now() + 600000),
        role: "student",
        save: jest.fn().mockResolvedValue({}),
      };
      req.body = { email: "test@test.com", otp: "123456", newPassword: "newpass123" };
      User.findOne.mockResolvedValue(mockUser);

      await resetPassword(req, res);

      expect(mockUser.password).toBe("newpass123");
      expect(mockUser.otpCode).toBeUndefined();
      expect(mockUser.otpExpiry).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Password reset successfully" })
      );
    });
  });

  // --- changePassword ---
  describe("changePassword", () => {
    test("should return 400 if newPassword is missing or too short", async () => {
      req.body = { newPassword: "abc" };
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 404 if user not found", async () => {
      req.body = { newPassword: "newpass123" };
      User.findById.mockResolvedValue(null);
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should return 401 if current password is incorrect", async () => {
      req.body = { newPassword: "newpass123", currentPassword: "wrongold" };
      User.findById.mockResolvedValue({
        _id: "user1",
        role: "student",
        comparePassword: jest.fn().mockResolvedValue(false),
      });
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test("should return 400 if new password same as current", async () => {
      req.body = { newPassword: "samepass", currentPassword: "samepass" };
      const mockUser = {
        _id: "user1",
        role: "admin",
        comparePassword: jest.fn()
          .mockResolvedValueOnce(true)   // currentPassword matches
          .mockResolvedValueOnce(true),  // newPassword is same
        save: jest.fn(),
      };
      User.findById.mockResolvedValue(mockUser);
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("different") })
      );
    });

    test("should change password successfully", async () => {
      req.body = { newPassword: "newpass123" };
      const mockUser = {
        _id: "user1",
        instituteId: "STU001",
        email: "s@test.com",
        role: "admin",
        isMainAdmin: false,
        save: jest.fn().mockResolvedValue({}),
      };
      User.findById.mockResolvedValue(mockUser);

      await changePassword(req, res);

      expect(mockUser.password).toBe("newpass123");
      expect(mockUser.mustChangePassword).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Password changed successfully" })
      );
    });

    test("should update student emergency contact when provided", async () => {
      req.body = {
        newPassword: "newpass123",
        emergencyContact: { name: "Mom", phone: "9876543210" },
      };
      const mockUser = {
        _id: "user1",
        instituteId: "STU001",
        email: "s@test.com",
        role: "student",
        isMainAdmin: false,
        save: jest.fn().mockResolvedValue({}),
      };
      User.findById.mockResolvedValue(mockUser);
      Student.findOneAndUpdate.mockResolvedValue({});

      await changePassword(req, res);

      expect(Student.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user1" },
        expect.objectContaining({
          emergencyContact: { name: "Mom", phone: "9876543210" },
          profileCompleted: true,
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Password changed successfully" })
      );
    });
  });
});
