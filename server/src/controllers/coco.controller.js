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

const ACTIVE_QUEUE_STATUSES = ["in_queue", "in_interview", "on_hold", "pending", "not_joined"];
const ROUND_TRACKING_QUEUE_STATUSES = ["in_queue", "in_interview", "on_hold", "not_joined", "completed"];

const getQueueEntryPriority = (entry) => {
  const statusPriority = {
    in_interview: 5,
    in_queue: 4,
    on_hold: 3,
    pending: 2,
    not_joined: 1,
    completed: 0,
    rejected: -1,
    exited: -2,
    offer_given: -3,
  };

  return statusPriority[entry?.status] ?? -10;
};

// @desc    Get assigned company details
// @route   GET /api/coco/company
const getAssignedCompany = async (req, res) => {
  try {
    const coco = await Coordinator.findOne({ userId: req.user.id }).populate("assignedCompanies");
    if (!coco) return res.json([]);

    const DriveState = require("../models/DriveState.model");
    const driveState = await DriveState.findOne();
    if (!driveState || driveState.currentDay == null || !driveState.currentSlot) {
      return res.json([]); // Fail-safe: treats as not assigned if drive state is missing
    }

    const currentDay = driveState.currentDay;
    const currentSlot = driveState.currentSlot;

    // Strict slot-day COCO assignment logic
    // A COCO is only assigned if the company day+slot matches the current active day+slot
    const validAssigned = coco.assignedCompanies.filter(c => 
      c.day === currentDay && c.slot === currentSlot
    );

    res.json(validAssigned);
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

    // 1. Fetch all queue entries for this company to catch walk-ins
    const allQueueEntries = await Queue.find({ companyId: company._id })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "email" }
      })
      .populate("roundId", "roundName roundNumber")
      .sort({ updatedAt: -1, createdAt: -1 });

    // 2. Base set of students: shortlisted ones
    const baseStudentsMap = new Map();
    if (company.shortlistedStudents) {
      company.shortlistedStudents.forEach(s => {
        if (s && s._id) {
          baseStudentsMap.set(s._id.toString(), s);
        }
      });
    }

    // 3. Add any queue entry students (like walk-ins) who aren't shortlisted
    allQueueEntries.forEach(qe => {
      if (qe.studentId && qe.studentId._id) {
        const sId = qe.studentId._id.toString();
        if (!baseStudentsMap.has(sId)) {
          baseStudentsMap.set(sId, qe.studentId);
        }
      }
    });

    const allStudents = Array.from(baseStudentsMap.values());

    // 4. Attach queue status
    const students = allStudents.map((s) => {
      const studentQueueEntries = allQueueEntries.filter(
        qe => qe.studentId && qe.studentId._id && qe.studentId._id.toString() === s._id.toString()
      );

      const activeQueueEntry = studentQueueEntries.find((entry) => ACTIVE_QUEUE_STATUSES.includes(entry.status));
      const q = activeQueueEntry
        || studentQueueEntries.sort((a, b) => getQueueEntryPriority(b) - getQueueEntryPriority(a))[0]
        || null;

      return { ...s.toObject(), queueEntry: q };
    });

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
    const { studentId, companyId, status, roundId, panelId, round = "Round 1" } = req.body;
    const normalizedStatusMap = {
      "in-queue": "in_queue",
      "in-interview": "in_interview",
      "on-hold": "on_hold",
      "yet-to-interview": "not_joined",
    };
    const normalizedStatus = normalizedStatusMap[status] || status;
    const result = await queueService.updateStatus(studentId, companyId, normalizedStatus, roundId, panelId, round);
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

    // Fetch company BEFORE update to detect activation
    const oldCompany = await Company.findById(req.params.companyId);
    if (!oldCompany) return res.status(404).json({ message: "Company not found" });

    const wasEnabled = oldCompany.isWalkInEnabled;

    const company = await Company.findByIdAndUpdate(
      req.params.companyId,
      { isWalkInEnabled: enabled },
      { new: true }
    );

    // Send walk-in activation notification only when toggled ON (false → true)
    if (enabled && !wasEnabled) {
      const User = require("../models/User.model");
      const venueStr = company.venue || "the designated venue";
      const message = `${company.name} has started walk-in interviews at ${venueStr}. Please proceed accordingly.`;

      // Collect ALL recipient user IDs
      const recipientIds = new Set();

      // 1. ALL students
      const allStudents = await Student.find().select("userId");
      allStudents.forEach(s => { if (s.userId) recipientIds.add(s.userId.toString()); });

      // 2. All CoCos
      const cocoUsers = await User.find({ role: "coco" }).select("_id");
      cocoUsers.forEach(u => recipientIds.add(u._id.toString()));

      // 3. All APCs (admin role)
      const apcUsers = await User.find({ role: "admin" }).select("_id");
      apcUsers.forEach(u => recipientIds.add(u._id.toString()));

      // Send notifications in parallel
      const notifPromises = Array.from(recipientIds).map(recipientId =>
        notificationService.sendNotification({
          recipientId,
          senderId: req.user.id,
          companyId: company._id,
          message,
          type: "alert",
          source: "coco",
        })
      );
      await Promise.allSettled(notifPromises);
    }

    // Handle walk-in deactivation
    if (!enabled && wasEnabled) {
      const affectedEntries = await Queue.find({
        companyId: company._id,
        isWalkIn: true,
        status: { $in: ["pending", "in_queue", "on_hold"] }
      });

      if (affectedEntries.length > 0) {
        const entryIds = affectedEntries.map(e => e._id);

        await Queue.updateMany(
          { _id: { $in: entryIds } },
          { $set: { status: "exited", completedAt: new Date() } }
        );

        // Emit queue updates and user updates
        const { getIO } = require("../config/socket");
        const io = getIO();
        if (io) {
          io.to(`company:${company._id}`).emit("queue:updated", { companyId: company._id });

          for (const entry of affectedEntries) {
            const st = await Student.findById(entry.studentId);
            if (st && st.userId) {
              io.to(`user:${st.userId}`).emit("status:updated", {
                companyId: company._id,
                status: "exited"
              });
            }
          }
        }

        // Ensure positional rebalancing (optional but nice)
        // Leaving it simple for now, resetting they are implicitly skipped anyway.
      }
    }

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
    const panel = await Panel.findById(req.params.id).populate("roundId");
    if (!panel) return res.status(404).json({ message: "Panel not found" });
    if (panel.status === "occupied" && String(panel.currentStudent) !== String(studentId)) {
      return res.status(400).json({ message: "Selected panel is already occupied" });
    }

    let studentDoc = null;
    await Panel.updateMany(
      { companyId: panel.companyId, currentStudent: studentId, _id: { $ne: panel._id } },
      { $set: { currentStudent: null, status: "unoccupied" } }
    );

    panel.status = "occupied";
    panel.currentStudent = studentId;
    await panel.save();

    const roundNameStr = panel.roundId ? (panel.roundId.roundName || `Round ${panel.roundId.roundNumber}`) : "Round 1";
    let queueEntry = await Queue.findOne({ studentId, companyId: panel.companyId, round: roundNameStr }).sort({ createdAt: -1 });
    if (queueEntry) {
      queueEntry.status = "in_interview";
      queueEntry.panelId = panel._id;
      queueEntry.interviewStartedAt = new Date();
      await queueEntry.save();
      studentDoc = queueEntry.studentId;
    }

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io) {
      io.to(`company:${panel.companyId}`).emit("queue:updated", { companyId: panel.companyId });
      if (studentDoc && studentDoc.userId) {
        io.to(`user:${studentDoc.userId}`).emit("status:updated", { companyId: panel.companyId, status: "in_interview" });
      }
    }

    res.json(panel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear a panel
// @route   PUT /api/coco/panel/:id/clear
const clearPanel = async (req, res) => {
  try {
    const panel = await Panel.findById(req.params.id).populate("roundId");
    if (!panel) return res.status(404).json({ message: "Panel not found" });

    let studentDoc = null;
    if (panel.currentStudent) {
      const roundNameStr = panel.roundId ? (panel.roundId.roundName || `Round ${panel.roundId.roundNumber}`) : "Round 1";
      let queueEntry = await Queue.findOne({ studentId: panel.currentStudent, companyId: panel.companyId, round: roundNameStr }).sort({ createdAt: -1 });
      if (queueEntry) {
        queueEntry.status = "completed";
        queueEntry.completedAt = new Date();
        await queueEntry.save();
        studentDoc = queueEntry.studentId;
      }
    }

    panel.status = "unoccupied";
    panel.currentStudent = null;
    await panel.save();

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io) {
      io.to(`company:${panel.companyId}`).emit("queue:updated", { companyId: panel.companyId });
      if (studentDoc && studentDoc.userId) {
        io.to(`user:${studentDoc.userId}`).emit("status:updated", { companyId: panel.companyId, status: "completed" });
      }
    }

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
      const roundNameStr = round.roundName || `Round ${round.roundNumber}`;
      const fallbackRoundStr = `Round ${round.roundNumber}`;
      const queueEntries = await Queue.find({
        companyId: req.params.companyId,
        status: { $in: ROUND_TRACKING_QUEUE_STATUSES },
        $or: [
          { roundId: round._id },
          { round: roundNameStr },
          { round: fallbackRoundStr }
        ]
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

    let resolvedRoundObj = null;
    let resolvedRoundId = roundId;
    if (resolvedRoundId) {
      resolvedRoundObj = await InterviewRound.findById(resolvedRoundId);
    } else if (roundNumber) {
      resolvedRoundObj = await InterviewRound.findOne({ companyId, roundNumber });
      if (!resolvedRoundObj) {
        resolvedRoundObj = await InterviewRound.create({
          companyId,
          roundNumber,
          roundName: `Round ${roundNumber}`,
        });
      }
      resolvedRoundId = resolvedRoundObj._id;
    }

    const activeQueueElsewhere = await Queue.findOne({
      studentId,
      companyId: { $ne: companyId },
      status: { $in: ["pending", "in_queue", "in_interview", "on_hold"] },
    }).populate("companyId", "name");

    if (activeQueueElsewhere) {
      const conflictCompanyName = activeQueueElsewhere.companyId?.name || "another company";
      return res.status(409).json({
        message: `Student is already in the queue for ${conflictCompanyName}.`,
        code: "QUEUE_CONFLICT",
        conflictCompanyId: activeQueueElsewhere.companyId?._id,
        conflictCompanyName,
        conflictRound: activeQueueElsewhere.round,
      });
    }

    let finalStatus = "in_queue";

    const roundNameStr = resolvedRoundObj ? (resolvedRoundObj.roundName || `Round ${resolvedRoundObj.roundNumber}`) : "Round 1";

    // Find or create queue entry.
    // Some databases may still have the legacy unique index on { companyId, studentId },
    // so we reuse an existing company-level row when a round-specific row doesn't exist.
    let queueEntry = await Queue.findOne({ studentId, companyId, round: roundNameStr });
    if (!queueEntry) {
      queueEntry = await Queue.findOne({ studentId, companyId }).sort({ updatedAt: -1, createdAt: -1 });
    }

    if (queueEntry) {
      if (queueEntry.roundId?.toString() === resolvedRoundId.toString() && ["in_queue", "in_interview", "on_hold", "not_joined"].includes(queueEntry.status)) {
        return res.status(400).json({ message: "Student is actively in this round's queue already." });
      }

      // Calculate next position for this specific round
      const lastEntry = await Queue.findOne({ companyId, roundId: resolvedRoundId, status: { $in: ["in_queue", "in_interview"] } }).sort({ position: -1 });
      const nextPosition = (lastEntry && lastEntry.position ? lastEntry.position : 0) + 1;

      queueEntry.roundId = resolvedRoundId;
      queueEntry.round = roundNameStr;
      queueEntry.status = finalStatus;
      queueEntry.position = nextPosition;
      queueEntry.panelId = undefined;
      queueEntry.interviewStartedAt = undefined;
      queueEntry.completedAt = undefined;
      await queueEntry.save();
    } else {
      // Calculate next position for this specific round
      const lastEntry = await Queue.findOne({ companyId, roundId: resolvedRoundId, status: { $in: ["in_queue", "in_interview"] } }).sort({ position: -1 });
      const nextPosition = (lastEntry && lastEntry.position ? lastEntry.position : 0) + 1;

      queueEntry = await Queue.create({
        studentId,
        companyId,
        roundId: resolvedRoundId,
        round: roundNameStr,
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

    const studentDoc = await Student.findById(studentId);
    if (studentDoc && studentDoc.userId) {
      const companyDoc = await Company.findById(companyId);
      const companyName = companyDoc ? companyDoc.name : "the company";
      const message = `You have been added to ${roundNameStr} for ${companyName}`;
      await notificationService.sendNotification({
        recipientId: studentDoc.userId,
        senderId: req.user.id,
        companyId,
        message,
        type: "interview_call",
      });
      const { getIO } = require("../config/socket");
      const io = getIO();
      if (io) {
        io.to(`user:${studentDoc.userId}`).emit("status:updated", { companyId, status: finalStatus });
      }
    }

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

    const companyDoc = await Company.findById(companyId);
    const companyName = companyDoc ? companyDoc.name : "the company";

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
        queueEntry.status = "not_joined";
        await queueEntry.save();
      } else {
        await Queue.create({
          studentId: student._id,
          companyId,
          roundId: round._id,
          status: "not_joined",
        });
      }

      // Shortlist
      await Company.findByIdAndUpdate(companyId, {
        $addToSet: { shortlistedStudents: student._id },
      });
      await Student.findByIdAndUpdate(student._id, {
        $addToSet: { shortlistedCompanies: companyId },
      });

      if (student.userId) {
        const message = `You have been added to ${round.roundName} for ${companyName}`;
        await notificationService.sendNotification({
          recipientId: student.userId,
          senderId: req.user.id,
          companyId,
          message,
          type: "interview_call",
        });
        const { getIO } = require("../config/socket");
        const io = getIO();
        if (io) {
          io.to(`user:${student.userId}`).emit("status:updated", { companyId, status: "not_joined" });
        }
      }

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
      source: { $in: ["student", "apc", "coco", "system"] }
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
      source: { $in: ["student", "apc", "coco", "system"] }
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

// @desc    Get pending queue requests for a company
// @route   GET /api/coco/company/:companyId/pending
const getPendingRequests = async (req, res) => {
  try {
    const { round = "Round 1" } = req.query;
    const entries = await queueService.getPendingRequests(req.params.companyId, round);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Accept a pending queue request
// @route   PUT /api/coco/queue/accept
const acceptStudent = async (req, res) => {
  try {
    const { studentId, companyId, round = "Round 1" } = req.body;
    const result = await queueService.acceptQueueRequest(studentId, companyId, round);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Reject a pending queue request
// @route   PUT /api/coco/queue/reject
const rejectStudent = async (req, res) => {
  try {
    const { studentId, companyId, round = "Round 1" } = req.body;
    const result = await queueService.rejectQueueRequest(studentId, companyId, round);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Mark student interview as completed
// @route   PUT /api/coco/queue/complete
const markCompleted = async (req, res) => {
  try {
    const { studentId, companyId, round = "Round 1" } = req.body;
    const result = await queueService.updateStatus(studentId, companyId, "completed", null, null, round);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Update company venue
// @route   PUT /api/coco/company/:companyId/venue
const updateCompanyVenue = async (req, res) => {
  try {
    const { venue } = req.body;
    if (!venue || !venue.trim()) {
      return res.status(400).json({ message: "Venue is required" });
    }

    // Fetch company BEFORE update to capture old venue
    const oldCompany = await Company.findById(req.params.companyId);
    if (!oldCompany) return res.status(404).json({ message: "Company not found" });

    const oldVenue = oldCompany.venue || "Not Set";
    const newVenue = venue.trim();

    const company = await Company.findByIdAndUpdate(
      req.params.companyId,
      { venue: newVenue },
      { new: true }
    );

    const { getIO } = require("../config/socket");
    const io = getIO();
    if (io) io.to(company._id.toString()).emit("status:updated");

    // Send location change notifications only if venue actually changed
    if (oldVenue !== newVenue) {
      const User = require("../models/User.model");
      const message = `Location for ${company.name} has been changed from ${oldVenue} to ${newVenue}`;

      // Collect recipient user IDs
      const recipientIds = new Set();

      // 1. Students: shortlisted only (normal) or ALL (walk-in)
      if (company.isWalkInEnabled) {
        const allStudents = await Student.find().select("userId");
        allStudents.forEach(s => { if (s.userId) recipientIds.add(s.userId.toString()); });
      } else {
        const shortlistedStudents = await Student.find({ _id: { $in: company.shortlistedStudents || [] } }).select("userId");
        shortlistedStudents.forEach(s => { if (s.userId) recipientIds.add(s.userId.toString()); });
      }

      // 2. All CoCos
      const cocoUsers = await User.find({ role: "coco" }).select("_id");
      cocoUsers.forEach(u => recipientIds.add(u._id.toString()));

      // 3. All APCs (admin role)
      const apcUsers = await User.find({ role: "admin" }).select("_id");
      apcUsers.forEach(u => recipientIds.add(u._id.toString()));

      // Send notifications in parallel
      const notifPromises = Array.from(recipientIds).map(recipientId =>
        notificationService.sendNotification({
          recipientId,
          senderId: req.user.id,
          companyId: company._id,
          message,
          type: "alert",
          source: "coco",
        })
      );
      await Promise.allSettled(notifPromises);
    }

    res.json(company);
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
  getPendingRequests, acceptStudent, rejectStudent, markCompleted,
  updateCompanyVenue,
};
