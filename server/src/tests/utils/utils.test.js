/**
 * BRANCH 10b: Utility Tests
 * Tests utils/generateToken.js, utils/constants.js, utils/priorityHelper.js, utils/student.helper.js
 */
const jwt = require("jsonwebtoken");

describe("Utility - generateToken", () => {
  let generateToken, verifyToken;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = "test_secret_key";
    const tokenUtils = require("../../utils/generateToken");
    generateToken = tokenUtils.generateToken;
    verifyToken = tokenUtils.verifyToken;
  });

  test("should generate a valid JWT", () => {
    const token = generateToken({ id: "user1", role: "admin" });
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  test("should contain the payload", () => {
    const token = generateToken({ id: "user1", role: "admin" });
    const decoded = jwt.decode(token);
    expect(decoded.id).toBe("user1");
    expect(decoded.role).toBe("admin");
  });

  test("should be verifiable with the correct secret", () => {
    const token = generateToken({ id: "user1", role: "student" });
    const result = verifyToken(token);
    expect(result.id).toBe("user1");
    expect(result.role).toBe("student");
  });

  test("should fail verification with wrong secret", () => {
    const token = jwt.sign({ id: "user1" }, "wrong_secret", { expiresIn: "1h" });
    expect(() => verifyToken(token)).toThrow();
  });
});

describe("Utility - constants", () => {
  let constants;

  beforeAll(() => {
    constants = require("../../utils/constants");
  });

  test("should export STUDENT_STATUS", () => {
    expect(constants.STUDENT_STATUS).toBeDefined();
    expect(constants.STUDENT_STATUS.IN_QUEUE).toBe("in_queue");
    expect(constants.STUDENT_STATUS.IN_INTERVIEW).toBe("in_interview");
    expect(constants.STUDENT_STATUS.COMPLETED).toBe("completed");
    expect(constants.STUDENT_STATUS.PENDING).toBe("pending");
    expect(constants.STUDENT_STATUS.EXITED).toBe("exited");
    expect(constants.STUDENT_STATUS.REJECTED).toBe("rejected");
    expect(constants.STUDENT_STATUS.ON_HOLD).toBe("on_hold");
    expect(constants.STUDENT_STATUS.OFFER_GIVEN).toBe("offer_given");
    expect(constants.STUDENT_STATUS.NOT_JOINED).toBe("not_joined");
  });

  test("should export SOCKET_EVENTS", () => {
    expect(constants.SOCKET_EVENTS).toBeDefined();
    expect(constants.SOCKET_EVENTS.QUEUE_UPDATED).toBe("queue:updated");
    expect(constants.SOCKET_EVENTS.STATUS_UPDATED).toBe("status:updated");
    expect(constants.SOCKET_EVENTS.NOTIFICATION_SENT).toBe("notification:sent");
    expect(constants.SOCKET_EVENTS.ROUND_UPDATED).toBe("round:updated");
    expect(constants.SOCKET_EVENTS.WALKIN_UPDATED).toBe("walkin:updated");
    expect(constants.SOCKET_EVENTS.DRIVE_STATE_UPDATED).toBe("driveState:updated");
  });

  test("should export ROLES as object with STUDENT, COCO, ADMIN", () => {
    expect(constants.ROLES).toBeDefined();
    expect(constants.ROLES.STUDENT).toBe("student");
    expect(constants.ROLES.COCO).toBe("coco");
    expect(constants.ROLES.ADMIN).toBe("admin");
  });

  test("should export INTERVIEW_MODES", () => {
    expect(constants.INTERVIEW_MODES).toBeDefined();
    expect(constants.INTERVIEW_MODES.ONLINE).toBe("online");
    expect(constants.INTERVIEW_MODES.OFFLINE).toBe("offline");
    expect(constants.INTERVIEW_MODES.HYBRID).toBe("hybrid");
  });

  test("should export SLOTS", () => {
    expect(constants.SLOTS).toBeDefined();
    expect(constants.SLOTS.MORNING).toBe("morning");
    expect(constants.SLOTS.AFTERNOON).toBe("afternoon");
  });

  test("should export PREDEFINED_NOTIFICATIONS as array", () => {
    expect(constants.PREDEFINED_NOTIFICATIONS).toBeDefined();
    expect(Array.isArray(constants.PREDEFINED_NOTIFICATIONS)).toBe(true);
    expect(constants.PREDEFINED_NOTIFICATIONS.length).toBeGreaterThan(0);
    expect(constants.PREDEFINED_NOTIFICATIONS[0]).toContain("report");
  });
});

