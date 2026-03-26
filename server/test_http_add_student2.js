require("./src/config/env");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./src/models/User.model");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const adminUser = await User.findOne({ role: "admin", isMainAdmin: true });
    if (!adminUser) { console.log("No admin found"); return; }

    // Create token with all necessary fields
    const token = jwt.sign(
        { id: adminUser._id, role: adminUser.role, isMainAdmin: adminUser.isMainAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    const payload = {
        name: "Agent Test HTTP",
        rollNumber: "AGENT_HTTP_003",
        email: "test.api.student@example.com",
        phone: "1234567891"
    };

    try {
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
    } catch (e) { console.error(e) }

    await mongoose.disconnect();
}
run();
