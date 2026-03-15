const mongoose = require("mongoose");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const Company = require("./models/Company.model");
const InterviewRound = require("./models/InterviewRound.model");
const Panel = require("./models/Panel.model");
const Queue = require("./models/Queue.model");
const { MONGO_URI } = require("./config/env");

const dummyCompanies = [
  { name: "Google", day: 1, slot: "morning", venue: "LHC 101", mode: "online" },
  { name: "Microsoft", day: 1, slot: "afternoon", venue: "LHC 102", mode: "offline" },
  { name: "Amazon", day: 2, slot: "morning", venue: "LHC 103", mode: "offline" }
];

const dummyStudents = [
  { instituteId: "2021CS102", email: "amit@placeiit.in", password: "password123", name: "Amit Singh", rollNumber: "2021CS102" },
  { instituteId: "2021EE045", email: "sneha@placeiit.in", password: "password123", name: "Sneha Patel", rollNumber: "2021EE045" },
  { instituteId: "2021ME012", email: "karan@placeiit.in", password: "password123", name: "Karan Gupta", rollNumber: "2021ME012" }
];

async function seedDummyData() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB for dummy data seeding");

  // First, completely delete old dummy companies so we can regenerate them properly linked to CoCo
  for (const c of dummyCompanies) {
    const existingCompany = await Company.findOne({ name: c.name });
    if (existingCompany) {
      await InterviewRound.deleteMany({ companyId: existingCompany._id });
      await Panel.deleteMany({ companyId: existingCompany._id });
      await Queue.deleteMany({ companyId: existingCompany._id });
      await Company.deleteOne({ _id: existingCompany._id });
      console.log(`Deleted existing dummy company: ${c.name} (to recreate fresh)`);
    }
  }

  // Ensure default CoCo exists!
  let defaultCocoUser = await User.findOne({ email: "coco@placeiit.in" });
  if (!defaultCocoUser) {
    defaultCocoUser = await User.create({
        instituteId: "coco001",
        email: "coco@placeiit.in",
        password: "coco123",
        role: "coco",
    });
    await Coordinator.create({ userId: defaultCocoUser._id, name: "Priya Sharma", rollNumber: "2020EC045" });
    console.log("Created missing default CoCo user (coco001)");
  }

  const defaultCoco = await Coordinator.findOne({ userId: defaultCocoUser._id });
  const cocoId = defaultCoco._id;


  // Get the default Student to shortlist
  const defaultStudentUser = await User.findOne({ email: "student@placeiit.in" });
  let defaultStudentId = null;
  if (defaultStudentUser) {
    const defaultStudent = await Student.findOne({ userId: defaultStudentUser._id });
    if (defaultStudent) defaultStudentId = defaultStudent._id;
  }

  // 1. Create Extra Students
  const createdStudents = [];
  if (defaultStudentId) createdStudents.push(defaultStudentId);

  for (const s of dummyStudents) {
    let existingUser = await User.findOne({ instituteId: s.instituteId });
    if (!existingUser) {
      existingUser = await User.create({
        instituteId: s.instituteId,
        email: s.email,
        password: s.password,
        role: "student",
      });
      const newStudent = await Student.create({ userId: existingUser._id, name: s.name, rollNumber: s.rollNumber });
      createdStudents.push(newStudent._id);
      console.log(`Created dummy student: ${s.name}`);
    } else {
      const studentDoc = await Student.findOne({ userId: existingUser._id });
      if (studentDoc) createdStudents.push(studentDoc._id);
    }
  }

  // 2. Create Companies, Rounds, and Panels
  for (const c of dummyCompanies) {
    // Create Company and ASSIGN COCO!
    const company = await Company.create({
      name: c.name,
      day: c.day,
      slot: c.slot,
      venue: c.venue,
      mode: c.mode,
      assignedCocos: [cocoId], // Force assign to the default CoCo
      shortlistedStudents: createdStudents,
      isWalkInEnabled: true
    });
    console.log(`Created company: ${c.name} and assigned to CoCo`);

    // Assign Company back to Coordinator document
    await Coordinator.findByIdAndUpdate(cocoId, {
      $addToSet: { assignedCompanies: company._id }
    });

    // Update Student Shortlists
    for (const studentId of createdStudents) {
      await Student.findByIdAndUpdate(studentId, {
        $addToSet: { shortlistedCompanies: company._id }
      });
    }

    // Create Interview Round 1
    const round1 = await InterviewRound.create({
      companyId: company._id,
      roundNumber: 1,
      roundName: "Technical Round",
      isActive: true
    });
    console.log(`  -> Created Round 1 for ${c.name}`);

    // Create Panels for Round 1
    const panelA = await Panel.create({
      companyId: company._id,
      roundId: round1._id,
      panelName: "Panel A",
      interviewers: ["Interviewer 1", "Interviewer 2"],
      venue: c.venue
    });
    const panelB = await Panel.create({
      companyId: company._id,
      roundId: round1._id,
      panelName: "Panel B",
      interviewers: ["Interviewer 3"],
      venue: c.venue
    });
    
    // Update round with panels
    await InterviewRound.findByIdAndUpdate(round1._id, {
      $push: { panels: { $each: [panelA._id, panelB._id] } }
    });

    console.log(`  -> Created Panels A & B for ${c.name} Round 1`);

    // Add students to queue (Status: NOT_JOINED to simulate real flow)
    let position = 1;
    for (const studentId of createdStudents) {
      await Queue.create({
        companyId: company._id,
        studentId: studentId,
        status: "not_joined", 
        position: position++,
        isWalkIn: false
      });
    }
    console.log(`  -> Added ${createdStudents.length} students to ${c.name} shortlists queue`);
  }

  console.log("\\n✅ Dummy Data Seeding Complete (Optimized for CoCo)!");
  console.log("You can now login as coco001 / coco123 and see the assigned companies, panels, and queues.");
  
  await mongoose.disconnect();
}

seedDummyData().catch((err) => {
  console.error("Dummy seed failed:", err);
  process.exit(1);
});
