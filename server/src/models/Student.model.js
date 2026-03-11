const mongoose = require("mongoose");

const prioritySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    order: { type: Number },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    branch: { type: String },
    batch: { type: String },
    cgpa: { type: Number },
    contact: { type: String },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    friendContact: {
      name: { type: String },
      phone: { type: String },
    },
    resume: { type: String }, // URL or path
    profileCompleted: { type: Boolean, default: false },
    shortlistedCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
    priorityOrder: [prioritySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
