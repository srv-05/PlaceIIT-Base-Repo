/**
 * One-time cleanup: remove stale non-active Round 2 queue entries
 * that are blocking students from re-joining.
 */
const mongoose = require("mongoose");
const { MONGO_URI } = require("./config/env");

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const collection = mongoose.connection.collection("queues");

  // Find all entries with non-active statuses that could block re-join
  const staleEntries = await collection.find({
    status: { $in: ["not_joined", "on_hold", "completed", "rejected", "exited", "offer_given"] },
  }).toArray();

  console.log(`Found ${staleEntries.length} stale (non-active) queue entries.`);

  if (staleEntries.length > 0) {
    // Show what we're cleaning up (for confirmation)
    for (const e of staleEntries) {
      console.log(`  - studentId: ${e.studentId}, companyId: ${e.companyId}, round: ${e.round}, status: ${e.status}`);
    }

    // Delete only non-active entries (completed/rejected/exited/not_joined/on_hold/offer_given)
    const result = await collection.deleteMany({
      status: { $in: ["not_joined", "on_hold", "completed", "rejected", "exited", "offer_given"] },
    });
    console.log(`Deleted ${result.deletedCount} stale entries.`);
  }

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  process.exit(1);
});
