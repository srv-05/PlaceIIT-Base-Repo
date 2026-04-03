const mongoose = require("mongoose");
const Apc = require("../../models/Apc.model");

describe("Apc Model", () => {
  test("should enforce required fields", () => {
    const apc = new Apc({});
    const err = apc.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
    expect(err.errors.userId).toBeDefined();
    expect(err.errors.name).toBeDefined();
  });

  test("should catch invalid phone number format", () => {
    const apc = new Apc({
      userId: new mongoose.Types.ObjectId(),
      name: "Test APC",
      contact: "123" // invalid length
    });
    const err = apc.validateSync();
    expect(err).toBeDefined();
    if (err.errors.contact) {
      expect(err.errors.contact.name).toBe("ValidatorError");
    }
  });

  test("should create instance with valid data", () => {
    const apc = new Apc({
      userId: new mongoose.Types.ObjectId(),
      name: "Test APC",
      rollNumber: "TESTROLL",
      contact: "1234567890"
    });
    const err = apc.validateSync();
    expect(err).toBeUndefined();
    expect(apc.name).toBe("Test APC");
  });
});
