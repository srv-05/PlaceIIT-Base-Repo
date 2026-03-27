/**
 * One-time DB index correction script.
 * 1. Lists all indexes on the `queues` collection.
 * 2. Drops the legacy (studentId, companyId) unique index if it exists.
 * 3. Ensures the correct (companyId, studentId, round) unique index exists.
 */
const mongoose = require("mongoose");
const { MONGO_URI } = require("./config/env");

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.\n");

  const collection = mongoose.connection.collection("queues");

  // Step 1: List all current indexes
  const indexes = await collection.indexes();
  console.log("=== Current indexes on `queues` collection ===");
  for (const idx of indexes) {
    console.log(`  Name: ${idx.name}`);
    console.log(`  Key:  ${JSON.stringify(idx.key)}`);
    console.log(`  Unique: ${!!idx.unique}`);
    console.log("  ---");
  }

  // Step 2: Identify and drop legacy index (studentId+companyId only, no round)
  const legacyNames = [];
  for (const idx of indexes) {
    const keys = Object.keys(idx.key);
    const hasCompany = keys.includes("companyId");
    const hasStudent = keys.includes("studentId");
    const hasRound = keys.includes("round");
    // Legacy index: has companyId and studentId but NOT round, and is unique
    if (hasCompany && hasStudent && !hasRound && idx.unique && idx.name !== "_id_") {
      legacyNames.push(idx.name);
    }
  }

  if (legacyNames.length > 0) {
    for (const name of legacyNames) {
      console.log(`\nDropping legacy index: ${name}`);
      await collection.dropIndex(name);
      console.log(`Successfully dropped: ${name}`);
    }
  } else {
    console.log("\nNo legacy (companyId+studentId without round) unique index found. Already clean.");
  }

  // Step 3: Ensure correct composite index exists
  const refreshedIndexes = await collection.indexes();
  const correctExists = refreshedIndexes.some((idx) => {
    const keys = Object.keys(idx.key);
    return (
      keys.includes("companyId") &&
      keys.includes("studentId") &&
      keys.includes("round") &&
      idx.unique
    );
  });

  if (correctExists) {
    console.log("\nCorrect composite unique index (companyId, studentId, round) already exists.");
  } else {
    console.log("\nCreating correct composite unique index (companyId, studentId, round)...");
    await collection.createIndex(
      { companyId: 1, studentId: 1, round: 1 },
      { unique: true }
    );
    console.log("Successfully created composite unique index.");
  }

  // Final confirmation
  const finalIndexes = await collection.indexes();
  console.log("\n=== Final indexes on `queues` collection ===");
  for (const idx of finalIndexes) {
    console.log(`  Name: ${idx.name}  |  Key: ${JSON.stringify(idx.key)}  |  Unique: ${!!idx.unique}`);
  }

  await mongoose.disconnect();
  console.log("\nDone. Disconnected.");
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
