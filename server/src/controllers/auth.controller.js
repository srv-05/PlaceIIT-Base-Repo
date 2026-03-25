const User = require("../models/User.model");
const Student = require("../models/Student.model");
const Coordinator = require("../models/Coordinator.model");
const { generateToken } = require("../utils/generateToken");
const { ROLES } = require("../utils/constants");
const { sendOtpEmail } = require("../services/email.service");

// @desc    Login user with institute credentials
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { instituteId, password, role } = req.body;

    if (!instituteId || !password)
      return res.status(400).json({ message: "Institute ID and password are required" });

    const user = await User.findOne({ instituteId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account is deactivated" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: "Access denied for this role" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({ id: user._id, role: user.role });

    res.json({
      token,
      user: { 
        id: user._id.toString(), 
        instituteId: user.instituteId, 
        role: user.role, 
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        isMainAdmin: user.isMainAdmin
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Register user (admin only or seeding)
// @route   POST /api/auth/register
// @access  Private/Admin
const register = async (req, res) => {
  try {
    const { instituteId, email, password, role, name, rollNumber } = req.body;

    const existing = await User.findOne({ $or: [{ instituteId }, { email }] });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ instituteId, email, password, role });

    if (role === ROLES.STUDENT) {
      await Student.create({ userId: user._id, name, rollNumber });
    } else if (role === ROLES.COCO) {
      await Coordinator.create({ userId: user._id, name, rollNumber });
    }

    res.status(201).json({ message: "User registered successfully", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Send OTP to an email for password reset
// @route   POST /api/auth/forgot-password/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email address" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account is deactivated" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otp;
    user.otpExpiry = expiry;
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.json({ message: "OTP sent to your email address" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// @desc    Verify the OTP entered by user
// @route   POST /api/auth/forgot-password/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otpCode) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });
    }

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/forgot-password/reset
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otpCode) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Update password and clear OTP fields
    user.password = newPassword;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Change password (used for forced reset on first login)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password changed successfully", user: {
      id: user._id,
      instituteId: user.instituteId,
      role: user.role,
      email: user.email,
      mustChangePassword: false 
    }});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe, register, sendOtp, verifyOtp, resetPassword, changePassword };
