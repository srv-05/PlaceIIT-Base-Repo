/**
 * BRANCH 9a: User Model Tests
 * Tests User.model.js schema shape and methods
 */
describe("User Model", () => {
  let User, userSchema;

  beforeAll(() => {
    // Require the model which registers the schema
    User = require("../../models/User.model");
    userSchema = User.schema;
  });

  describe("Schema Fields", () => {
    test("should have instituteId as required string", () => {
      const field = userSchema.path("instituteId");
      expect(field).toBeDefined();
      expect(field.instance).toBe("String");
      expect(field.isRequired).toBe(true);
    });

    test("should have email as required string", () => {
      const field = userSchema.path("email");
      expect(field).toBeDefined();
      expect(field.instance).toBe("String");
      expect(field.isRequired).toBe(true);
    });

    test("should have password as required string", () => {
      const field = userSchema.path("password");
      expect(field).toBeDefined();
      expect(field.instance).toBe("String");
      expect(field.isRequired).toBe(true);
    });

    test("should have role as required string with enum values", () => {
      const field = userSchema.path("role");
      expect(field).toBeDefined();
      expect(field.instance).toBe("String");
      expect(field.isRequired).toBe(true);
      expect(field.enumValues).toEqual(expect.arrayContaining(["student", "coco", "admin"]));
    });

    test("should have isActive defaulting to true", () => {
      const field = userSchema.path("isActive");
      expect(field).toBeDefined();
      expect(field.defaultValue).toBe(true);
    });

    test("should have mustChangePassword defaulting to false", () => {
      const field = userSchema.path("mustChangePassword");
      expect(field).toBeDefined();
      expect(field.defaultValue).toBe(false);
    });

    test("should have isMainAdmin defaulting to false", () => {
      const field = userSchema.path("isMainAdmin");
      expect(field).toBeDefined();
      expect(field.defaultValue).toBe(false);
    });

    test("should have otpCode field", () => {
      const field = userSchema.path("otpCode");
      expect(field).toBeDefined();
      expect(field.instance).toBe("String");
    });

    test("should have otpExpiry field", () => {
      const field = userSchema.path("otpExpiry");
      expect(field).toBeDefined();
      expect(field.instance).toBe("Date");
    });

    test("should have lastLogin field", () => {
      const field = userSchema.path("lastLogin");
      expect(field).toBeDefined();
      expect(field.instance).toBe("Date");
    });
  });

  describe("Instance Methods", () => {
    test("should have comparePassword method", () => {
      expect(userSchema.methods.comparePassword).toBeDefined();
      expect(typeof userSchema.methods.comparePassword).toBe("function");
    });
  });

  describe("Pre-save Hook", () => {
    test("should have pre-save middleware registered", () => {
      const preSaveHooks = userSchema.s.hooks._pres.get("save");
      expect(preSaveHooks).toBeDefined();
      expect(preSaveHooks.length).toBeGreaterThan(0);
    });
  });
});
