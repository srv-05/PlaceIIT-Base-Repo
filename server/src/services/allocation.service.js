const XLSX = require("xlsx");
const Company = require("../models/Company.model");
const Coordinator = require("../models/Coordinator.model");
const ExcelUpload = require("../models/ExcelUpload.model");

/**
 * Randomly allocates coordinators to companies based on requirements.
 * Expected Excel columns: companyName, cocoCount
 */
const processAllocationExcel = async (uploadId, filePath) => {
  try {
    await ExcelUpload.findByIdAndUpdate(uploadId, { status: "processing" });
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const errors = [];
    let processed = 0;

    // Get all available coordinators
    const allCocos = await Coordinator.find();

    // Shuffle coordinators for random allocation
    const shuffled = [...allCocos].sort(() => Math.random() - 0.5);
    let cocoIndex = 0;

    for (const row of rows) {
      try {
        const company = await Company.findOne({ name: row.companyName });
        if (!company) throw new Error(`Company ${row.companyName} not found`);

        const count = Number(row.cocoCount) || 1;
        const assigned = [];

        for (let i = 0; i < count; i++) {
          if (cocoIndex >= shuffled.length) cocoIndex = 0; // wrap around
          const coco = shuffled[cocoIndex++];
          assigned.push(coco._id);
          await Coordinator.findByIdAndUpdate(coco._id, {
            $addToSet: { assignedCompanies: company._id },
          });
        }

        await Company.findByIdAndUpdate(company._id, {
          $addToSet: { assignedCocos: { $each: assigned } },
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

module.exports = { processAllocationExcel };
