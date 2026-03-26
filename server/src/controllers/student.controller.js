const Student = require("../models/Student.model");
const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Notification = require("../models/Notification.model");
const Query = require("../models/Query.model");
const User = require("../models/User.model");
const path = require("path");
const fs = require("fs");
const { sortCompaniesByPriority, buildPriorityMap } = require("../utils/priorityHelper");
const queueService = require("../services/queue.service");

// @desc    Get student profile
// @route   GET /api/student/profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate("userId", "email")
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
    const { contact, emergencyContact, friendContact, branch, batch, email } = req.body;
    await Student.findOneAndUpdate(
      { userId: req.user.id },
      { contact, emergencyContact, friendContact, branch, batch, profileCompleted: true },
      { new: true }
    );
    // Update email on User model if provided
    if (email) {
      await User.findByIdAndUpdate(req.user.id, { email });
    }
    
    // Fetch and return the fully populated object so frontend has the updated email
    const updatedStudent = await Student.findOne({ userId: req.user.id })
      .populate("userId", "email")
      .populate("shortlistedCompanies", "name logo day slot venue mode currentRound");
      
    if (!updatedStudent) return res.status(404).json({ message: "Student not found" });
    res.json(updatedStudent);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload student resume
// @route   POST /api/student/resume
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const resumePath = req.file.path.replace(/\\/g, '/');

    const student = await Student.findOneAndUpdate(
      { userId: req.user.id },
      { resume: resumePath },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Resume uploaded successfully", resumePath: student.resume });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Download resume file with Content-Disposition: attachment
// @route   GET /api/student/resume/download
const downloadResume = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student || !student.resume) {
      return res.status(404).json({ message: "No resume found" });
    }

    const cleanPath = student.resume.replace(/\\/g, '/');
    const absPath = path.resolve(cleanPath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: "Resume file not found on server" });
    }

    const filename = path.basename(absPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get shortlisted companies sorted by priority (includes walk-in companies)
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

    const allCompanies = sorted;

    // Attach queue info for each company and expand into distinct round tiles
    const result = await Promise.all(
      allCompanies.map(async (company) => {
        const queueEntries = await Queue.find({
          companyId: company._id,
          studentId: student._id,
        });

        if (queueEntries.length === 0) {
          return [{
            ...company,
            round: "Round 1",
            queueEntry: null,
            totalInQueue: await Queue.countDocuments({ companyId: company._id, status: "in_queue", round: "Round 1" })
          }];
        }

        const tiles = await Promise.all(queueEntries.map(async (entry) => {
          let liveQueueEntry = entry.toObject();
          const roundStr = entry.round || "Round 1";
          const totalInQueue = await Queue.countDocuments({ companyId: company._id, status: "in_queue", round: roundStr });

          if (liveQueueEntry.status === "in_queue") {
            const ahead = await Queue.countDocuments({
              companyId: company._id,
              status: "in_queue",
              round: roundStr,
              position: { $lt: liveQueueEntry.position },
            });
            liveQueueEntry.position = ahead + 1;
          }
          return { ...company, round: roundStr, queueEntry: liveQueueEntry, totalInQueue };
        }));

        return tiles;
      })
    );

    res.json(result.flat());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Join queue for a company (creates PENDING entry, requires COCO approval)
// @route   POST /api/student/queue/join
const joinQueue = async (req, res) => {
  try {
    const { companyId, round = "Round 1" } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Enforce active drive state — block join if company is not in active day/slot
    const DriveState = require("../models/DriveState.model");
    const Company = require("../models/Company.model");
    const driveState = await DriveState.findOne({ key: "global" }).lean();
    if (driveState) {
      const company = await Company.findById(companyId).lean();
      if (company) {
        const companyDay = Number(company.day);
        const companySlot = (company.slot || "").toLowerCase();
        if (companyDay !== driveState.currentDay || companySlot !== (driveState.currentSlot || "").toLowerCase()) {
          return res.status(403).json({ message: "This company is not in the currently active Day & Slot. Join Queue is not allowed." });
        }
      }
    }

    const result = await queueService.joinQueue(student._id, companyId, round, false);
    res.json(result);
  } catch (err) {
    if (err.code === "QUEUE_CONFLICT") {
      return res.status(409).json({
        message: err.message,
        code: "QUEUE_CONFLICT",
        conflictCompanyId: err.conflictCompanyId,
        conflictCompanyName: err.conflictCompanyName,
        conflictRound: err.conflictRound,
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Join walk-in queue (creates PENDING entry)
// @route   POST /api/student/queue/walkin
const joinWalkIn = async (req, res) => {
  try {
    const { companyId, round = "Round 1" } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.joinQueue(student._id, companyId, round, true);
    res.json(result);
  } catch (err) {
    if (err.code === "QUEUE_CONFLICT") {
      return res.status(409).json({
        message: err.message,
        code: "QUEUE_CONFLICT",
        conflictCompanyId: err.conflictCompanyId,
        conflictCompanyName: err.conflictCompanyName,
        conflictRound: err.conflictRound,
      });
    }
    res.status(400).json({ message: err.message });
  }
};

// @desc    Leave queue for a company (sets status to EXITED — does NOT delete)
// @route   POST /api/student/queue/leave
const leaveQueue = async (req, res) => {
  try {
    const { companyId, round = "Round 1" } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.leaveQueue(student._id, companyId, round);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Confirm queue switch (exit old queue, create PENDING for new company)
// @route   POST /api/student/queue/confirm-switch
const confirmSwitch = async (req, res) => {
  try {
    const { fromCompanyId, fromRound = "Round 1", toCompanyId, toRound = "Round 1", isWalkIn = false } = req.body;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const result = await queueService.switchAndJoin(student._id, fromCompanyId, fromRound, toCompanyId, toRound, isWalkIn);
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
        const hasInterviewHistory = student
          ? await queueService.hasInterviewHistoryForCompany(student._id, c._id)
          : false;

        if (hasInterviewHistory) {
          return [];
        }

        const queueEntries = student
          ? await Queue.find({
            companyId: c._id,
            studentId: student._id,
            status: { $nin: ["rejected", "completed", "offer_given"] },
          })
          : [];

        if (queueEntries.length === 0) {
          return [{
            ...c.toObject(),
            round: "Round 1",
            queueEntry: null,
            totalInQueue: await Queue.countDocuments({ companyId: c._id, status: "in_queue", round: "Round 1" })
          }];
        }

        const tiles = await Promise.all(queueEntries.map(async (entry) => {
          let liveQueueEntry = entry.toObject();
          const roundStr = entry.round || "Round 1";
          const totalInQueue = await Queue.countDocuments({ companyId: c._id, status: "in_queue", round: roundStr });

          if (liveQueueEntry.status === "in_queue") {
            const ahead = await Queue.countDocuments({
              companyId: c._id,
              status: "in_queue",
              round: roundStr,
              position: { $lt: liveQueueEntry.position },
            });
            liveQueueEntry.position = ahead + 1;
          }
          return { ...c.toObject(), round: roundStr, queueEntry: liveQueueEntry, totalInQueue };
        }));

        return tiles;
      })
    );

    res.json(result.flat());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get queue position for a company
// @route   GET /api/student/queue/:companyId
const getQueuePosition = async (req, res) => {
  try {
    const { round = "Round 1" } = req.query;
    const student = await Student.findOne({ userId: req.user.id });
    const entry = await Queue.findOne({
      companyId: req.params.companyId,
      studentId: student._id,
      round,
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
    const Apc = require("../models/Apc.model");
    const queries = await Query.find({ studentUserId: req.user.id })
      .populate("respondedBy", "instituteId email")
      .sort({ createdAt: -1 });
    
    // Attach APC responder name
    const result = await Promise.all(
      queries.map(async (q) => {
        const queryObj = q.toObject();
        if (q.respondedBy) {
          const responderApc = await Apc.findOne({ userId: q.respondedBy._id });
          queryObj.respondedByName = responderApc ? responderApc.name : "APC";
        }
        return queryObj;
      })
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/student/notifications/read-all
const markAllNotifRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/student/notifications
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipientId: req.user.id });
    res.json({ message: "All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  getProfile, updateProfile, getMyCompanies,
  joinQueue, joinWalkIn, leaveQueue, confirmSwitch, getWalkIns, getQueuePosition,
  getNotifications, markNotifRead, markAllNotifRead, clearAllNotifications,
  submitQuery, getMyQueries,
  uploadResume, downloadResume
};
