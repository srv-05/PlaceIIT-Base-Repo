const Company = require("../models/Company.model");
const Student = require("../models/Student.model");
const Coordinator = require("../models/Coordinator.model");
const User = require("../models/User.model");
const ExcelUpload = require("../models/ExcelUpload.model");
const excelService = require("../services/excel.service");
const allocationService = require("../services/allocation.service");
const { sendWelcomeEmail } = require("../services/email.service");
const { getIO } = require("../config/socket");
const crypto = require("crypto");
const { createApc } = require("../services/apc.service");
const Apc = require("../models/Apc.model");

const emitStatsUpdate = async () => {
  try {
    const [students, cocos, companies] = await Promise.all([
      Student.countDocuments(),
      Coordinator.countDocuments(),
      Company.countDocuments({ isActive: true }),
    ]);
    const io = getIO();
    if (io) io.emit("stats:updated", { students, coordinators: cocos, companies });
  } catch (err) {
    console.error("Failed to emit stats:", err);
  }
};

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

    const companies = await Company.find(filter).populate({
      path: "assignedCocos",
      select: "name rollNumber userId",
      populate: { path: "userId", select: "instituteId email" }
    });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a company manually
// @route   POST /api/admin/companies
const addCompany = async (req, res) => {
    const { name, day, slot, venue } = req.body;
    if (!name || day === undefined || !slot || !venue) {
      return res.status(400).json({ message: "Name, Day, Slot, and Venue are required fields" });
    }
  try {
    const company = await Company.create(req.body);
    await emitStatsUpdate();
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
    console.log("[searchStudents] query:", q);
    const filter = q
      ? { $or: [{ name: new RegExp(q, "i") }, { rollNumber: new RegExp(q, "i") }] }
      : {};
    const students = await Student.find(filter)
      .populate("userId", "email")
      .sort({ createdAt: -1 })
      .limit(100);
    console.log("[searchStudents] found:", students.length, "students");

    const { withQueueStatus } = require("../utils/student.helper");
    const studentsWithEmail = students.map((s) => {
      const obj = s.toObject();
      obj.email = obj.userId?.email || "";
      return obj;
    });
    const augmentedStudents = await withQueueStatus(studentsWithEmail);

    res.json(augmentedStudents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get companies for a specific student
// @route   GET /api/admin/students/:id/companies
const getStudentCompanies = async (req, res) => {
  try {
    const studentId = req.params.id;
    // Find all companies where this student is shortlisted
    const companies = await Company.find({ shortlistedStudents: studentId });
    
    // Check queue to determine status
    const Queue = require("../models/Queue.model");
    const queueEntries = await Queue.find({ studentId });
    const queueMap = queueEntries.reduce((acc, q) => {
      acc[q.companyId.toString()] = q.status;
      return acc;
    }, {});

    const mappedCompanies = companies.map(c => {
      let status = "Pending";
      const qStatus = queueMap[c._id.toString()];
      if (qStatus === "offer_given") status = "Selected";
      else if (qStatus === "rejected") status = "Rejected";

      return {
        id: c._id,
        name: c.name,
        day: c.day != null ? `Day ${c.day}` : "—",
        slot: c.slot ? c.slot.charAt(0).toUpperCase() + c.slot.slice(1) : "—",
        venue: c.venue || "Not Assigned",
        status,
        interviewDate: new Date().toISOString() // mock date or derive from day
      };
    });

    res.json(mappedCompanies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all coordinators
// @route   GET /api/admin/cocos
const getCocos = async (req, res) => {
  try {
    const cocos = await Coordinator.find()
      .populate("userId", "email instituteId")
      .populate("assignedCompanies", "name day slot");
    // Attach email to top-level for client convenience
    const result = cocos.map((c) => {
      const obj = c.toObject();
      obj.email = obj.userId?.email || "";
      obj.instituteId = obj.userId?.instituteId || "";
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const { createCoco } = require("../services/coco.service");

// @desc    Add a new CoCo (create user + coordinator)
// @route   POST /api/admin/cocos
const addCoco = async (req, res) => {
  try {
    const { name, email, rollNumber, contact } = req.body;
    
    try {
      const result = await createCoco({ name, email, rollNumber, contact });
      await emitStatsUpdate();
      res.status(201).json({ message: "CoCo added successfully and invitation email sent", ...result });
    } catch (err) {
      if (err.message.includes("Account created successfully, but welcome email failed")) {
         await emitStatsUpdate();
         res.status(201).json({ message: err.message });
      } else {
         throw err;
      }
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Add a new Student (create user + student)
// @route   POST /api/admin/students
const addStudent = async (req, res) => {
  try {
    console.log("[addStudent] Request body:", JSON.stringify(req.body));
    const { name, rollNumber, email, phone } = req.body;
    if (!name || !rollNumber || !email || !phone) return res.status(400).json({ message: "Name, Roll Number, Email ID, and Phone Number are required" });

    const instituteId = rollNumber;
    const finalEmail = email;

    // Generate random 8-char password
    const generatedPassword = crypto.randomBytes(4).toString("hex");

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ instituteId }, { email: finalEmail }] });
    if (existing) return res.status(400).json({ message: `User with roll number "${rollNumber}" or email "${finalEmail}" already exists` });

    // Check if student record already exists
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) return res.status(400).json({ message: `Student with roll number "${rollNumber}" already exists` });

    const user = await User.create({
      instituteId,
      email: finalEmail,
      password: generatedPassword,
      role: "student",
      mustChangePassword: true,
    });

    const student = await Student.create({
      userId: user._id,
      name,
      rollNumber,
      phone,
    });
    
    await emitStatsUpdate();

    let emailSent = false;
    try {
      await sendWelcomeEmail(finalEmail, name, rollNumber, generatedPassword);
      emailSent = true;
    } catch (err) {
      console.error("[addStudent] Non-fatal error: Failed to send welcome email to", finalEmail, err);
    }

    const resMessage = emailSent 
      ? "Student added successfully" 
      : "Student added successfully (Warning: Welcome email could not be sent)";

    res.status(201).json({ 
      message: resMessage, 
      student, 
      credentials: { instituteId, password: generatedPassword },
      emailSent
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all APCs
// @route   GET /api/admin/apcs
const getApcs = async (req, res) => {
  try {
    const apcs = await Apc.find().populate("userId", "email instituteId");
    const result = apcs.map((a) => {
      const obj = a.toObject();
      obj.email = obj.userId?.email || "";
      obj.instituteId = obj.userId?.instituteId || "";
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add a new APC (User + Apc model)
// @route   POST /api/admin/apc
const addApc = async (req, res) => {
  try {
    const { name, email, rollNumber, contact } = req.body;
    
    // Check if the current user is mainAdmin
    const reqUser = await User.findById(req.user.id);
    if (!reqUser || !reqUser.isMainAdmin) {
      return res.status(403).json({ message: "Only main admin can create APCs" });
    }

    try {
      const result = await createApc({ name, email, rollNumber, contact });
      await emitStatsUpdate(); // optional: emit stats
      res.status(201).json({ message: "APC added successfully and invitation email sent", ...result });
    } catch (err) {
      if (err.message.includes("Account created successfully, but welcome email failed")) {
         await emitStatsUpdate();
         res.status(201).json({ message: err.message });
      } else {
         throw err;
      }
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Remove APC
// @route   POST /api/admin/remove-apc
const removeApc = async (req, res) => {
  try {
    const { apcId } = req.body;
    const reqUser = await User.findById(req.user.id);
    if (!reqUser || !reqUser.isMainAdmin) {
      return res.status(403).json({ message: "Only main admin can remove APCs" });
    }
    const apc = await Apc.findById(apcId);
    if (apc) {
      await User.findByIdAndDelete(apc.userId);
      await Apc.findByIdAndDelete(apcId);
    }
    res.json({ message: "APC removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Assign coco to company manually
// @route   POST /api/admin/assign-coco
const assignCoco = async (req, res) => {
  try {
    const { cocoId, companyId } = req.body;
    
    // Check if coco is already assigned to ANY company (other than this one maybe?)
    const coco = await Coordinator.findById(cocoId);
    if (!coco) return res.status(404).json({ message: "CoCo not found" });
    
    const otherCompanies = coco.assignedCompanies.filter(id => id.toString() !== companyId);
    if (otherCompanies.length > 0) {
      return res.status(400).json({ 
        message: "This CoCo is already allocated to another company. Please remove them from the old company first." 
      });
    }

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
    // Process synchronously so we can return results
    const result = await excelService.processCompanyExcel(upload._id, req.file.path);
    await emitStatsUpdate();
    res.json({ message: `${result.processed} company/companies processed from Excel`, uploadId: upload._id, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - student shortlist
// @route   POST /api/admin/upload/shortlist
const uploadShortlistExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { companyId } = req.body;
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "student_shortlist",
    });
    const result = await excelService.processShortlistExcel(upload._id, req.file.path, companyId || null);
    res.json({ message: `${result.processed} student(s) shortlisted from Excel`, uploadId: upload._id, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - coordinator import (add new cocos from Excel)
// @route   POST /api/admin/upload/cocos
const uploadCocoExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "coordinator_requirements",
    });
    const result = await excelService.processCocoExcel(upload._id, req.file.path);
    await emitStatsUpdate();
    res.json({ message: `${result.processed} CoCo(s) imported from Excel`, uploadId: upload._id, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - apc import
// @route   POST /api/admin/upload/apcs
const uploadApcExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const reqUser = await User.findById(req.user.id);
    if (!reqUser || !reqUser.isMainAdmin) {
      return res.status(403).json({ message: "Only main admin can upload APCs" });
    }
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "coordinator_requirements", // reusing type to satisfy any schema enum
    });
    const result = await excelService.processApcExcel(upload._id, req.file.path);
    res.json({ message: `${result.processed} APC(s) imported from Excel`, uploadId: upload._id, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Upload Excel - student import (add new students from Excel)
// @route   POST /api/admin/upload/students
const uploadStudentExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "student_import",
    });
    const result = await excelService.processStudentExcel(upload._id, req.file.path);
    await emitStatsUpdate();
    res.json({ message: `${result.processed} Student(s) imported from Excel`, uploadId: upload._id, ...result });
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

// @desc    Manually shortlist students for a company by roll numbers
// @route   POST /api/admin/students/shortlist
const shortlistStudents = async (req, res) => {
  try {
    const { companyId, rollNumbers } = req.body;
    if (!companyId || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ message: "companyId and rollNumbers[] are required" });
    }

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const students = await Student.find({ rollNumber: { $in: rollNumbers } });
    if (students.length === 0) {
      return res.status(404).json({ message: `No students found matching the provided roll numbers` });
    }

    const studentIds = students.map((s) => s._id);

    // Add students to company's shortlist (avoid duplicates)
    await Company.findByIdAndUpdate(companyId, {
      $addToSet: { shortlistedStudents: { $each: studentIds } },
    });

    // Add company to each student's shortlistedCompanies
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $addToSet: { shortlistedCompanies: companyId } }
    );

    res.json({
      message: `${students.length} student(s) shortlisted successfully`,
      shortlisted: students.map((s) => ({ name: s.name, rollNumber: s.rollNumber })),
      notFound: rollNumbers.filter((r) => !students.find((s) => s.rollNumber === r)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get shortlisted students for a company
// @route   GET /api/admin/companies/:id/students
const getShortlistedStudents = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate({
        path: "shortlistedStudents",
        populate: { path: "userId", select: "email" }
      });
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Format students with basic info
    const students = company.shortlistedStudents.map(s => ({
      _id: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      email: s.userId?.email || "",
      branch: s.branch || "N/A",
      cgpa: s.cgpa || "N/A",
      phone: s.contact || "N/A"
    }));

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Auto allocate CoCos to companies
// @route   POST /api/admin/auto-allocate-cocos
const autoAllocateCocos = async (req, res) => {
  try {
    // First, clear all existing assignments
    await Coordinator.updateMany({}, { $set: { assignedCompanies: [] } });
    await Company.updateMany({}, { $set: { assignedCocos: [] } });

    const [cocos, companies] = await Promise.all([
      Coordinator.find(),
      Company.find({ isActive: true })
    ]);

    if (cocos.length === 0) {
      return res.status(400).json({ message: "No CoCos available for allocation" });
    }
    if (companies.length === 0) {
      return res.status(400).json({ message: "No companies available for allocation" });
    }

    const totalRequiredCocos = companies.reduce((sum, c) => sum + (c.requiredCocosCount || 1), 0);
    if (totalRequiredCocos > cocos.length) {
      return res.status(400).json({ message: `Cannot auto allocate: ${totalRequiredCocos} CoCos are required in total but only ${cocos.length} are available.` });
    }

    // Track global usage
    const usedCoCos = new Set();
    const cocoAssignments = {}; // cocoId -> array of {day, slot}
    cocos.forEach(c => {
      cocoAssignments[c._id.toString()] = [];
    });

    const isAssignedInSameDaySlot = (cocoId, day, slot) => {
      const assignments = cocoAssignments[cocoId];
      return assignments.some(a => a.day === day && a.slot === slot);
    };

    const results = [];
    const unallottedCompanies = [];

    // Shuffle companies to distribute randomly
    const shuffledCompanies = [...companies].sort(() => Math.random() - 0.5);

    for (const company of shuffledCompanies) {
      const { day, slot } = company;

      // Ensure day and slot exist
      if (!day || !slot) {
        unallottedCompanies.push({
          id: company._id,
          name: company.name,
          day: day || "Unknown",
          slot: slot || "Unknown",
          reason: "Company missing Day/Slot"
        });
        continue;
      }

      const requiredCount = company.requiredCocosCount || 1;
      let allocatedCount = 0;

      for (let i = 0; i < requiredCount; i++) {
        // Step 1: Get available Co-Cos NOT used globally AND NOT in same day/slot AND not already assigned to this company
        let available = cocos.filter(c => 
          !usedCoCos.has(c._id.toString()) && 
          !isAssignedInSameDaySlot(c._id.toString(), day, slot) &&
          !company.assignedCocos.includes(c._id)
        );

        // Step 4: If unused list is empty, allow reuse but still enforce day/slot
        if (available.length === 0) {
          console.log(`[AutoAllocate] Reusing Co-Co after all exhausted for company ${company.name}`);
          available = cocos.filter(c => 
            !isAssignedInSameDaySlot(c._id.toString(), day, slot) &&
            !company.assignedCocos.includes(c._id)
          );
        }

        // Step 6: Randomly assign from available
        if (available.length > 0) {
          const selected = available[Math.floor(Math.random() * available.length)];
          
          usedCoCos.add(selected._id.toString());
          cocoAssignments[selected._id.toString()].push({ day, slot });
          company.assignedCocos.push(selected._id); // So we don't pick them again for the same company

          // Execute DB writes
          await Coordinator.findByIdAndUpdate(selected._id, {
            $addToSet: { assignedCompanies: company._id }
          });
          await Company.findByIdAndUpdate(company._id, {
            $addToSet: { assignedCocos: selected._id }
          });

          results.push({ company: company.name, coco: selected.name, day, slot });
          allocatedCount++;
        }
      }

      if (allocatedCount < requiredCount) {
        console.warn(`[AutoAllocate] Only ${allocatedCount}/${requiredCount} Co-Cos available for company ${company.name} at Day ${day} Slot ${slot}`);
        unallottedCompanies.push({
          id: company._id,
          name: company.name,
          day,
          slot,
          reason: `Only ${allocatedCount}/${requiredCount} Co-Cos available (Day/Slot conflict)`
        });
      }
    }

    const response = {
      message: "Auto-allocation completed",
      results,
      totalAllocated: results.length,
      totalCocos: cocos.length,
      totalCompanies: companies.length,
    };

    if (unallottedCompanies.length > 0) {
      response.unallottedCompanies = unallottedCompanies;
      response.warning = `${unallottedCompanies.length} company/companies could not be allotted due to day/slot conflicts. Check them under the unallotted companies list.`;
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get CoCo scheduling conflicts (same day+slot)
// @route   GET /api/admin/coco-conflicts
const getCocoConflicts = async (req, res) => {
  try {
    const cocos = await Coordinator.find()
      .populate("userId", "email")
      .populate("assignedCompanies", "name day slot venue");

    const conflicts = [];
    for (const coco of cocos) {
      const companies = coco.assignedCompanies || [];
      for (let i = 0; i < companies.length; i++) {
        for (let j = i + 1; j < companies.length; j++) {
          const a = companies[i];
          const b = companies[j];
          if (a.day === b.day && a.slot === b.slot) {
            conflicts.push({
              coco: {
                id: coco._id,
                name: coco.name,
                rollNumber: coco.rollNumber,
                contact: coco.contact,
                email: coco.userId?.email || "",
              },
              company1: { id: a._id, name: a.name, day: a.day, slot: a.slot, venue: a.venue },
              company2: { id: b._id, name: b.name, day: b.day, slot: b.slot, venue: b.venue },
              slot: `Day ${a.day} - ${a.slot}`,
            });
          }
        }
      }
    }

    res.json({ conflicts, total: conflicts.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getStudentCompanies, getCocos, addCoco, addStudent, getApcs, addApc, removeApc,
  assignCoco, removeCoco,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoExcel, uploadApcExcel, uploadStudentExcel, uploadCocoRequirementsExcel, getUploadStatus,
  shortlistStudents, getShortlistedStudents, autoAllocateCocos, getCocoConflicts
};
