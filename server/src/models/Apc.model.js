const mongoose = require("mongoose");

const apcSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    rollNumber: { type: String, unique: true },
    contact: { 
      type: String,
      unique: true,
      sparse: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"]
    },
    assignedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Apc", apcSchema);
