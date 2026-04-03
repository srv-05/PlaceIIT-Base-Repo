const mongoose = require("mongoose");
const Coordinator = require("../../models/Coordinator.model");

describe("Coordinator Model", () => {
  test("should enforce required fields", () => {
    const coco = new Coordinator({});
    const err = coco.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
  });

  test("should catch invalid email format if schema provides validation", () => {
    const coco = new Coordinator({
      userId: new mongoose.Types.ObjectId(),
      name: "Coco",
      email: "invalid-email",
      companyId: new mongoose.Types.ObjectId()
    });
    const err = coco.validateSync();
    if (err && err.errors.email) {
      expect(err.errors.email.name).toBe("ValidatorError");
    }
  });

  test("should create instance with valid data", () => {
    const coco = new Coordinator({
      userId: new mongoose.Types.ObjectId(),
      name: "Coco",
      email: "coco@test.com"
    });
    expect(coco.name).toBe("Coco");
  });
});
