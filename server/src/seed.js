/**
 * Seed script — creates test users for all three roles.
 * Run with: bun src/seed.js
 */
const mongoose = require("mongoose");
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const { MONGO_URI } = require("./config/env");

const seedUsers = [
    {
        instituteId: "admin001",
        email: "admin@placeiit.in",
        password: "admin123",
        role: "admin",
    },
    {
        instituteId: "2021CS101",
        email: "student@placeiit.in",
        password: "student123",
        role: "student",
        name: "Rahul Kumar",
        rollNumber: "2021CS101",
        phone: "9876543210",
    },
    {
        instituteId: "coco001",
        email: "coco@placeiit.in",
        password: "coco123",
        role: "coco",
        name: "Priya Sharma",
        rollNumber: "2020EC045",
        phone: "9876543211",
    },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    for (const u of seedUsers) {
        const existing = await User.findOne({ instituteId: u.instituteId });
        if (existing) {
            console.log(`User ${u.instituteId} already exists — skipping`);
            continue;
        }

        const user = await User.create({
            instituteId: u.instituteId,
            email: u.email,
            password: u.password,
            role: u.role,
        });

        if (u.role === "student") {
            await Student.create({ userId: user._id, name: u.name, rollNumber: u.rollNumber, phone: u.phone });
            console.log(`Created student: ${u.instituteId}`);
        } else if (u.role === "coco") {
            await Coordinator.create({ userId: user._id, name: u.name, rollNumber: u.rollNumber, phone: u.phone });
            console.log(`Created coordinator: ${u.instituteId}`);
        } else {
            console.log(`Created admin: ${u.instituteId}`);
        }
    }

    console.log("\n✅ Seed complete! Test credentials:");
    console.log("  APC/Admin  → ID: admin001     Password: admin123");
    console.log("  Student    → ID: 2021CS101    Password: student123");
    console.log("  CoCo       → ID: coco001      Password: coco123");

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
