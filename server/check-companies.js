const mongoose = require('mongoose');
const Company = require('./src/models/Company.model');
require('dotenv').config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const cs = await Company.find({ name: /TCS/i });
    console.log("TCS Companies:", cs.map(c => ({ id: c._id, name: c.name })));
    process.exit();
}
run();
