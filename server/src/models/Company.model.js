const mongoose = require("mongoose");
const { INTERVIEW_MODES, SLOTS } = require("../utils/constants");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String },
    description: { type: String },
    day: { type: Number, required: true },
    slot: { type: String, enum: Object.values(SLOTS), required: true },
    venue: { type: String, required: true },
    mode: { type: String, enum: Object.values(INTERVIEW_MODES), default: "offline" },
    onlineLink: { type: String },
    assignedCocos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coordinator" }],
    shortlistedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    isWalkInEnabled: { type: Boolean, default: false },
    currentRound: { type: Number, default: 1 },
    totalRounds: { type: Number, default: 3 },
    requiredCocosCount: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
