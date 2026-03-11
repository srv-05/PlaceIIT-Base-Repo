const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const Coordinator = require("../models/Coordinator.model");
const User = require("../models/User.model");
const ExcelUpload = require("../models/ExcelUpload.model");
const excelService = require("../services/excel.service");
const allocationService = require("../services/allocation.service");

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [students, cocos, companies] = await Promise.all([
      Student.countDocuments(),
      Coordinator.countDocuments(),
      Company.countDocuments({ isActive: true }),
    ]);
    res.json({ students, coordinators: cocos, companies });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all companies with optional filter
// @route   GET /api/admin/companies
const getCompanies = async (req, res) => {
  try {
    const { day, slot, search } = req.query;
    const filter = { isActive: true };
    if (day) filter.day = Number(day);
    if (slot) filter.slot = slot;
    if (search) filter.name = new RegExp(search, "i");

    const companies = await Company.find(filter).populate("assignedCocos", "name rollNumber");
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a company manually
// @route   POST /api/admin/companies
const addCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a company
// @route   PUT /api/admin/companies/:id
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Search students
// @route   GET /api/admin/students/search
const searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    const students = await Student.find({
      $or: [{ name: new RegExp(q, "i") }, { rollNumber: new RegExp(q, "i") }],
    }).limit(20);
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all coordinators
// @route   GET /api/admin/cocos
const getCocos = async (req, res) => {
  try {
    const cocos = await Coordinator.find().populate("assignedCompanies", "name day slot");
    res.json(cocos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Assign coco to company manually
// @route   POST /api/admin/assign-coco
const assignCoco = async (req, res) => {
  try {
    const { cocoId, companyId } = req.body;
    await Coordinator.findByIdAndUpdate(cocoId, { $addToSet: { assignedCompanies: companyId } });
    await Company.findByIdAndUpdate(companyId, { $addToSet: { assignedCocos: cocoId } });
    res.json({ message: "CoCo assigned successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Remove coco from company
// @route   POST /api/admin/remove-coco
const removeCoco = async (req, res) => {
  try {
    const { cocoId, companyId } = req.body;
    await Coordinator.findByIdAndUpdate(cocoId, { $pull: { assignedCompanies: companyId } });
    await Company.findByIdAndUpdate(companyId, { $pull: { assignedCocos: cocoId } });
    res.json({ message: "CoCo removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - company info
// @route   POST /api/admin/upload/companies
const uploadCompanyExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "company_info",
    });
    excelService.processCompanyExcel(upload._id, req.file.path); // async processing
    res.json({ message: "File uploaded, processing started", uploadId: upload._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - student shortlist
// @route   POST /api/admin/upload/shortlist
const uploadShortlistExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "student_shortlist",
    });
    excelService.processShortlistExcel(upload._id, req.file.path);
    res.json({ message: "File uploaded, processing started", uploadId: upload._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - coordinator requirements (for random allocation)
// @route   POST /api/admin/upload/coordinator-requirements
const uploadCocoRequirementsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "coordinator_requirements",
    });
    allocationService.processAllocationExcel(upload._id, req.file.path);
    res.json({ message: "File uploaded, allocation processing started", uploadId: upload._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get upload status
// @route   GET /api/admin/upload/:id
const getUploadStatus = async (req, res) => {
  try {
    const upload = await ExcelUpload.findById(req.params.id);
    res.json(upload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getCocos, assignCoco, removeCoco,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoRequirementsExcel, getUploadStatus,
};
