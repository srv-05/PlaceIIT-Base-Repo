const mongoose = require("mongoose");
const { login } = require("./src/controllers/auth.controller");
const { MONGO_URI } = require("./src/config/env");

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const req = { body: { instituteId: "admin001", password: "admin123", role: "admin" } };
  const res = {
    status: (code) => { console.log("Status:", code); return res; },
    json: (data) => console.log("JSON:", data)
  };
  
  console.log("Calling login...");
  await login(req, res);
  console.log("Login finished.");
  
  await mongoose.disconnect();
  process.exit(0);
}

test().catch(console.error);
