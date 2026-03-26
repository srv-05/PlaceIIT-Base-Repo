require("./src/config/env");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./src/models/User.model");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const adminUser = await User.findOne({ role: "admin", isMainAdmin: true });
    if (!adminUser) { console.log("No admin found"); return; }

    const token = jwt.sign({ id: adminUser._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "10m" });

    const payload = {
        name: "Agent Test 2",
        rollNumber: "AGENT_HTTP_123",
        email: "agenttest2@example.com",
        phone: "1234567891"
    };

    const res = await fetch("http://localhost:5001/api/admin/students", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("HTTP Response Status:", res.status);
    console.log("HTTP Response Data:", data);

    await mongoose.disconnect();
}
run();
