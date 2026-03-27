const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const Panel = require("../models/Panel.model");
const { STUDENT_STATUS, SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");
const InterviewRound = require("../models/InterviewRound.model");

// Statuses that mean a student is "actively" occupying a slot
const ACTIVE_STATUSES = [
  STUDENT_STATUS.PENDING,
  STUDENT_STATUS.IN_QUEUE,
  STUDENT_STATUS.IN_INTERVIEW,
  STUDENT_STATUS.ON_HOLD,
];
const TERMINAL_STATUSES = [STUDENT_STATUS.COMPLETED, STUDENT_STATUS.REJECTED, STUDENT_STATUS.EXITED, STUDENT_STATUS.OFFER_GIVEN];

const hasInterviewHistoryForCompany = async (studentId, companyId) => {
  const priorInterview = await Queue.exists({
    studentId,
    companyId,
    $or: [
      { interviewStartedAt: { $exists: true, $ne: null } },
      { status: STUDENT_STATUS.IN_INTERVIEW },
    ],
  });

  return !!priorInterview;
};

/* ─────────────────────────────────────────────────────────
   Helper: emit without crashing
───────────────────────────────────────────────────────── */
function safeEmit(...args) {
  try { getIO().emit(...args); } catch (_) { }
}
function safeEmitTo(room, event, data) {
  try { getIO().to(room).emit(event, data); } catch (_) { }
}

/* ─────────────────────────────────────────────────────────
   hasActiveQueue — returns the student's current active entry
   (pending or in_queue or in_interview) across ALL companies
─────────────────────────────────────────────────────────── */
const hasActiveQueue = async (studentId) => {
  const activeEntries = await Queue.find({
    studentId,
    status: { $in: ACTIVE_STATUSES },
  }).populate("companyId", "name isWalkInEnabled");

  return activeEntries.find(entry => {
    if (entry.isWalkIn && (!entry.companyId || !entry.companyId.isWalkInEnabled)) {
      return false; // Stale walk-in entry
    }
    return true;
  });
};

/* ─────────────────────────────────────────────────────────
   joinQueue — creates a PENDING entry
   Throws a 409-style error with conflictCompanyId if already active elsewhere
─────────────────────────────────────────────────────────── */
const joinQueue = async (studentId, companyId, round = "Round 1", isWalkIn = false) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  if (isWalkIn && !company.isWalkInEnabled)
    throw new Error("Walk-in is not enabled for this company");

  if (isWalkIn && await hasInterviewHistoryForCompany(studentId, companyId))
    throw new Error("You have already interviewed for this company and cannot join its walk-in queue again.");

  if (!isWalkIn) {
    const student = await Student.findById(studentId);
    if (!student.shortlistedCompanies.map(String).includes(String(companyId)))
      throw new Error("Student is not shortlisted for this company");
  }

  // Check existing entry for THIS company and THIS round  
  const existing = await Queue.findOne({ companyId, studentId, round });
  if (existing) {
    let isStaleWalkIn = existing.isWalkIn && !company.isWalkInEnabled;

    if (ACTIVE_STATUSES.includes(existing.status)) {
      if (isStaleWalkIn) {
        // Obsolete entry since walk-in is disabled, treat as terminal
        await Queue.findByIdAndDelete(existing._id);
      } else {
        throw new Error("You already have an active request for this round");
      }
    } else {
      // Any non-active entry (terminal, not_joined, on_hold, stale walk-in, etc.) — remove so we can create fresh pending
      await Queue.findByIdAndDelete(existing._id);
    }
  }

  // Check if student already active in another company → conflict
  const activeElsewheres = await Queue.find({
    studentId,
    companyId: { $ne: companyId },
    status: { $in: ACTIVE_STATUSES },
  }).populate("companyId", "name isWalkInEnabled");

  const activeElsewhere = activeElsewheres.find(entry => {
    if (entry.isWalkIn && (!entry.companyId || !entry.companyId.isWalkInEnabled)) {
      return false; // Stale walk-in entry
    }
    return true;
  });

  if (activeElsewhere) {
    if (activeElsewhere.status === STUDENT_STATUS.IN_INTERVIEW) {
      throw new Error("You are currently in an interview. Actions are disabled.");
    }
    const err = new Error("You already have an active request for another company or round. Please leave that queue first, or confirm to switch.");
    err.code = "QUEUE_CONFLICT";
    err.conflictCompanyId = String(activeElsewhere.companyId._id);
    err.conflictCompanyName = activeElsewhere.companyId.name;
    err.conflictRound = activeElsewhere.round;
    throw err;
  }

  const entry = await Queue.create({
    companyId,
    studentId,
    round,
    status: STUDENT_STATUS.PENDING,
    isWalkIn,
    joinedAt: new Date(),
  });

  // Notify the company room so COCO sees the request immediately
  const studentDoc = await Student.findById(studentId);
  safeEmitTo(`company:${companyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
    companyId,
    action: "pending_request",
    entry,
    studentName: studentDoc?.name ?? "A student",
  });

  return entry;
};

/* ─────────────────────────────────────────────────────────
   switchAndJoin — exit active entry, then create new PENDING
─────────────────────────────────────────────────────────── */
const switchAndJoin = async (studentId, fromCompanyId, fromRound, toCompanyId, toRound, isWalkIn = false) => {
  // Soft-exit the existing active entry
  const existing = await Queue.findOne({
    studentId,
    companyId: fromCompanyId,
    round: fromRound,
    status: { $in: ACTIVE_STATUSES },
  });
  if (existing) {
    if (existing.status === STUDENT_STATUS.IN_INTERVIEW) {
      throw new Error("Cannot switch queues while in an active interview. Actions are disabled.");
    }
    existing.status = STUDENT_STATUS.EXITED;
    existing.completedAt = new Date();
    await existing.save();

    safeEmitTo(`company:${fromCompanyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
      companyId: fromCompanyId, action: "exited", studentId,
    });

    const st = await Student.findById(studentId);
    if (st) {
      safeEmitTo(`user:${st.userId}`, SOCKET_EVENTS.STATUS_UPDATED, {
        companyId: fromCompanyId, status: STUDENT_STATUS.EXITED,
      });
    }
  }

  // Now join the new company as pending (conflict check bypassed since we just exited)
  const company = await Company.findById(toCompanyId);
  if (!company) throw new Error("Company not found");

  if (isWalkIn && !company.isWalkInEnabled)
    throw new Error("Walk-in is not enabled for this company");

  if (isWalkIn && await hasInterviewHistoryForCompany(studentId, toCompanyId))
    throw new Error("You have already interviewed for this company and cannot join its walk-in queue again.");

  if (!isWalkIn) {
    const student = await Student.findById(studentId);
    if (!student.shortlistedCompanies.map(String).includes(String(toCompanyId)))
      throw new Error("Student is not shortlisted for this company");
  }

  // Remove terminal entries for toCompanyId + toRound
  await Queue.deleteMany({ studentId, companyId: toCompanyId, round: toRound, status: { $in: TERMINAL_STATUSES } });

  const entry = await Queue.create({
    companyId: toCompanyId,
    studentId,
    round: toRound,
    status: STUDENT_STATUS.PENDING,
    isWalkIn,
    joinedAt: new Date(),
  });

  safeEmitTo(`company:${toCompanyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
    companyId: toCompanyId, action: "pending", entry,
  });

  return entry;
};

const recalculateQueuePositions = async (companyId, round, roundId, removedPosition) => {
  if (typeof removedPosition !== "number") return;

  const scope = roundId ? { roundId } : { round };
  const trailingEntries = await Queue.find({
    companyId,
    ...scope,
    status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] },
    position: { $gt: removedPosition },
  }).sort({ position: 1 });

  await Promise.all(trailingEntries.map((queuedStudent) => {
    queuedStudent.position -= 1;
    return queuedStudent.save();
  }));
};

/* ─────────────────────────────────────────────────────────
   leaveQueue — fully removes the active queue entry
─────────────────────────────────────────────────────────── */
const leaveQueue = async (studentId, companyId, round = "Round 1") => {
  const activeEntries = await Queue.find({
    companyId,
    studentId,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ createdAt: -1 });

  const matchingEntries = activeEntries.filter((entry) => entry.round === round);
  const entriesToRemove = matchingEntries.length > 0 ? matchingEntries : activeEntries;

  if (entriesToRemove.length === 0) throw new Error("No active queue entry found for this company");

  if (entriesToRemove.some((entry) => entry.status === STUDENT_STATUS.IN_INTERVIEW)) {
    throw new Error("Cannot exit queue while in an active interview. Actions are disabled.");
  }

  const affectedScopes = entriesToRemove.map((entry) => ({
    id: entry._id,
    position: entry.position,
    round: entry.round,
    roundId: entry.roundId,
  }));

  // Soft-exit: set status to EXITED instead of deleting, so completed entries for prior rounds survive
  await Queue.updateMany(
    { _id: { $in: affectedScopes.map((entry) => entry.id) } },
    { $set: { status: STUDENT_STATUS.EXITED, completedAt: new Date() } }
  );

  for (const removedEntry of affectedScopes) {
    await recalculateQueuePositions(
      companyId,
      removedEntry.round,
      removedEntry.roundId,
      removedEntry.position
    );
  }

  safeEmitTo(`company:${companyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
    companyId, action: "exited", studentId,
  });

  const studentDoc = await Student.findById(studentId);
  if (studentDoc) {
    safeEmitTo(`user:${studentDoc.userId}`, SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status: STUDENT_STATUS.NOT_JOINED,
    });
  }

  return { message: "Left queue successfully" };
};

