const XLSX = require("xlsx");
const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const ExcelUpload = require("../models/ExcelUpload.model");

/**
 * Expected columns: name, day, slot, venue, mode, totalRounds
 */
const processCompanyExcel = async (uploadId, filePath) => {
  try {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "processing" });
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let processed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        await Company.findOneAndUpdate(
          { name: row.name },
          {
            name: row.name,
            day: row.day,
            slot: row.slot?.toLowerCase(),
            venue: row.venue,
            mode: row.mode?.toLowerCase() || "offline",
            totalRounds: row.totalRounds || 1,
          },
          { upsert: true, new: true }
        );
        processed++;
      } catch (e) {
        errors.push(`Row ${processed + 1}: ${e.message}`);
      }
    }

    await ExcelUpload.findByIdAndUpdate(uploadId, {
      status: errors.length === rows.length ? "failed" : "success",
      recordsProcessed: processed,
      errors,
    });
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, {
      status: "failed",
      errors: [err.message],
    });
  }
};

/**
 * Expected columns: rollNumber, companyName, priorityOrder
 */
const processShortlistExcel = async (uploadId, filePath) => {
  try {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "processing" });
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let processed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const student = await Student.findOne({ rollNumber: String(row.rollNumber) });
        const company = await Company.findOne({ name: row.companyName });
        if (!student) throw new Error(`Student ${row.rollNumber} not found`);
        if (!company) throw new Error(`Company ${row.companyName} not found`);

        await Student.findByIdAndUpdate(student._id, {
          $addToSet: { shortlistedCompanies: company._id },
          $push: {
            priorityOrder: { companyId: company._id, order: row.priorityOrder || 99 },
          },
        });
        await Company.findByIdAndUpdate(company._id, {
          $addToSet: { shortlistedStudents: student._id },
        });
        processed++;
      } catch (e) {
        errors.push(`Row ${processed + 1}: ${e.message}`);
      }
    }

    await ExcelUpload.findByIdAndUpdate(uploadId, {
      status: errors.length === rows.length ? "failed" : "success",
      recordsProcessed: processed,
      errors,
    });
  } catch (err) {
    await ExcelUpload.findByIdAndUpdate(uploadId, {
      status: "failed",
      errors: [err.message],
    });
  }
};

module.exports = { processCompanyExcel, processShortlistExcel };
