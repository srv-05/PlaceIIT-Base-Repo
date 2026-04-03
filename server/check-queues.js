const mongoose = require('mongoose');
const Queue = require('./src/models/Queue.model');
require('dotenv').config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    // Harsha's ID
    const harshaId = "69cff4a8a2a5a91c1c74bc51";

    const entries = await Queue.find({ studentId: '69cf24eba1c8bc06319808ac' }).populate('companyId');
    console.log("Harsha object ID check manually or broadly:");

    const hQueue = await Queue.find({}).populate('studentId companyId');
    hQueue.forEach(q => {
        if (q.studentId?.name === "Harsha" || q.studentId?.name?.includes("Harsha")) {
            console.log(q.studentId.name, q.companyId?.name, "Status:", q.status, "StudentId:", q.studentId._id, "CompanyId:", q.companyId?._id);
        }
    })

    process.exit();
}
run();
