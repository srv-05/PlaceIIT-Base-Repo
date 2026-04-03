const mongoose = require("mongoose");
const InterviewRound = require("../../models/InterviewRound.model");

describe("InterviewRound Model", () => {
  test("should enforce required fields", () => {
    const round = new InterviewRound({});
    const err = round.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
    expect(err.errors.companyId).toBeDefined();
    expect(err.errors.roundNumber).toBeDefined();
  });

  test("should create valid instance with defaults", () => {
    const round = new InterviewRound({
      companyId: new mongoose.Types.ObjectId(),
      roundNumber: 1
    });
    const err = round.validateSync();
    expect(err).toBeUndefined();
    expect(round.roundName).toBe("");
    expect(round.isActive).toBe(false);
  });
});

