const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Company = require("./src/models/Company.model");
const Coordinator = require("./src/models/Coordinator.model");

async function fixData() {
  await connectDB();
  try {
    const coco = await Coordinator.findOne({
      $or: [{ rollNumber: "coco001" }, { name: "coco001" }],
    }).populate("assignedCompanies");

    if (!coco) {
      console.log("coco001 not found");
      process.exit(0);
    }

    // Find companies assigned to this CoCo
    const companies = coco.assignedCompanies;

    // Group by day and slot
    const slotMap = {};
    for (const c of companies) {
      const key = `${c.day}-${c.slot}`;
      if (!slotMap[key]) slotMap[key] = [];
      slotMap[key].push(c);
    }

    let fixedOptiver = false;

    for (const [key, comps] of Object.entries(slotMap)) {
      if (comps.length > 1) {
        console.log(`Violation found for ${coco.name} in Day Slot ${key}:`, comps.map(c => c.name));

        // Find Optiver
        const optiverIndex = comps.findIndex(c => c.name.toLowerCase().includes("optiver"));
        if (optiverIndex > -1) {
          const optiver = comps[optiverIndex];
          console.log(`Removing Optiver (${optiver._id}) from ${coco.name} in ${key}`);

          // Remove Optiver from CoCo
          await Coordinator.findByIdAndUpdate(coco._id, { $pull: { assignedCompanies: optiver._id } });
          // Remove CoCo from Optiver
          await Company.findByIdAndUpdate(optiver._id, { $pull: { assignedCocos: coco._id } });

          // Find next free slot on that day
          const day = optiver.day;
          let newSlot = null;
          // Slots are "morning", "afternoon"
          const possibleSlots = ["morning", "afternoon"];
          for (const s of possibleSlots) {
            const hasSlot = companies.some(c => c.day === day && c.slot.toLowerCase() === s && c._id.toString() !== optiver._id.toString());
            if (!hasSlot) {
              newSlot = s;
              break;
            }
          }

          if (newSlot) {
            console.log(`Reassigning Optiver to Day ${day} Slot ${newSlot}`);
            await Company.findByIdAndUpdate(optiver._id, { slot: newSlot, $push: { assignedCocos: coco._id } });
            await Coordinator.findByIdAndUpdate(coco._id, { $push: { assignedCompanies: optiver._id } });
          } else {
            console.log(`No free slot found for Optiver on Day ${day}. Left unassigned.`);
          }
          fixedOptiver = true;
        }
      }
    }

    if (!fixedOptiver) {
      console.log("No Optiver violation found for coco001.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

fixData();
