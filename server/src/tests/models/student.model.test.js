/**
 * BRANCH 9b: Student Model Tests
 * Tests Student.model.js schema shape
 */
describe("Student Model", () => {
  let Student, studentSchema;

  beforeAll(() => {
    Student = require("../../models/Student.model");
    studentSchema = Student.schema;
  });

  test("should have userId as required ObjectId ref", () => {
    const field = studentSchema.path("userId");
    expect(field).toBeDefined();
    expect(field.instance).toBe("ObjectId");
    expect(field.isRequired).toBe(true);
  });

  test("should have name as required string", () => {
    const field = studentSchema.path("name");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
    expect(field.isRequired).toBe(true);
  });

  test("should have rollNumber as required string", () => {
    const field = studentSchema.path("rollNumber");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
    expect(field.isRequired).toBe(true);
  });

  test("should have profileCompleted defaulting to false", () => {
    const field = studentSchema.path("profileCompleted");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(false);
  });

  test("should have shortlistedCompanies as array", () => {
    const field = studentSchema.path("shortlistedCompanies");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Array");
  });

  test("should have priorityOrder as array", () => {
    const field = studentSchema.path("priorityOrder");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Array");
  });

  test("should have contact field", () => {
    const field = studentSchema.path("contact");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
  });

  test("should have emergencyContact.name field", () => {
    const field = studentSchema.path("emergencyContact.name");
    expect(field).toBeDefined();
  });

  test("should have emergencyContact.phone field", () => {
    const field = studentSchema.path("emergencyContact.phone");
    expect(field).toBeDefined();
  });

  test("should have resume field", () => {
    const field = studentSchema.path("resume");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
  });
});
