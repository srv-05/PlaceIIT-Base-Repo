const Student = require("../models/Student.model");
const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Notification = require("../models/Notification.model");
const Query = require("../models/Query.model");
const { sortCompaniesByPriority, buildPriorityMap } = require("../utils/priorityHelper");
const queueService = require("../services/queue.service");

// @desc    Get student profile
// @route   GET /api/student/profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("shortlistedCompanies", "name logo day slot venue mode currentRound");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update student profile
// @route   PUT /api/student/profile
const updateProfile = async (req, res) => {
  try {
    const { contact, emergencyContact, friendContact, branch, batch, cgpa } = req.body;
    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { contact, emergencyContact, friendContact, branch, batch, cgpa, profileCompleted: true },
      { new: true }
    );
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get shortlisted companies sorted by priority
// @route   GET /api/student/companies
const getMyCompanies = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("shortlistedCompanies");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const priorityMap = buildPriorityMap(student.priorityOrder);
    const sorted = sortCompaniesByPriority(
      student.shortlistedCompanies.map((c) => ({ ...c.toObject(), companyId: c._id })),
      priorityMap
    );

    // Attach queue info for each company
    const result = await Promise.all(
      sorted.map(async (company) => {
        const queueEntry = await Queue.findOne({
          companyId: company._id,
          studentId: student._id,
        });
        const totalInQueue = await Queue.countDocuments({
          companyId: company._id,
          status: "in_queue",
        });
        return { ...company, queueEntry, totalInQueue };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Join queue for a company
// @route   POST /api/student/queue/join
const joinQueue = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.joinQueue(student._id, companyId, false);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Join walk-in queue
// @route   POST /api/student/queue/walkin
const joinWalkIn = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.joinQueue(student._id, companyId, true);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Leave queue for a company
// @route   POST /api/student/queue/leave
const leaveQueue = async (req, res) => {
  try {
    const { companyId } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.leaveQueue(student._id, companyId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Get available walk-in companies
// @route   GET /api/student/walkins
const getWalkIns = async (req, res) => {
  try {
    const companies = await Company.find({ isWalkInEnabled: true, isActive: true });
    const student = await Student.findOne({ userId: req.user.id });

    const result = await Promise.all(
      companies.map(async (c) => {
        const totalInQueue = await Queue.countDocuments({
          companyId: c._id,
          status: "in_queue",
        });
        const queueEntry = student
          ? await Queue.findOne({ companyId: c._id, studentId: student._id })
          : null;
        return { ...c.toObject(), totalInQueue, queueEntry };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get queue position for a company
// @route   GET /api/student/queue/:companyId
const getQueuePosition = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    const entry = await Queue.findOne({
      companyId: req.params.companyId,
      studentId: student._id,
    });
    if (!entry) return res.json({ inQueue: false });

    const ahead = await Queue.countDocuments({
      companyId: req.params.companyId,
      status: "in_queue",
      position: { $lt: entry.position },
    });
    res.json({ inQueue: true, position: entry.position, ahead, status: entry.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get notifications
// @route   GET /api/student/notifications
const getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/student/notifications/:id/read
const markNotifRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Submit a query
// @route   POST /api/student/queries
const submitQuery = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res.status(400).json({ message: "Subject and message are required" });

    const query = await Query.create({
      studentUserId: req.user.id,
      subject,
      message,
    });
    res.status(201).json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get my queries
// @route   GET /api/student/queries
const getMyQueries = async (req, res) => {
  try {
    const queries = await Query.find({ studentUserId: req.user.id }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProfile, updateProfile, getMyCompanies,
  joinQueue, joinWalkIn, leaveQueue, getWalkIns, getQueuePosition,
  getNotifications, markNotifRead,
  submitQuery, getMyQueries,
};
