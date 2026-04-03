/**
 * BRANCH 9c: Company Model Tests
 * Tests Company.model.js schema shape
 */
describe("Company Model", () => {
  let Company, companySchema;

  beforeAll(() => {
    Company = require("../../models/Company.model");
    companySchema = Company.schema;
  });

  test("should have name as required string", () => {
    const field = companySchema.path("name");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
    expect(field.isRequired).toBe(true);
  });

  test("should have day as required number", () => {
    const field = companySchema.path("day");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Number");
    expect(field.isRequired).toBe(true);
  });

  test("should have slot as required string with enum", () => {
    const field = companySchema.path("slot");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
    expect(field.isRequired).toBe(true);
    expect(field.enumValues).toEqual(expect.arrayContaining(["morning", "afternoon"]));
  });

  test("should have venue as required string", () => {
    const field = companySchema.path("venue");
    expect(field).toBeDefined();
    expect(field.instance).toBe("String");
    expect(field.isRequired).toBe(true);
  });

  test("should have isActive defaulting to true", () => {
    const field = companySchema.path("isActive");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(true);
  });

  test("should have isWalkInEnabled defaulting to false", () => {
    const field = companySchema.path("isWalkInEnabled");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(false);
  });

  test("should have currentRound defaulting to 1", () => {
    const field = companySchema.path("currentRound");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(1);
  });

  test("should have totalRounds defaulting to 3", () => {
    const field = companySchema.path("totalRounds");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(3);
  });

  test("should have mode with enum and default offline", () => {
    const field = companySchema.path("mode");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe("offline");
    expect(field.enumValues).toEqual(expect.arrayContaining(["online", "offline", "hybrid"]));
  });

  test("should have shortlistedStudents as array", () => {
    const field = companySchema.path("shortlistedStudents");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Array");
  });

  test("should have assignedCocos as array", () => {
    const field = companySchema.path("assignedCocos");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Array");
  });

  test("should have requiredCocosCount defaulting to 1", () => {
    const field = companySchema.path("requiredCocosCount");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(1);
  });
});
