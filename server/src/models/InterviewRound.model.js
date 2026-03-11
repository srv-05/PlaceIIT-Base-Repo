const mongoose = require("mongoose");

const interviewRoundSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    roundNumber: { type: Number, required: true },
    roundName: { type: String, default: "" }, // e.g., "Technical Round 1", "HR"
    isActive: { type: Boolean, default: false },
    panels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Panel" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewRound", interviewRoundSchema);