describe("Utility - priorityHelper", () => {
  let sortCompaniesByPriority, buildPriorityMap;

  beforeAll(() => {
    const helper = require("../../utils/priorityHelper");
    sortCompaniesByPriority = helper.sortCompaniesByPriority;
    buildPriorityMap = helper.buildPriorityMap;
  });

  test("should sort companies by priority map", () => {
    const companies = [
      { companyId: { toString: () => "c3" }, name: "Corp C" },
      { companyId: { toString: () => "c1" }, name: "Corp A" },
      { companyId: { toString: () => "c2" }, name: "Corp B" },
    ];
    const priorityMap = { c1: 1, c2: 2, c3: 3 };

    const result = sortCompaniesByPriority(companies, priorityMap);

    expect(result[0].name).toBe("Corp A");
    expect(result[1].name).toBe("Corp B");
    expect(result[2].name).toBe("Corp C");
  });

  test("should handle companies not in priority map", () => {
    const companies = [
      { companyId: { toString: () => "c1" }, name: "A" },
      { companyId: { toString: () => "c2" }, name: "B" },
    ];
    const priorityMap = { c1: 1 };

    const result = sortCompaniesByPriority(companies, priorityMap);
    expect(result[0].name).toBe("A");
    // c2 goes to end since not in map (Infinity)
  });

  test("should handle empty priority map", () => {
    const companies = [
      { companyId: { toString: () => "c1" }, name: "A" },
      { companyId: { toString: () => "c2" }, name: "B" },
    ];
    const result = sortCompaniesByPriority(companies, {});
    expect(result).toHaveLength(2);
  });

  test("should handle empty companies array", () => {
    const result = sortCompaniesByPriority([], { c1: 1 });
    expect(result).toEqual([]);
  });

  test("buildPriorityMap should build map from priority list", () => {
    const priorityList = [
      { companyId: { toString: () => "c1" }, order: 1 },
      { companyId: { toString: () => "c2" }, order: 2 },
    ];

    const map = buildPriorityMap(priorityList);
    expect(map["c1"]).toBe(1);
    expect(map["c2"]).toBe(2);
  });

  test("buildPriorityMap should handle empty list", () => {
    const map = buildPriorityMap([]);
    expect(map).toEqual({});
  });

  test("buildPriorityMap should handle undefined", () => {
    const map = buildPriorityMap();
    expect(map).toEqual({});
  });
});

describe("Utility - student.helper (withQueueStatus)", () => {
  let withQueueStatus;

  beforeEach(() => {
    jest.resetModules();
    jest.mock("../../models/Queue.model");
    const helper = require("../../utils/student.helper");
    withQueueStatus = helper.withQueueStatus;
  });

  test("should return empty array for empty input", async () => {
    const result = await withQueueStatus([]);
    expect(result).toEqual([]);
  });

  test("should return empty array for null input", async () => {
    const result = await withQueueStatus(null);
    expect(result).toEqual([]);
  });

  test("should augment students with queue status", async () => {
    const Queue = require("../../models/Queue.model");
    const students = [
      {
        _id: "s1",
        name: "Student A",
        toObject: jest.fn().mockReturnValue({ _id: "s1", name: "Student A" }),
      },
    ];

    const mockQueues = [
      {
        studentId: { toString: () => "s1" },
        companyId: { name: "Corp", venue: "Room 1" },
        status: "in_queue",
      },
    ];
    const populateMock = jest.fn().mockResolvedValue(mockQueues);
    Queue.find.mockReturnValue({ populate: populateMock });

    const result = await withQueueStatus(students);

    expect(result[0].inInterview).toBe(false);
    expect(result[0].queuedFor).toBe("Corp");
  });

  test("should mark student as in interview when IN_INTERVIEW", async () => {
    const Queue = require("../../models/Queue.model");
    const students = [
      {
        _id: "s1",
        name: "S",
        toObject: jest.fn().mockReturnValue({ _id: "s1", name: "S" }),
      },
    ];

    const mockQueues = [
      {
        studentId: { toString: () => "s1" },
        companyId: { name: "Corp", venue: "Room 1" },
        status: "in_interview",
      },
    ];
    const populateMock = jest.fn().mockResolvedValue(mockQueues);
    Queue.find.mockReturnValue({ populate: populateMock });

    const result = await withQueueStatus(students);

    expect(result[0].inInterview).toBe(true);
    expect(result[0].interviewWith).toBe("Corp");
    expect(result[0].interviewVenue).toBe("Room 1");
  });

  test("should set inInterview false if no active queue", async () => {
    const Queue = require("../../models/Queue.model");
    const students = [
      {
        _id: "s1",
        name: "S",
        toObject: jest.fn().mockReturnValue({ _id: "s1", name: "S" }),
      },
    ];

    const populateMock = jest.fn().mockResolvedValue([]);
    Queue.find.mockReturnValue({ populate: populateMock });

    const result = await withQueueStatus(students);
    expect(result[0].inInterview).toBe(false);
  });

  test("should preserve email from populated userId", async () => {
    const Queue = require("../../models/Queue.model");
    const students = [
      {
        _id: "s1",
        name: "S",
        userId: { email: "s@test.com" },
        toObject: jest.fn().mockReturnValue({
          _id: "s1",
          name: "S",
          userId: { email: "s@test.com" },
        }),
      },
    ];

    const populateMock = jest.fn().mockResolvedValue([]);
    Queue.find.mockReturnValue({ populate: populateMock });

    const result = await withQueueStatus(students);
    expect(result[0].email).toBe("s@test.com");
  });
});
