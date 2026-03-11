const User = require("../models/User.model");
const Student = require("../models/Student.model");
const Coordinator = require("../models/Coordinator.model");
const { generateToken } = require("../utils/generateToken");
const { ROLES } = require("../utils/constants");

// @desc    Login user with institute credentials
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { instituteId, password } = req.body;

    if (!instituteId || !password)
      return res.status(400).json({ message: "Institute ID and password are required" });

    const user = await User.findOne({ instituteId });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is deactivated" });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({ id: user._id, role: user.role });

    res.json({
      token,
      user: { id: user._id, instituteId: user.instituteId, role: user.role, email: user.email },
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

module.exports = { login, getMe, register };
