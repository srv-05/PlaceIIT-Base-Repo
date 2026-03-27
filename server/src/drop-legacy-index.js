const mongoose = require("mongoose");
const { MONGO_URI } = require("./config/env");

async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB.");

        const collection = mongoose.connection.collection("queues");
        
        try {
            await collection.dropIndex("companyId_1_studentId_1");
            console.log("Successfully dropped legacy queue index: companyId_1_studentId_1");
        } catch (idxError) {
            console.log("Index may not exist or could not be dropped:", idxError.message);
        }

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

main();
