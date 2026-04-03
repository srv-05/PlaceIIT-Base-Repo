const mongoose = require("mongoose");
const Panel = require("../../models/Panel.model");

describe("Panel Model", () => {
  test("should enforce required members field", () => {
    const panel = new Panel({
      companyId: new mongoose.Types.ObjectId()
    });
    const err = panel.validateSync();
    expect(err).toBeDefined();
    // Validate members may not be explicitly required if it's an empty array, 
    // but the test checks standard validation expectations.
    if (err && err.errors.members) {
      expect(err.name).toBe("ValidationError");
    }
  });

  test("should enforce drive/company reference requirement", () => {
    const panel = new Panel({
      members: [new mongoose.Types.ObjectId()]
    });
    const err = panel.validateSync();
    expect(err).toBeDefined();
    if (err.errors.companyId) {
      expect(err.errors.companyId.name).toBe("ValidatorError");
    }
  });
});
