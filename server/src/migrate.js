/**
 * Database migration / setup script for PlaceIIT.
 *
 * Mongoose + MongoDB is schema-less, so there are no SQL-style "migrations".
 * Instead, this script ensures all required indexes are created and performs
 * any data-level migrations needed when upgrading between versions.
 *
 * Usage:
 *   bun src/migrate.js                  # Run all migrations
 *   bun src/migrate.js --seed           # Run migrations + seed test data
 *   bun src/migrate.js --status         # Show DB status only
 *   bun src/migrate.js --drop-all       # ⚠️  DROP all collections (destructive!)
 */

const mongoose = require("mongoose");
const { MONGO_URI, NODE_ENV } = require("./config/env");

// Load all models so Mongoose registers their schemas + indexes
const User = require("./models/User.model");
const Student = require("./models/Student.model");
const Coordinator = require("./models/Coordinator.model");
const Company = require("./models/Company.model");
const Queue = require("./models/Queue.model");
const Panel = require("./models/Panel.model");
const InterviewRound = require("./models/InterviewRound.model");
const Notification = require("./models/Notification.model");
const ExcelUpload = require("./models/ExcelUpload.model");

const ALL_MODELS = [
    { name: "User", model: User },
    { name: "Student", model: Student },
    { name: "Coordinator", model: Coordinator },
    { name: "Company", model: Company },
    { name: "Queue", model: Queue },
    { name: "Panel", model: Panel },
    { name: "InterviewRound", model: InterviewRound },
    { name: "Notification", model: Notification },
    { name: "ExcelUpload", model: ExcelUpload },
];

/* ─────────────────────────────────────────────────── */
/*  Helpers                                            */
/* ─────────────────────────────────────────────────── */

function flag(name) {
    return process.argv.includes(name);
}

async function printStatus() {
    console.log("\n📊  Database Status");
    console.log("─".repeat(50));
    console.log(`   URI:  ${MONGO_URI}`);
    console.log(`   ENV:  ${NODE_ENV}`);
    console.log("");

    for (const { name, model } of ALL_MODELS) {
        const count = await model.countDocuments();
        const indexes = await model.collection.indexes();
        console.log(`   ${name.padEnd(18)} ${String(count).padStart(5)} docs   ${indexes.length} indexes`);
    }
    console.log("");
}

/* ─────────────────────────────────────────────────── */
/*  Index sync                                         */
/* ─────────────────────────────────────────────────── */

async function syncIndexes() {
    console.log("\n🔧  Syncing indexes…");
    for (const { name, model } of ALL_MODELS) {
        try {
            await model.syncIndexes();
            const indexes = await model.collection.indexes();
            console.log(`   ✅ ${name} — ${indexes.length} indexes`);
        } catch (err) {
            console.error(`   ❌ ${name} — ${err.message}`);
        }
    }
}

/* ─────────────────────────────────────────────────── */
/*  Data migrations (versioned)                        */
/* ─────────────────────────────────────────────────── */

/**
 * Add migration functions here as the schema evolves.
 * Each migration runs only once by checking a condition.
 */
const migrations = [
    {
        id: "001_ensure_uploads_dir",
        description: "Ensure uploads directory exists",
        run: async () => {
            const fs = require("fs");
            const path = require("path");
            const dir = path.join(__dirname, "..", "uploads");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log("      Created uploads/ directory");
            } else {
                console.log("      uploads/ directory already exists");
            }
        },
    },
    {
        id: "002_set_default_isActive",
        description: "Set isActive=true on User docs missing the field",
        run: async () => {
            const result = await User.updateMany(
                { isActive: { $exists: false } },
                { $set: { isActive: true } }
            );
            console.log(`      Updated ${result.modifiedCount} users`);
        },
    },
    {
        id: "003_set_default_currentRound",
        description: "Set currentRound=1 on Company docs missing the field",
        run: async () => {
            const result = await Company.updateMany(
                { currentRound: { $exists: false } },
                { $set: { currentRound: 1 } }
            );
            console.log(`      Updated ${result.modifiedCount} companies`);
        },
    },
    {
        id: "004_set_default_profileCompleted",
        description: "Set profileCompleted=false on Student docs missing the field",
        run: async () => {
            const result = await Student.updateMany(
                { profileCompleted: { $exists: false } },
                { $set: { profileCompleted: false } }
            );
            console.log(`      Updated ${result.modifiedCount} students`);
        },
    },
];

async function runMigrations() {
    console.log("\n🚀  Running data migrations…");
    for (const m of migrations) {
        console.log(`   [${m.id}] ${m.description}`);
        try {
            await m.run();
            console.log(`   ✅ Done`);
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }
}

/* ─────────────────────────────────────────────────── */
/*  Drop all (dangerous!)                              */
/* ─────────────────────────────────────────────────── */

async function dropAll() {
    if (NODE_ENV === "production") {
        console.error("❌  Refusing to drop collections in production!");
        process.exit(1);
    }
    console.log("\n⚠️   Dropping ALL collections…");
    for (const { name, model } of ALL_MODELS) {
        try {
            await model.collection.drop();
            console.log(`   🗑️  Dropped ${name}`);
        } catch (err) {
            if (err.code === 26) {
                console.log(`   ⏭️  ${name} — already empty`);
            } else {
                console.error(`   ❌ ${name} — ${err.message}`);
            }
        }
    }
}

/* ─────────────────────────────────────────────────── */
/*  Seed (delegates to seed.js)                        */
/* ─────────────────────────────────────────────────── */

async function runSeed() {
    console.log("\n🌱  Seeding test data…");
    // Inline the seed logic to avoid double-connecting
    const { generateToken } = require("./utils/generateToken");

    const seedUsers = [
        { instituteId: "admin001", email: "admin@placeiit.in", password: "admin123", role: "admin" },
        { instituteId: "2021CS101", email: "student@placeiit.in", password: "student123", role: "student", name: "Rahul Kumar", rollNumber: "2021CS101" },
        { instituteId: "coco001", email: "coco@placeiit.in", password: "coco123", role: "coco", name: "Priya Sharma", rollNumber: "2020EC045" },
    ];

    for (const u of seedUsers) {
        const existing = await User.findOne({ instituteId: u.instituteId });
        if (existing) {
            console.log(`   ⏭️  ${u.instituteId} already exists`);
            continue;
        }
        const user = await User.create({ instituteId: u.instituteId, email: u.email, password: u.password, role: u.role });
        if (u.role === "student") {
            await Student.create({ userId: user._id, name: u.name, rollNumber: u.rollNumber });
        } else if (u.role === "coco") {
            await Coordinator.create({ userId: user._id, name: u.name, rollNumber: u.rollNumber });
        }
        console.log(`   ✅ Created ${u.role}: ${u.instituteId}`);
    }

    console.log("\n   📋 Test credentials:");
    console.log("      Admin   → admin001   / admin123");
    console.log("      Student → 2021CS101  / student123");
    console.log("      CoCo    → coco001    / coco123");
}

/* ─────────────────────────────────────────────────── */
/*  Main                                               */
/* ─────────────────────────────────────────────────── */

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ Connected to MongoDB`);

    if (flag("--drop-all")) {
        await dropAll();
    }

    if (flag("--status")) {
        await printStatus();
        await mongoose.disconnect();
        return;
    }

    // Always run index sync + migrations
    await syncIndexes();
    await runMigrations();

    if (flag("--seed")) {
        await runSeed();
    }

    await printStatus();
    await mongoose.disconnect();
    console.log("✅ Migration complete.\n");
}

main().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
