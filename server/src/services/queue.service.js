const Queue = require("../models/Queue.model");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const { STUDENT_STATUS, SOCKET_EVENTS } = require("../utils/constants");
const { getIO } = require("../config/socket");
const InterviewRound = require("../models/InterviewRound.model");

const joinQueue = async (studentId, companyId, isWalkIn = false) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  // Walk-in check
  if (isWalkIn && !company.isWalkInEnabled)
    throw new Error("Walk-in is not enabled for this company");

  // Check if shortlisted (skip for walk-in)
  if (!isWalkIn) {
    const student = await Student.findById(studentId);
    if (!student.shortlistedCompanies.includes(companyId))
      throw new Error("Student is not shortlisted for this company");
  }

  // Check if already in ANY active queue (single queue constraint)
  const activeEntry = await Queue.findOne({ 
    studentId, 
    status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] } 
  });
  if (activeEntry) throw new Error("You are already in an active queue. Please complete or leave it before joining another.");

  // Check if already in THIS company queue
  const existing = await Queue.findOne({ companyId, studentId });
  if (existing) throw new Error("Student is already in this queue");

  // Resolve active Round
  let roundId = null;
  const currentRoundNum = company.currentRound || 1;
  const activeRound = await InterviewRound.findOne({ companyId, roundNumber: currentRoundNum });
  if (activeRound) {
     roundId = activeRound._id;
  }

  // Get next position scoped to this round
  const lastEntry = await Queue.findOne({ companyId, roundId, status: { $in: [STUDENT_STATUS.IN_QUEUE, STUDENT_STATUS.IN_INTERVIEW] } })
    .sort({ position: -1 });
  const position = (lastEntry?.position || 0) + 1;

  const entry = await Queue.create({
    companyId,
    studentId,
    roundId,
    status: STUDENT_STATUS.IN_QUEUE,
    position,
    isWalkIn,
    joinedAt: new Date(),
  });

  // Emit real-time update
  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
      companyId,
      action: "joined",
      entry,
    });
  } catch (_) {}

  return entry;
};

const updateStatus = async (studentId, companyId, status, roundId = null, panelId = null) => {
  const entry = await Queue.findOne({ companyId, studentId }).populate("studentId");
  if (!entry) throw new Error("Queue entry not found");

  entry.status = status;
  if (roundId) entry.roundId = roundId;
  if (panelId) entry.panelId = panelId;
  if (status === STUDENT_STATUS.IN_INTERVIEW) entry.interviewStartedAt = new Date();
  if ([STUDENT_STATUS.COMPLETED, STUDENT_STATUS.REJECTED].includes(status))
    entry.completedAt = new Date();

  await entry.save();

  try {
    getIO().to(`company:${companyId}`).emit(SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, studentId, status,
    });
    // Notify the student personally - use userId for consistency with client room name
    getIO().to(`user:${entry.studentId.userId}`).emit(SOCKET_EVENTS.STATUS_UPDATED, {
      companyId, status,
    });
  } catch (_) {}

  return entry;
};

const getQueue = async (companyId) => {
  return Queue.find({ companyId })
    .populate("studentId", "name rollNumber contact")
    .populate("roundId", "roundName roundNumber")
    .populate("panelId", "panelName")
    .sort({ position: 1 });
};

module.exports = { joinQueue, updateStatus, getQueue };
