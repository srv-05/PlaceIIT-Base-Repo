const Coordinator = require("../models/Coordinator.model");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const Queue = require("../models/Queue.model");
const InterviewRound = require("../models/InterviewRound.model");
const Panel = require("../models/Panel.model");
const notificationService = require("../services/notification.service");
const queueService = require("../services/queue.service");
const roundService = require("../services/round.service");
const { PREDEFINED_NOTIFICATIONS } = require("../utils/constants");

// @desc    Get assigned company details
// @route   GET /api/coco/company
const getAssignedCompany = async (req, res) => {
  try {
    const coco = await Coordinator.findOne({ userId: req.user.id }).populate("assignedCompanies");
    res.json(coco?.assignedCompanies || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get shortlisted students for a company
// @route   GET /api/coco/company/:companyId/students
const getShortlistedStudents = async (req, res) => {
  try {
    const { search } = req.query;
    const company = await Company.findById(req.params.companyId)
      .populate({
        path: "shortlistedStudents",
        match: search
          ? { $or: [{ name: new RegExp(search, "i") }, { rollNumber: new RegExp(search, "i") }] }
          : {},
      });
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Attach queue status
    const students = await Promise.all(
      company.shortlistedStudents.map(async (s) => {
        const q = await Queue.findOne({ companyId: company._id, studentId: s._id });
        return { ...s.toObject(), queueEntry: q };
      })
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add student to queue
// @route   POST /api/coco/queue/add
const addStudentToQueue = async (req, res) => {
  try {
    const { studentId, companyId, isWalkIn = false } = req.body;
    const result = await queueService.joinQueue(studentId, companyId, isWalkIn);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Update student status
// @route   PUT /api/coco/queue/status
const updateStudentStatus = async (req, res) => {
  try {
    const { studentId, companyId, status, roundId, panelId } = req.body;
    const result = await queueService.updateStatus(studentId, companyId, status, roundId, panelId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Send predefined notification to student
// @route   POST /api/coco/notify
const sendNotification = async (req, res) => {
  try {
    const { studentUserId, companyId, messageIndex } = req.body;
    const message = PREDEFINED_NOTIFICATIONS[messageIndex];
    if (!message) return res.status(400).json({ message: "Invalid notification index" });

    await notificationService.sendNotification({
      recipientId: studentUserId,
      senderId: req.user.id,
      companyId,
      message,
      type: "interview_call",
    });
    res.json({ message: "Notification sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Toggle walk-in availability
// @route   PUT /api/coco/company/:companyId/walkin
const toggleWalkIn = async (req, res) => {
  try {
    const { enabled } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.params.companyId,
      { isWalkInEnabled: enabled },
      { new: true }
    );
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a new panel
// @route   POST /api/coco/panel
const addPanel = async (req, res) => {
  try {
    const { companyId, roundId, panelName, interviewers, venue } = req.body;
    const panel = await Panel.create({ companyId, roundId, panelName, interviewers, venue });
    await InterviewRound.findByIdAndUpdate(roundId, { $push: { panels: panel._id } });
    res.status(201).json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get rounds for a company
// @route   GET /api/coco/company/:companyId/rounds
const getRounds = async (req, res) => {
  try {
    const rounds = await InterviewRound.find({ companyId: req.params.companyId })
      .populate("panels");
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a new round
// @route   POST /api/coco/round
const addRound = async (req, res) => {
  try {
    const { companyId, roundNumber, roundName } = req.body;
    const round = await roundService.createRound(companyId, roundNumber, roundName);
    res.status(201).json(round);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get predefined notification list
// @route   GET /api/coco/notifications/predefined
const getPredefinedNotifications = async (req, res) => {
  res.json(PREDEFINED_NOTIFICATIONS);
};

module.exports = {
  getAssignedCompany, getShortlistedStudents, addStudentToQueue,
  updateStudentStatus, sendNotification, toggleWalkIn,
  addPanel, getRounds, addRound, getPredefinedNotifications,
};