/* ─────────────────────────────────────────────────────────
   acceptQueueRequest — COCO accepts a PENDING entry → IN_QUEUE
─────────────────────────────────────────────────────────── */
const acceptQueueRequest = async (studentId, companyId, round = "Round 1") => {
  const entry = await Queue.findOne({
    companyId,
    studentId,
    round,
    status: STUDENT_STATUS.PENDING,
  }).populate("studentId");
  if (!entry) throw new Error("No pending request found for this student");

  // Derive the round number from the entry's own round string (e.g. "Round 2" → 2)
  const match = (entry.round || "Round 1").match(/(\d+)/);
  const entryRoundNum = match ? Number(match[1]) : 1;
  let activeRound = await InterviewRound.findOne({ companyId, roundNumber: entryRoundNum });
  if (!activeRound) {
    activeRound = await InterviewRound.create({
      companyId,
      roundNumber: entryRoundNum,
      roundName: `Round ${entryRoundNum}`,
    });
  }
  entry.roundId = activeRound._id;
  // Preserve the entry's original round — do NOT overwrite with company.currentRound

  // Assign position
  const lastEntry = await Queue.findOne({
    companyId,
    roundId: entry.roundId,
    status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] },
  }).sort({ position: -1 });
  entry.position = (lastEntry?.position || 0) + 1;
  entry.status = STUDENT_STATUS.IN_QUEUE;
  await entry.save();

  // Walk-in queue participation must not change shortlist membership.
  if (!entry.isWalkIn) {
    await Company.findByIdAndUpdate(companyId, {
      $addToSet: { shortlistedStudents: studentId },
    });
    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { shortlistedCompanies: companyId },
    });
  }

  const studentDoc = await Student.findById(studentId);
  safeEmitTo(`company:${companyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
    companyId, action: "accepted", entry,
  });
  if (studentDoc) {
    safeEmitTo(`user:${studentDoc.userId}`, SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status: STUDENT_STATUS.IN_QUEUE,
    });
  }

  return entry;
};

/* ─────────────────────────────────────────────────────────
   rejectQueueRequest — COCO rejects a PENDING entry → REJECTED
─────────────────────────────────────────────────────────── */
const rejectQueueRequest = async (studentId, companyId, round = "Round 1") => {
  const entry = await Queue.findOne({
    companyId,
    studentId,
    round,
    status: STUDENT_STATUS.PENDING,
  });
  if (!entry) throw new Error("No pending request found for this student");

  entry.status = STUDENT_STATUS.REJECTED;
  entry.completedAt = new Date();
  await entry.save();

  const studentDoc = await Student.findById(studentId);
  safeEmitTo(`company:${companyId}`, SOCKET_EVENTS.QUEUE_UPDATED, {
    companyId, action: "rejected", studentId,
  });
  if (studentDoc) {
    safeEmitTo(`user:${studentDoc.userId}`, SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status: STUDENT_STATUS.REJECTED,
    });
  }

  return entry;
};

/* ─────────────────────────────────────────────────────────
   updateStatus — generic status update (COCO panel actions etc.)
─────────────────────────────────────────────────────────── */
const updateStatus = async (studentId, companyId, status, roundId = null, panelId = null, round = "Round 1") => {
  let entry = await Queue.findOne({ companyId, studentId, round }).populate("studentId");
  if (!entry) {
    entry = await Queue.findOne({
      companyId,
      studentId,
      status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW, STUDENT_STATUS.ON_HOLD, STUDENT_STATUS.NOT_JOINED] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("studentId");
  }
  if (!entry) throw new Error("Queue entry not found");

  entry.status = status;
  if (roundId) entry.roundId = roundId;
  if (panelId) entry.panelId = panelId;
  if (status === STUDENT_STATUS.IN_INTERVIEW) {
    entry.interviewStartedAt = new Date();
    entry.completedAt = undefined;
  }
  if ([STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.NOT_JOINED, STUDENT_STATUS.ON_HOLD].includes(status)) {
    entry.completedAt = undefined;
  }
  if ([STUDENT_STATUS.COMPLETED, STUDENT_STATUS.REJECTED, STUDENT_STATUS.EXITED].includes(status))
    entry.completedAt = new Date();

  await entry.save();

  if (status !== STUDENT_STATUS.IN_INTERVIEW) {
    await Panel.updateMany(
      { companyId, currentStudent: studentId },
      { $set: { currentStudent: null, status: "unoccupied" } }
    );
  }

  safeEmitTo(`company:${companyId}`, SOCKET_EVENTS.STATUS_UPDATED, {
    companyId, studentId, status,
  });
  if (entry.studentId?.userId) {
    safeEmitTo(`user:${entry.studentId.userId}`, SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status,
    });
  }

  return entry;
};

/* ─────────────────────────────────────────────────────────
   getQueue — full queue for a company (incl. pending)
─────────────────────────────────────────────────────────── */
const getQueue = async (companyId) => {
  return Queue.find({ companyId })
    .populate("studentId", "name rollNumber contact")
    .populate("roundId", "roundName roundNumber")
    .populate("panelId", "panelName")
    .sort({ position: 1 });
};

/* ─────────────────────────────────────────────────────────
   getPendingRequests — pending entries for a company
─────────────────────────────────────────────────────────── */
const getPendingRequests = async (companyId) => {
  return Queue.find({ companyId, status: STUDENT_STATUS.PENDING })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "email" },
    })
    .sort({ joinedAt: 1 });
};

module.exports = {
  joinQueue,
  switchAndJoin,
  leaveQueue,
  updateStatus,
  getQueue,
  getPendingRequests,
  acceptQueueRequest,
  rejectQueueRequest,
  hasActiveQueue,
  hasInterviewHistoryForCompany,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
};
