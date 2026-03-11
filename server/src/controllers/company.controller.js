const Company = require("../models/Company.model");
const Queue = require("../models/Queue.model");

// @desc    Get company details
// @route   GET /api/company/:id
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("assignedCocos", "name contact")
      .populate("shortlistedStudents", "name rollNumber");
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get full queue for a company
// @route   GET /api/company/:id/queue
const getCompanyQueue = async (req, res) => {
  try {
    const queue = await Queue.find({ companyId: req.params.id })
      .populate("studentId", "name rollNumber contact")
      .sort({ position: 1 });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCompany, getCompanyQueue };
