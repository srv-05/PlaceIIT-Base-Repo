const mongoose = require("mongoose");

const excelUploadSchema = new mongoose.Schema(
  {
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    type: {
      type: String,
      enum: ["company_info", "student_shortlist", "coordinator_requirements", "priority_order"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed"],
      default: "pending",
    },
    recordsProcessed: { type: Number, default: 0 },
    errors: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExcelUpload", excelUploadSchema);
