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
        populate: { path: "userId", select: "email" }
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

// @desc    Send predefined or custom notification to student
// @route   POST /api/coco/notify
const sendNotification = async (req, res) => {
  try {
    const { studentUserId, companyId, messageIndex, message: customMessage } = req.body;
    let message = customMessage;

    if (messageIndex !== undefined && PREDEFINED_NOTIFICATIONS[messageIndex]) {
      message = PREDEFINED_NOTIFICATIONS[messageIndex];
    }

    if (!message) {
      return res.status(400).json({ message: "Invalid message provided" });
    }

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
    let finalName = panelName;
    if (!finalName || finalName.trim() === "") {
      const count = await Panel.countDocuments({ companyId });
      finalName = `Panel ${count + 1}`;
    }
    const panel = await Panel.create({ companyId, roundId, panelName: finalName, interviewers, venue });
    if (roundId) {
      await InterviewRound.findByIdAndUpdate(roundId, { $push: { panels: panel._id } });
    }
    res.status(201).json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all panels for a company
// @route   GET /api/coco/company/:companyId/panels
const getPanels = async (req, res) => {
  try {
    const panels = await Panel.find({ companyId: req.params.companyId })
      .populate("currentStudent", "name rollNumber")
      .populate("roundId", "roundNumber roundName");
    res.json(panels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a panel
// @route   PUT /api/coco/panel/:id
const updatePanel = async (req, res) => {
  try {
    const { roundId, roundNumber, venue, status } = req.body;
    const panelInfo = await Panel.findById(req.params.id);
    if (!panelInfo) return res.status(404).json({ message: "Panel not found" });

    let resolvedRoundId = roundId;
    if (!resolvedRoundId && roundNumber) {
      let round = await InterviewRound.findOne({ companyId: panelInfo.companyId, roundNumber });
      if (!round) {
        round = await InterviewRound.create({
          companyId: panelInfo.companyId,
          roundNumber,
          roundName: `Round ${roundNumber}`,
        });
      }
      resolvedRoundId = round._id;
    }

    const updateData = {};
    if (resolvedRoundId !== undefined) updateData.roundId = resolvedRoundId;
    if (venue !== undefined) updateData.venue = venue;
    if (status !== undefined) updateData.status = status;

    const panel = await Panel.findByIdAndUpdate(req.params.id, updateData, { new: true });

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io && panel) io.to(panel.companyId.toString()).emit("status:updated");

    res.json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Assign student to empty panel
// @route   PUT /api/coco/panel/:id/assign
const assignPanelStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const panel = await Panel.findById(req.params.id);
    if (!panel) return res.status(404).json({ message: "Panel not found" });

    panel.status = "occupied";
    panel.currentStudent = studentId;
    await panel.save();

    let queueEntry = await Queue.findOne({ studentId, companyId: panel.companyId }).sort({ createdAt: -1 });
    if (queueEntry) {
      queueEntry.status = "in_interview";
      queueEntry.panelId = panel._id;
      queueEntry.interviewStartedAt = new Date();
      await queueEntry.save();
    }

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io) io.to(panel.companyId.toString()).emit("queue:updated");

    res.json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear a panel
// @route   PUT /api/coco/panel/:id/clear
const clearPanel = async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel) return res.status(404).json({ message: "Panel not found" });

    if (panel.currentStudent) {
      let queueEntry = await Queue.findOne({ studentId: panel.currentStudent, companyId: panel.companyId }).sort({ createdAt: -1 });
      if (queueEntry) {
        queueEntry.status = "completed";
        queueEntry.completedAt = new Date();
        await queueEntry.save();
      }
    }

    panel.status = "unoccupied";
    panel.currentStudent = null;
    await panel.save();

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io) io.to(panel.companyId.toString()).emit("queue:updated");

    res.json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get rounds for a company
const getRounds = async (req, res) => {
  try {
    const rounds = await InterviewRound.find({ companyId: req.params.companyId })
      .populate("panels");

    // For each round, find students associated with it via Queue status
    const augmentedRounds = await Promise.all(rounds.map(async (round) => {
      const queueEntries = await Queue.find({
        companyId: req.params.companyId,
        roundId: round._id
      }).populate({
        path: "studentId",
        populate: { path: "userId", select: "email" }
      });

      return {
        ...round.toObject(),
        students: queueEntries.map(qe => ({
          ...qe.studentId.toObject(),
          status: qe.status,
          queueEntry: qe
        }))
      };
    }));

    res.json(augmentedRounds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a student to a round (auto-creates InterviewRound if needed)
// @route   POST /api/coco/round/add-student
const addStudentToRound = async (req, res) => {
  try {
    const { studentId, companyId, roundId, roundNumber } = req.body;

    // Resolve the round: use provided roundId, or find/create by roundNumber
    let resolvedRoundId = roundId;
    if (!resolvedRoundId && roundNumber) {
      let round = await InterviewRound.findOne({ companyId, roundNumber });
      if (!round) {
        round = await InterviewRound.create({
          companyId,
          roundNumber,
          roundName: `Round ${roundNumber}`,
        });
      }
      resolvedRoundId = round._id;
    }

    // Translate frontend 'yet-to-interview' to backend 'not_joined'
    let inputStatus = req.body.status === "yet-to-interview" ? "not_joined" : req.body.status;
    let finalStatus = inputStatus || "in_queue";

    // Find or create queue entry
    let queueEntry = await Queue.findOne({ studentId, companyId });

    if (queueEntry) {
      if (queueEntry.roundId?.toString() === resolvedRoundId.toString() && ["in_queue", "in_interview", "on_hold", "not_joined"].includes(queueEntry.status)) {
        return res.status(400).json({ message: "Student is actively in this round's queue already." });
      }

      // Calculate next position for this specific round
      const lastEntry = await Queue.findOne({ companyId, roundId: resolvedRoundId, status: { $in: ["in_queue", "in_interview"] } }).sort({ position: -1 });
      const nextPosition = (lastEntry && lastEntry.position ? lastEntry.position : 0) + 1;

      queueEntry.roundId = resolvedRoundId;
      queueEntry.status = finalStatus;
      queueEntry.position = nextPosition;
      await queueEntry.save();
    } else {
      // Calculate next position for this specific round
      const lastEntry = await Queue.findOne({ companyId, roundId: resolvedRoundId, status: { $in: ["in_queue", "in_interview"] } }).sort({ position: -1 });
      const nextPosition = (lastEntry && lastEntry.position ? lastEntry.position : 0) + 1;

      queueEntry = await Queue.create({
        studentId,
        companyId,
        roundId: resolvedRoundId,
        status: finalStatus,
        position: nextPosition,
      });
    }

    // Also shortlist the student for this company if not already
    await Company.findByIdAndUpdate(companyId, {
      $addToSet: { shortlistedStudents: studentId },
    });
    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { shortlistedCompanies: companyId },
    });

    res.json(queueEntry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Upload Excel to add students to a round
// @route   POST /api/coco/round/upload-students
const uploadStudentsToRound = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { companyId, roundNumber } = req.body;
    if (!companyId || !roundNumber) {
      return res.status(400).json({ message: "companyId and roundNumber are required" });
    }

    // Find or create the round
    let round = await InterviewRound.findOne({ companyId, roundNumber: Number(roundNumber) });
    if (!round) {
      round = await InterviewRound.create({
        companyId,
        roundNumber: Number(roundNumber),
        roundName: `Round ${roundNumber}`,
      });
    }

    // Parse the Excel file
    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let added = 0;
    let notFound = [];
    for (const row of rows) {
      const rollNumber = row["Roll Number"] || row["rollNumber"] || row["RollNumber"] || row["roll_number"];
      if (!rollNumber) continue;

      const student = await Student.findOne({ rollNumber: String(rollNumber).trim() });
      if (!student) {
        notFound.push(String(rollNumber));
        continue;
      }

      // Create or update queue entry
      let queueEntry = await Queue.findOne({ studentId: student._id, companyId });
      if (queueEntry) {
        queueEntry.roundId = round._id;
        queueEntry.status = "in_queue";
        await queueEntry.save();
      } else {
        await Queue.create({
          studentId: student._id,
          companyId,
          roundId: round._id,
          status: "in_queue",
        });
      }

      // Shortlist
      await Company.findByIdAndUpdate(companyId, {
        $addToSet: { shortlistedStudents: student._id },
      });
      await Student.findByIdAndUpdate(student._id, {
        $addToSet: { shortlistedCompanies: companyId },
      });

      added++;
    }

    res.json({ message: `${added} student(s) added to Round ${roundNumber}`, notFound });
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

// @desc    Get actual notifications for the logged-in CoCo
// @route   GET /api/coco/notifications
const Notification = require("../models/Notification.model");
const getCocoNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.id,
      source: { $in: ["student", "apc"] }
    })
      .populate("senderId", "name rollNumber")
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/coco/notifications/:id/read
const markNotifRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear all notifications for CoCo
// @route   DELETE /api/coco/notifications
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      recipientId: req.user.id,
      source: { $in: ["student", "apc"] }
    });
    res.json({ message: "Notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Search all students
// @route   GET /api/coco/students/search
const searchAllStudents = async (req, res) => {
  try {
    const { q } = req.query;
    const students = await Student.find({
      $or: [{ name: new RegExp(q, "i") }, { rollNumber: new RegExp(q, "i") }],
    }).populate("userId", "email").limit(20);

    // Attach email from populated userId onto each student object
    const studentsWithEmail = students.map((s) => {
      const obj = s.toObject();
      obj.email = obj.userId?.email || "";
      return obj;
    });

    const { withQueueStatus } = require("../utils/student.helper");
    const augmentedStudents = await withQueueStatus(studentsWithEmail);

    res.json(augmentedStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a student to a company's shortlist (from CoCo portal)
// @route   POST /api/coco/company/add-student
const addStudentToCompany = async (req, res) => {
  try {
    const { studentId, companyId } = req.body;
    if (!studentId || !companyId) {
      return res.status(400).json({ message: "studentId and companyId are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Add student to company shortlist and vice versa
    await Company.findByIdAndUpdate(companyId, {
      $addToSet: { shortlistedStudents: studentId },
    });
    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { shortlistedCompanies: companyId },
    });

    res.json({ message: `${student.name} added to ${company.name} successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc    Promote students to the next round via Excel upload
// @route   POST /api/coco/round/promote
const promoteStudentsViaExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const maxRounds = company.totalRounds || 3;

    const XLSX = require("xlsx");
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let promoted = 0;
    let alreadyMaxRound = [];
    let notFound = [];

    for (const row of rows) {
      const rollNumber =
        row["Roll Number"] || row["rollNumber"] || row["RollNumber"] || row["roll_number"];
      if (!rollNumber) continue;

      const student = await Student.findOne({ rollNumber: String(rollNumber).trim() });
      if (!student) {
        notFound.push(String(rollNumber));
        continue;
      }

      // Find the student's current queue entry for this company
      const queueEntry = await Queue.findOne({ studentId: student._id, companyId });
      let currentRoundNumber = 1;

      if (queueEntry && queueEntry.roundId) {
        const currentRound = await InterviewRound.findById(queueEntry.roundId);
        if (currentRound) {
          currentRoundNumber = currentRound.roundNumber;
        }
      }

      const nextRound = currentRoundNumber + 1;
      if (nextRound > maxRounds) {
        alreadyMaxRound.push(String(rollNumber));
        continue;
      }

      // Find or create the next round
      let nextRoundDoc = await InterviewRound.findOne({ companyId, roundNumber: nextRound });
      if (!nextRoundDoc) {
        nextRoundDoc = await InterviewRound.create({
          companyId,
          roundNumber: nextRound,
          roundName: `Round ${nextRound}`,
        });
      }

      // Update queue entry to point to the next round
      if (queueEntry) {
        queueEntry.roundId = nextRoundDoc._id;
        queueEntry.status = "in_queue";
        await queueEntry.save();
      } else {
        await Queue.create({
          studentId: student._id,
          companyId,
          roundId: nextRoundDoc._id,
          status: "in_queue",
        });
      }

      // Ensure shortlisted
      await Company.findByIdAndUpdate(companyId, {
        $addToSet: { shortlistedStudents: student._id },
      });
      await Student.findByIdAndUpdate(student._id, {
        $addToSet: { shortlistedCompanies: companyId },
      });

      promoted++;
    }

    let message = `${promoted} student(s) promoted to the next round.`;
    if (alreadyMaxRound.length > 0) {
      message += ` ${alreadyMaxRound.length} already at max round.`;
    }

    res.json({ message, promoted, alreadyMaxRound, notFound });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAssignedCompany, getShortlistedStudents, addStudentToQueue,
  updateStudentStatus, sendNotification, toggleWalkIn,
  addPanel, getPanels, updatePanel, assignPanelStudent, clearPanel,
  getRounds, addRound, getPredefinedNotifications,
  searchAllStudents, addStudentToRound, uploadStudentsToRound,
  getCocoNotifications, markNotifRead, clearAllNotifications, addStudentToCompany,
  promoteStudentsViaExcel,
};
