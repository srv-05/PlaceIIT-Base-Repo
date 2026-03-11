const mongoose = require("mongoose");
const { STUDENT_STATUS } = require("../utils/constants");

const queueEntrySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewRound" },
    panelId: { type: mongoose.Schema.Types.ObjectId, ref: "Panel" },
    status: {
      type: String,
      enum: Object.values(STUDENT_STATUS),
      default: STUDENT_STATUS.NOT_JOINED,
    },
    position: { type: Number },
    isWalkIn: { type: Boolean, default: false },
    joinedAt: { type: Date },
    interviewStartedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound index for quick lookup
queueEntrySchema.index({ companyId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Queue", queueEntrySchema);
