const mongoose = require("mongoose");

const coordinatorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    rollNumber: { type: String, unique: true },
    contact: { type: String },
    assignedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coordinator", coordinatorSchema);
