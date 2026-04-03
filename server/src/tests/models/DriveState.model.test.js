const mongoose = require("mongoose");
const DriveState = require("../../models/DriveState.model");

describe("DriveState Model", () => {
  test("should enforce valid currentSlot enum", () => {
    const ds = new DriveState({
      currentSlot: "invalid_slot"
    });
    const err = ds.validateSync();
    expect(err).toBeDefined();
    if (err && err.errors.currentSlot) {
      expect(err.errors.currentSlot.kind).toBe("enum");
    }
  });

  test("should create instance with valid data and defaults", () => {
    const ds = new DriveState({});
    const err = ds.validateSync();
    expect(err).toBeUndefined();
    expect(ds.currentDay).toBe(1);
    expect(ds.currentSlot).toBe("morning");
  });
});
