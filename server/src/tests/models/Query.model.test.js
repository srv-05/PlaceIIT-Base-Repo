const mongoose = require("mongoose");
const Query = require("../../models/Query.model");

describe("Query Model", () => {
  test("should enforce required fields", () => {
    const query = new Query({});
    const err = query.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
  });

  test("should catch invalid status enum", () => {
    const query = new Query({
      studentId: new mongoose.Types.ObjectId(),
      subject: "Test",
      description: "Test desc",
      status: "INVALID_STATUS"
    });
    const err = query.validateSync();
    expect(err).toBeDefined();
    if (err.errors.status) {
      expect(err.errors.status.kind).toBe("enum");
    }
  });

  test("should create instance with valid data", () => {
    const query = new Query({
      studentId: new mongoose.Types.ObjectId(),
      subject: "Test",
      description: "Test desc",
      status: "pending"
    });
    expect(query.subject).toBe("Test");
  });
});
