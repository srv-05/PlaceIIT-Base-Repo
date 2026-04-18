const User = require("../models/User.model");
const Apc = require("../models/Apc.model");
const crypto = require("crypto");
const { sendApcWelcomeEmail } = require("./email.service");

const createApc = async (data) => {
  const { name, email, rollNumber, contact } = data;

  if (!name || !name.trim() || !email || !rollNumber || !String(rollNumber).trim() || !contact) {
    throw new Error("Name, Email, Roll Number, and Phone Number are required");
  }

  const finalName = name.trim();
  if (!finalName || !/^[A-Za-z\s]+$/.test(finalName)) {
    throw new Error("APC name can only contain letters and spaces");
  }

  const finalRollNumber = String(rollNumber).trim();
  if (!/^\d+$/.test(finalRollNumber)) {
    throw new Error("Institute ID must contain only numbers");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@(iitk\.ac\.in|gmail\.com)$/i;
  if (!emailRegex.test(email)) throw new Error(`Invalid email domain: ${email}. Must be @iitk.ac.in or @gmail.com`);

  // Validate phone number format (must be 10 digits)
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(contact)) throw new Error(`Invalid phone number format for ${contact} (must be 10 digits)`);

  const finalEmail = email.toLowerCase();

  // Check if user already exists
  const existingEmail = await User.findOne({ email: finalEmail });
  if (existingEmail) throw new Error(`User already exists with email: ${finalEmail}`);

  const existingRoll = await Apc.findOne({ rollNumber: finalRollNumber });
  if (existingRoll) throw new Error(`APC already exists with Roll Number: ${finalRollNumber}`);

  // Check if phone number is already used by another APC
  const existingPhone = await Apc.findOne({ contact });
  if (existingPhone) throw new Error(`An APC with phone number "${contact}" already exists`);

  let nextX = await Apc.countDocuments() + 1;
  let instituteId = `apc${nextX}`;
  while (await User.exists({ instituteId })) {
    nextX++;
    instituteId = `apc${nextX}`;
  }

  const finalPassword = crypto.randomBytes(4).toString("hex");

  const user = await User.create({
    instituteId,
    email: finalEmail,
    password: finalPassword,
    role: "admin",
    mustChangePassword: true,
  });

  const apc = await Apc.create({
    userId: user._id,
    name: finalName,
    rollNumber: finalRollNumber,
    contact,
  });

  let emailSent = false;
  try {
    await sendApcWelcomeEmail(finalEmail, finalName, instituteId, finalPassword);
    emailSent = true;
  } catch (emailErr) {
    console.error(`[createApc] Non-fatal: Failed to send welcome email to ${finalEmail}:`, emailErr);
  }

  return { apc, credentials: { instituteId, password: finalPassword }, emailSent };
};

module.exports = {
  createApc,
};
