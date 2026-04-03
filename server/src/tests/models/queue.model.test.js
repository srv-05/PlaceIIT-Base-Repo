/**
 * BRANCH 9d: Queue Model Tests
 * Tests Queue.model.js schema shape
 */
describe("Queue Model", () => {
  let Queue, queueSchema;

  beforeAll(() => {
    Queue = require("../../models/Queue.model");
    queueSchema = Queue.schema;
  });

  test("should have studentId as required ObjectId", () => {
    const field = queueSchema.path("studentId");
    expect(field).toBeDefined();
    expect(field.instance).toBe("ObjectId");
    expect(field.isRequired).toBe(true);
  });

  test("should have companyId as required ObjectId", () => {
    const field = queueSchema.path("companyId");
    expect(field).toBeDefined();
    expect(field.instance).toBe("ObjectId");
    expect(field.isRequired).toBe(true);
  });

  test("should have status defaulting to not_joined", () => {
    const field = queueSchema.path("status");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe("not_joined");
  });

  test("should have valid status enum values", () => {
    const field = queueSchema.path("status");
    const statuses = ["not_joined", "pending", "in_queue", "in_interview", "on_hold", "completed", "rejected", "exited", "offer_given"];
    statuses.forEach(s => {
      expect(field.enumValues).toContain(s);
    });
  });

  test("should have isWalkIn defaulting to false", () => {
    const field = queueSchema.path("isWalkIn");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe(false);
  });

  test("should have round defaulting to Round 1", () => {
    const field = queueSchema.path("round");
    expect(field).toBeDefined();
    expect(field.defaultValue).toBe("Round 1");
  });

  test("should have position field as Number", () => {
    const field = queueSchema.path("position");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Number");
  });

  test("should have joinedAt field as Date", () => {
    const field = queueSchema.path("joinedAt");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Date");
  });

  test("should have completedAt field as Date", () => {
    const field = queueSchema.path("completedAt");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Date");
  });

  test("should have interviewStartedAt field as Date", () => {
    const field = queueSchema.path("interviewStartedAt");
    expect(field).toBeDefined();
    expect(field.instance).toBe("Date");
  });

  test("should have roundId as ObjectId ref", () => {
    const field = queueSchema.path("roundId");
    expect(field).toBeDefined();
    expect(field.instance).toBe("ObjectId");
  });

  test("should have panelId as ObjectId ref", () => {
    const field = queueSchema.path("panelId");
    expect(field).toBeDefined();
    expect(field.instance).toBe("ObjectId");
  });
});
