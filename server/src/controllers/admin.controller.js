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
const DriveState = require("../models/DriveState.model");
const Notification = require("../models/Notification.model");
const { SOCKET_EVENTS } = require("../utils/constants");
const queueService = require("../services/queue.service");

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
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  if (emojiRegex.test(name) || emojiRegex.test(venue)) {
    return res.status(400).json({ message: "Company name and venue cannot contain emojis" });
  }
  try {
    // Check for duplicate company name (case-insensitive)
    const existing = await Company.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, isActive: true });
    if (existing) {
      return res.status(400).json({ message: `Company "${name.trim()}" already exists` });
    }
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
    const { name, venue } = req.body;
    if (venue !== undefined && !venue.trim()) {
      return res.status(400).json({ message: "Company venue cannot be empty or just spaces" });
    }
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    if ((name && emojiRegex.test(name)) || (venue && emojiRegex.test(venue))) {
      return res.status(400).json({ message: "Company name and venue cannot contain emojis" });
    }
    const updateData = { ...req.body };
    if (venue !== undefined) updateData.venue = venue.trim();
    const company = await Company.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    const { day, slot } = req.query;
    let matchCondition = {};
    if (day) matchCondition.day = Number(day);
    if (slot) matchCondition.slot = slot;

    const cocos = await Coordinator.find()
      .populate("userId", "email instituteId")
      .populate({
        path: "assignedCompanies",
        select: "name day slot",
        match: Object.keys(matchCondition).length > 0 ? matchCondition : undefined
      });

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
    if (!name || !name.trim() || !rollNumber || !String(rollNumber).trim() || !email || !phone) {
      return res.status(400).json({ message: "Name, Roll Number, Email ID, and Phone Number are required" });
    }

    const finalName = name.trim();
    if (!finalName || !/^[A-Za-z\s]+$/.test(finalName)) {
      return res.status(400).json({ message: "Student name can only contain letters and spaces" });
    }

    const finalRollNumber = String(rollNumber).trim();
    if (!/^[A-Za-z0-9]+$/.test(finalRollNumber)) {
      return res.status(400).json({ message: "Roll Number can only contain letters and numbers" });
    }

    const finalEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@(iitk\.ac\.in|gmail\.com)$/i;
    if (!emailRegex.test(finalEmail)) {
      return res.status(400).json({ message: `Invalid email domain: ${finalEmail}. Must be @iitk.ac.in or @gmail.com` });
    }

    // Validate phone number format (must be 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) return res.status(400).json({ message: "Phone number must be exactly 10 digits" });

    const instituteId = finalRollNumber;

    // Generate random 8-char password
    const generatedPassword = crypto.randomBytes(4).toString("hex");

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ instituteId }, { email: finalEmail }] });
    if (existing) return res.status(400).json({ message: `User with roll number "${finalRollNumber}" or email "${finalEmail}" already exists` });

    // Check if student record already exists
    const existingStudent = await Student.findOne({ rollNumber: finalRollNumber });
    if (existingStudent) return res.status(400).json({ message: `Student with roll number "${finalRollNumber}" already exists` });

    // Check if phone number is already used by another student
    const existingPhone = await Student.findOne({ phone: phone.trim() });
    if (existingPhone) return res.status(400).json({ message: `A student with phone number "${phone.trim()}" already exists` });

    const user = await User.create({
      instituteId,
      email: finalEmail,
      password: generatedPassword,
      role: "student",
      mustChangePassword: true,
    });

    const student = await Student.create({
      userId: user._id,
      name: finalName,
      rollNumber: finalRollNumber,
      phone: phone.trim(),
    });

    await emitStatsUpdate();

    let emailSent = false;
    try {
      await sendWelcomeEmail(finalEmail, finalName, finalRollNumber, generatedPassword);
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

    const result = await createApc({ name, email, rollNumber, contact });
    await emitStatsUpdate();

    const resMessage = result.emailSent
      ? "APC added successfully"
      : "APC added successfully (Warning: Welcome email could not be sent)";

    res.status(201).json({ message: resMessage, ...result });
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

    const targetCompany = await Company.findById(companyId);
    if (!targetCompany) return res.status(404).json({ message: "Company not found" });

    const coco = await Coordinator.findById(cocoId);
    if (!coco) return res.status(404).json({ message: "CoCo not found" });

    const assignedComps = await Company.find({ _id: { $in: coco.assignedCompanies } });
    const conflict = assignedComps.find(c =>
      c._id.toString() !== companyId &&
      c.day === targetCompany.day &&
      c.slot === targetCompany.slot
    );

    if (conflict) {
      return res.status(400).json({
        message: `This CoCo is already allocated to ${conflict.name} on the same slot (Day ${conflict.day} ${conflict.slot}). Please remove them from there first.`
      });
    }

    await Coordinator.findByIdAndUpdate(cocoId, { $addToSet: { assignedCompanies: companyId } });
    await Company.findByIdAndUpdate(companyId, { $addToSet: { assignedCocos: cocoId } });

    const company = await Company.findById(companyId);
    const { sendNotification } = require("../services/notification.service");
    if (company && coco) {
      await sendNotification({
        recipientId: coco.userId,
        senderId: req.user.id,
        senderModel: "User",
        source: "system",
        companyId: companyId,
        message: `You have been assigned as the Coordinator for ${company.name}`,
        type: "general"
      });
    }

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

// @desc    Permanently delete a CoCo (coordinator + user account)
// @route   DELETE /api/admin/cocos/:id
const deleteCoco = async (req, res) => {
  try {
    const { id } = req.params;
    const coco = await Coordinator.findById(id);
    if (!coco) return res.status(404).json({ message: "CoCo not found" });

    // Remove this coco from all assigned companies
    if (coco.assignedCompanies?.length > 0) {
      await Company.updateMany(
        { _id: { $in: coco.assignedCompanies } },
        { $pull: { assignedCocos: coco._id } }
      );
    }

    // Delete the coordinator record and the user account
    await Coordinator.findByIdAndDelete(id);
    await User.findByIdAndDelete(coco.userId);

    await emitStatsUpdate();
    res.json({ message: "CoCo deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Permanently delete a Student (student + user account + related data)
// @route   DELETE /api/admin/students/:id
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Remove this student from all company shortlists
    await Company.updateMany(
      { shortlistedStudents: student._id },
      { $pull: { shortlistedStudents: student._id } }
    );

    // Delete queue entries for this student
    const Queue = require("../models/Queue.model");
    await Queue.deleteMany({ studentId: student._id });

    // Delete queries submitted by this student
    const Query = require("../models/Query.model");
    await Query.deleteMany({ studentUserId: student.userId });

    // Delete notifications for this student
    await Notification.deleteMany({ recipientId: student.userId });

    // Delete the student record and the user account
    await Student.findByIdAndDelete(id);
    await User.findByIdAndDelete(student.userId);

    await emitStatsUpdate();
    res.json({ message: "Student deleted successfully" });
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
    if (!companyId) return res.status(400).json({ message: "companyId is required" });
    const upload = await ExcelUpload.create({
      uploadedBy: req.user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      type: "student_shortlist",
    });
    const result = await excelService.processShortlistExcel(upload._id, req.file.path, companyId);
    res.json({
      message: `Shortlist uploaded successfully`,
      uploadId: upload._id,
      successCount: result.successCount,
      failedCount: result.failedCount,
      errors: result.errors,
    });
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

    const newStudents = students.filter(s => !company.shortlistedStudents.some(id => id.toString() === s._id.toString()));
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

    for (const studentId of studentIds) {
      try {
        await queueService.ensureShortlistedStudentInQueue(studentId, companyId);
      } catch (err) {
        console.error("Error ensuring student in queue:", err);
      }
    }
    const { sendNotification } = require("../services/notification.service");
    await Promise.all(newStudents.map(s =>
      sendNotification({
        recipientId: s.userId,
        senderId: req.user.id,
        senderModel: "User",
        source: "apc",
        companyId: companyId,
        message: `You have been shortlisted for ${company.name}`,
        type: "general"
      }).catch(err => console.error("Notification failed", err))
    ));
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

// @desc    Auto allocate CoCos to companies for a specific day/slot
// @route   POST /api/admin/auto-allocate-cocos
const autoAllocateCocos = async (req, res) => {
  try {
    const { day, slot } = req.body;

    // Determine the target day/slot — use request body or fall back to current drive state
    let targetDay = day;
    let targetSlot = slot;
    if (targetDay == null || !targetSlot) {
      const driveState = await DriveState.findOne();
      if (driveState) {
        targetDay = targetDay ?? driveState.currentDay;
        targetSlot = targetSlot || driveState.currentSlot;
      }
    }

    if (targetDay == null || !targetSlot) {
      return res.status(400).json({ message: "Day and Slot are required for auto-allocation. Set the drive state first." });
    }

    // Only clear assignments for companies in the target day/slot (not all companies globally)
    const slotCompanyFilter = { isActive: true, day: targetDay, slot: targetSlot };
    const slotCompanies = await Company.find(slotCompanyFilter);

    const slotCompanyIds = slotCompanies.map(c => c._id);

    // Remove only the target-slot assignments from cocos and companies
    for (const comp of slotCompanies) {
      const assignedCocoIds = comp.assignedCocos || [];
      if (assignedCocoIds.length > 0) {
        await Coordinator.updateMany(
          { _id: { $in: assignedCocoIds } },
          { $pull: { assignedCompanies: comp._id } }
        );
      }
      await Company.findByIdAndUpdate(comp._id, { $set: { assignedCocos: [] } });
    }

    const cocos = await Coordinator.find();

    if (cocos.length === 0) {
      return res.status(400).json({ message: "No CoCos available for allocation" });
    }
    if (slotCompanies.length === 0) {
      return res.status(400).json({ message: `No active companies found for Day ${targetDay}, ${targetSlot} slot` });
    }

    // Only count required cocos for this specific slot, not all slots
    const totalRequiredCocos = slotCompanies.reduce((sum, c) => sum + (c.requiredCocosCount || 1), 0);
    if (totalRequiredCocos > cocos.length) {
      return res.status(400).json({ message: `Cannot auto allocate: ${totalRequiredCocos} CoCos are required for Day ${targetDay} ${targetSlot} slot but only ${cocos.length} are available.` });
    }

    // Track usage within this allocation round
    const usedCoCos = new Set();
    const cocoAssignments = {}; // cocoId -> array of {day, slot}
    // Pre-populate with existing assignments from OTHER slots (so we respect day/slot conflicts)
    for (const coco of cocos) {
      const existingAssignments = [];
      const assignedComps = await Company.find({ _id: { $in: coco.assignedCompanies || [] } });
      for (const comp of assignedComps) {
        existingAssignments.push({ day: comp.day, slot: comp.slot });
      }
      cocoAssignments[coco._id.toString()] = existingAssignments;
    }

    const isAssignedInSameDaySlot = (cocoId, compDay, compSlot) => {
      const assignments = cocoAssignments[cocoId];
      return assignments.some(a => a.day === compDay && a.slot === compSlot);
    };

    const results = [];
    const unallottedCompanies = [];

    // Shuffle companies to distribute randomly
    const shuffledCompanies = [...slotCompanies].sort(() => Math.random() - 0.5);

    for (const company of shuffledCompanies) {
      const compDay = company.day;
      const compSlot = company.slot;

      const requiredCount = company.requiredCocosCount || 1;
      let allocatedCount = 0;

      for (let i = 0; i < requiredCount; i++) {
        // Step 1: Get available Co-Cos NOT used in this round AND NOT in same day/slot AND not already assigned to this company
        let available = cocos.filter(c =>
          !usedCoCos.has(c._id.toString()) &&
          !isAssignedInSameDaySlot(c._id.toString(), compDay, compSlot) &&
          !(company.assignedCocos || []).some(id => id.toString() === c._id.toString())
        );

        // Step 2: If unused list is empty, allow reuse but still enforce day/slot
        if (available.length === 0) {
          console.log(`[AutoAllocate] Reusing Co-Co after all exhausted for company ${company.name}`);
          available = cocos.filter(c =>
            !isAssignedInSameDaySlot(c._id.toString(), compDay, compSlot) &&
            !(company.assignedCocos || []).some(id => id.toString() === c._id.toString())
          );
        }

        // Step 3: Randomly assign from available
        if (available.length > 0) {
          const selected = available[Math.floor(Math.random() * available.length)];

          usedCoCos.add(selected._id.toString());
          cocoAssignments[selected._id.toString()].push({ day: compDay, slot: compSlot });
          if (!company.assignedCocos) company.assignedCocos = [];
          company.assignedCocos.push(selected._id);

          // Execute DB writes
          await Coordinator.findByIdAndUpdate(selected._id, {
            $addToSet: { assignedCompanies: company._id }
          });
          await Company.findByIdAndUpdate(company._id, {
            $addToSet: { assignedCocos: selected._id }
          });

          results.push({ company: company.name, coco: selected.name, day: compDay, slot: compSlot });
          allocatedCount++;
        }
      }

      if (allocatedCount < requiredCount) {
        console.warn(`[AutoAllocate] Only ${allocatedCount}/${requiredCount} Co-Cos available for company ${company.name} at Day ${compDay} Slot ${compSlot}`);
        unallottedCompanies.push({
          id: company._id,
          name: company.name,
          day: compDay,
          slot: compSlot,
          reason: `Only ${allocatedCount}/${requiredCount} Co-Cos available (Day/Slot conflict)`
        });
      }
    }

    const response = {
      message: "Auto-allocation completed",
      results,
      totalAllocated: results.length,
      totalCocos: cocos.length,
      totalCompanies: slotCompanies.length,
      targetDay,
      targetSlot,
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

// @desc    Get all student queries
// @route   GET /api/admin/queries
const getQueries = async (req, res) => {
  try {
    const Query = require("../models/Query.model");
    const queries = await Query.find()
      .populate("studentUserId", "instituteId email")
      .populate("respondedBy", "instituteId email")
      .sort({ createdAt: -1 });

    // Try to attach student details and responder name
    const Student = require("../models/Student.model");
    const result = await Promise.all(
      queries.map(async (q) => {
        const queryObj = q.toObject();
        const student = await Student.findOne({ userId: q.studentUserId?._id });
        if (student) {
          queryObj.studentName = student.name;
          queryObj.studentRollNo = student.rollNumber;
        } else {
          queryObj.studentName = "Unknown";
          queryObj.studentRollNo = q.studentUserId?.instituteId || "Unknown";
        }
        // Attach APC responder name
        if (q.respondedBy) {
          const responderApc = await Apc.findOne({ userId: q.respondedBy._id });
          queryObj.respondedByName = responderApc ? responderApc.name : "APC";
        }
        return queryObj;
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Respond to a student query
// @route   PUT /api/admin/queries/:id
const respondToQuery = async (req, res) => {
  try {
    const { response, status } = req.body;
    const Query = require("../models/Query.model");

    if (!response && status !== "resolved") {
      return res.status(400).json({ message: "Response is required" });
    }

    // Look up APC name for the responding user
    let apcName = "APC";
    const apc = await Apc.findOne({ userId: req.user.id });
    if (apc) {
      apcName = apc.name;
    }

    // Build update fields
    const updateFields = { status };
    if (response) {
      updateFields.response = response;
      updateFields.respondedBy = req.user.id;
      updateFields.respondedAt = new Date();
    }

    const query = await Query.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!query) return res.status(404).json({ message: "Query not found" });

    // Send notification to the student
    const notificationService = require("../services/notification.service");

    if (status === "replied" && response) {
      // Rich reply notification with APC name, query subject, and response text
      const truncatedResponse = response.length > 100 ? response.substring(0, 100) + "..." : response;
      await notificationService.sendNotification({
        recipientId: query.studentUserId,
        senderId: req.user.id,
        message: `APC ${apcName} replied to your query '${query.subject}': '${truncatedResponse}'`,
        type: "query_reply",
        queryId: query._id,
        source: "apc",
      });
    } else if (status === "resolved") {
      await notificationService.sendNotification({
        recipientId: query.studentUserId,
        senderId: req.user.id,
        message: `Your query '${query.subject}' has been marked as resolved`,
        type: "query_resolved",
        queryId: query._id,
        source: "apc",
      });
    }

    res.json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get current drive state (Day/Slot)
// @route   GET /api/admin/drive-state
const getDriveState = async (req, res) => {
  try {
    let state = await DriveState.findOne();
    if (!state) {
      state = await DriveState.create({ currentDay: 1, currentSlot: "morning" });
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update drive state (Day/Slot) — broadcasts to all users
// @route   PUT /api/admin/drive-state
const updateDriveState = async (req, res) => {
  try {
    const { day, slot } = req.body;
    if (!day || !slot) return res.status(400).json({ message: "Day and Slot are required" });

    let state = await DriveState.findOne();
    if (!state) {
      state = await DriveState.create({ currentDay: day, currentSlot: slot });
    } else {
      state.currentDay = day;
      state.currentSlot = slot;
      await state.save();

      // Clear all CoCo assignments when drive state changes
      await Coordinator.updateMany({}, { $set: { assignedCompanies: [] } });
      await Company.updateMany({}, { $set: { assignedCocos: [] } });
    }

    // Broadcast to ALL connected clients
    try {
      const io = getIO();
      if (io) io.emit(SOCKET_EVENTS.DRIVE_STATE_UPDATED, { currentDay: day, currentSlot: slot });
    } catch (_) { }

    res.json(state);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Send broadcast notification to students/cocos/everyone
// @route   POST /api/admin/broadcast-notification
const sendBroadcastNotification = async (req, res) => {
  try {
    const { message, type = "general", audience } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });
    if (!audience) return res.status(400).json({ message: "Audience is required" });

    // Build role filter based on audience
    let roleFilter;
    if (audience === "students") roleFilter = { role: "student" };
    else if (audience === "cocos") roleFilter = { role: "coco" };
    else roleFilter = { role: { $in: ["student", "coco"] } }; // everyone

    const users = await User.find({ ...roleFilter, isActive: true }).select("_id");

    const notificationService = require("../services/notification.service");
    let sentCount = 0;
    for (const user of users) {
      await notificationService.sendNotification({
        recipientId: user._id,
        senderId: req.user.id,
        source: "apc",
        message,
        type,
      });
      sentCount++;
    }

    res.json({ message: `Notification sent to ${sentCount} user(s)`, sentCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc    Get notifications for APC
// @route   GET /api/admin/notifications
const getApcNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.id,
    })
      .populate("senderId", "name rollNumber")
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Mark a notification as read (APC)
// @route   PUT /api/admin/notifications/:id/read
const markApcNotifRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Clear all notifications for APC
// @route   DELETE /api/admin/notifications
const clearAllApcNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipientId: req.user.id });
    res.json({ message: "Notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update APC profile (name, phone)
// @route   PUT /api/admin/profile
const updateApcProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Add validation checks mapping to frontend constraints
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || !/^[A-Za-z\s]+$/.test(trimmedName)) {
        return res.status(400).json({ message: "APC name can only contain letters and spaces" });
      }
    }
    if (phone && !/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // Check if phone number is already used by another APC
    if (phone) {
      const existingPhone = await Apc.findOne({ contact: phone.trim(), userId: { $ne: req.user.id } });
      if (existingPhone) return res.status(400).json({ message: `An APC with phone number "${phone.trim()}" already exists` });
    }

    const user = await User.findById(req.user.id);

    const updated = await Apc.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(phone !== undefined && { contact: phone.trim() })
        },
        $setOnInsert: { userId: req.user.id, rollNumber: user?.instituteId || "admin_generated" }
      },
      { new: true, upsert: true }
    );
    res.json({ message: "Profile updated", apc: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════
//   BULK RESET ENDPOINTS (Tenure / Phase Transition)
// ═══════════════════════════════════════════════════════════

// @desc    Delete ALL sub-APCs (every APC except the logged-in main admin)
// @route   POST /api/admin/reset/apcs
const deleteAllSubApcs = async (req, res) => {
  try {
    const reqUser = await User.findById(req.user.id);
    if (!reqUser || !reqUser.isMainAdmin) {
      return res.status(403).json({ message: "Only the main admin can perform this action" });
    }

    // Find all APCs whose userId is NOT the current user
    const apcsToDelete = await Apc.find({ userId: { $ne: req.user.id } });
    const userIds = apcsToDelete.map((a) => a.userId);

    // Delete their User accounts and Apc records
    await User.deleteMany({ _id: { $in: userIds } });
    await Apc.deleteMany({ userId: { $ne: req.user.id } });

    await emitStatsUpdate();
    res.json({ message: `${apcsToDelete.length} sub-APC(s) deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete ALL students and their related data
// @route   POST /api/admin/reset/students
const deleteAllStudents = async (req, res) => {
  try {
    const Queue = require("../models/Queue.model");
    const Query = require("../models/Query.model");

    // Get all student user IDs for notification cleanup
    const studentUsers = await User.find({ role: "student" }).select("_id");
    const studentUserIds = studentUsers.map((u) => u._id);

    // Clean up company shortlists
    await Company.updateMany({}, { $set: { shortlistedStudents: [] } });

    // Delete queue entries, queries, and notifications for students
    await Queue.deleteMany({});
    await Query.deleteMany({ studentUserId: { $in: studentUserIds } });
    await Notification.deleteMany({ recipientId: { $in: studentUserIds } });

    // Delete student records and user accounts
    await Student.deleteMany({});
    await User.deleteMany({ role: "student" });

    await emitStatsUpdate();
    res.json({ message: `${studentUserIds.length} student(s) and all related data deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete ALL CoCos and their related data
// @route   POST /api/admin/reset/cocos
const deleteAllCocos = async (req, res) => {
  try {
    // Get all coordinator user IDs
    const cocoUsers = await User.find({ role: "coco" }).select("_id");
    const cocoUserIds = cocoUsers.map((u) => u._id);

    // Clean up company coco assignments
    await Company.updateMany({}, { $set: { assignedCocos: [] } });

    // Delete notifications for cocos
    await Notification.deleteMany({ recipientId: { $in: cocoUserIds } });

    // Delete coordinator records and user accounts
    await Coordinator.deleteMany({});
    await User.deleteMany({ role: "coco" });

    await emitStatsUpdate();
    res.json({ message: `${cocoUserIds.length} CoCo(s) and all related data deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStats, getCompanies, addCompany, updateCompany,
  searchStudents, getStudentCompanies, getCocos, addCoco, addStudent, getApcs, addApc, removeApc,
  assignCoco, removeCoco, deleteCoco, deleteStudent,
  uploadCompanyExcel, uploadShortlistExcel, uploadCocoExcel, uploadApcExcel, uploadStudentExcel, uploadCocoRequirementsExcel, getUploadStatus,
  shortlistStudents, getShortlistedStudents, autoAllocateCocos, getCocoConflicts,
  getQueries, respondToQuery,
  getDriveState, updateDriveState, sendBroadcastNotification,
  getApcNotifications, markApcNotifRead, clearAllApcNotifications,
  updateApcProfile,
  deleteAllSubApcs, deleteAllStudents, deleteAllCocos
};
