/**
 * Common test helpers – shared mock factories, tokens, etc.
 */
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/env");

const TEST_JWT_SECRET = JWT_SECRET || "fallback_secret";

/** Generate a fake MongoDB ObjectId string */
const mockObjectId = (id = "aaa") => {
  const hex = id.replace(/[^0-9a-f]/gi, "a");
  return (hex + "0".repeat(24)).slice(0, 24);
};

/** Generate a valid JWT for test requests */
const generateTestToken = (role = "student", userId = mockObjectId("user1")) => {
  return jwt.sign({ id: userId, role }, TEST_JWT_SECRET, { expiresIn: "1h" });
};

/** Form a Mongoose Model Mock */
const mockMongooseModel = (modelName) => {
  return {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    updateOne: jest.fn(),
    aggregate: jest.fn()
  };
};

/** Common mock user objects */
const sampleStudent = {
  _id: mockObjectId("student1"),
  instituteId: "STU001",
  email: "student@test.com",
  role: "student",
  isActive: true,
  mustChangePassword: false,
  isMainAdmin: false,
  comparePassword: jest.fn().mockResolvedValue(true),
  select: jest.fn().mockReturnThis(),
};

const sampleAdmin = {
  _id: mockObjectId("admin1"),
  instituteId: "ADM001",
  email: "admin@test.com",
  role: "admin",
  isActive: true,
  mustChangePassword: false,
  isMainAdmin: true,
  comparePassword: jest.fn().mockResolvedValue(true),
  select: jest.fn().mockReturnThis(),
};

const sampleCoordinator = {
  _id: mockObjectId("coco1"),
  instituteId: "COCO001",
  email: "coco@test.com",
  role: "coordinator",
  isActive: true,
  mustChangePassword: false,
  isMainAdmin: false,
  comparePassword: jest.fn().mockResolvedValue(true),
  select: jest.fn().mockReturnThis(),
};

const sampleCompany = {
  _id: mockObjectId("company1"),
  instituteId: "COMP001",
  email: "company@test.com",
  role: "company",
  isActive: true,
  mustChangePassword: false,
  isMainAdmin: false,
  comparePassword: jest.fn().mockResolvedValue(true),
  select: jest.fn().mockReturnThis(),
};

module.exports = {
  mockObjectId,
  generateTestToken,
  mockMongooseModel,
  sampleStudent,
  sampleAdmin,
  sampleCoordinator,
  sampleCompany,
  TEST_JWT_SECRET,
};
