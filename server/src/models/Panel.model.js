const mongoose = require("mongoose");

const panelSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    roundId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewRound", required: true },
    panelName: { type: String, required: true }, // e.g., "Panel A"
    interviewers: [{ type: String }], // Names of interviewers
    venue: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Panel", panelSchema);
