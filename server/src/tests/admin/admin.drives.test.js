/**
 * BRANCH 5b: Admin Drives Tests
 * Tests admin.controller.js getCompanies, addCompany, updateCompany, getDriveState, updateDriveState
 */
const {
  getCompanies, addCompany, updateCompany, getDriveState, updateDriveState,
} = require("../../controllers/admin.controller");
const Company = require("../../models/Company.model");
const DriveState = require("../../models/DriveState.model");
const Student = require("../../models/Student.model");
const Coordinator = require("../../models/Coordinator.model");

jest.mock("../../models/Company.model");
jest.mock("../../models/Student.model");
jest.mock("../../models/Coordinator.model");
jest.mock("../../models/User.model");
jest.mock("../../models/Apc.model");
jest.mock("../../models/ExcelUpload.model");
jest.mock("../../models/DriveState.model");
jest.mock("../../models/Notification.model");
jest.mock("../../models/Queue.model");
jest.mock("../../services/excel.service");
jest.mock("../../services/allocation.service");
jest.mock("../../services/email.service");
jest.mock("../../services/apc.service");
jest.mock("../../services/coco.service");
jest.mock("../../services/notification.service");
jest.mock("../../config/socket", () => ({
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

describe("Admin Controller - Drives", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "admin1" }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getCompanies", () => {
    test("should return filtered companies", async () => {
      req.query = { day: "1", slot: "morning" };
      const mockCompanies = [{ name: "TechCorp" }];
      const populateMock = jest.fn().mockResolvedValue(mockCompanies);
      Company.find.mockReturnValue({ populate: populateMock });

      await getCompanies(req, res);

      expect(Company.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, day: 1, slot: "morning" })
      );
      expect(res.json).toHaveBeenCalledWith(mockCompanies);
    });

    test("should search by name", async () => {
      req.query = { search: "Tech" };
      const populateMock = jest.fn().mockResolvedValue([]);
      Company.find.mockReturnValue({ populate: populateMock });

      await getCompanies(req, res);

      expect(Company.find).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, name: expect.any(RegExp) })
      );
    });

    test("should return 500 on error", async () => {
      Company.find.mockImplementation(() => { throw new Error("DB Error"); });
      await getCompanies(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("addCompany", () => {
    test("should return 400 if required fields missing", async () => {
      req.body = { name: "Corp" };
      await addCompany(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should create company on success", async () => {
      req.body = { name: "Corp", day: 1, slot: "morning", venue: "Room 101" };
      const mockCompany = { _id: "c1", ...req.body };
      Company.create.mockResolvedValue(mockCompany);
      Student.countDocuments.mockResolvedValue(0);
      Coordinator.countDocuments.mockResolvedValue(0);
      Company.countDocuments.mockResolvedValue(1);

      await addCompany(req, res);

      expect(Company.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCompany);
    });
  });

  describe("updateCompany", () => {
    test("should update company and return updated", async () => {
      req.params = { id: "comp1" };
      req.body = { venue: "New Venue" };
      Company.findByIdAndUpdate.mockResolvedValue({ _id: "comp1", venue: "New Venue" });

      await updateCompany(req, res);

      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith("comp1", req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ venue: "New Venue" })
      );
    });
  });

  describe("getDriveState", () => {
    test("should return existing drive state", async () => {
      const mockState = { currentDay: 2, currentSlot: "afternoon" };
      DriveState.findOne.mockResolvedValue(mockState);

      await getDriveState(req, res);
      expect(res.json).toHaveBeenCalledWith(mockState);
    });

    test("should create default drive state if none exists", async () => {
      DriveState.findOne.mockResolvedValue(null);
      DriveState.create.mockResolvedValue({ currentDay: 1, currentSlot: "morning" });

      await getDriveState(req, res);
      expect(DriveState.create).toHaveBeenCalledWith({ currentDay: 1, currentSlot: "morning" });
    });
  });

  describe("updateDriveState", () => {
    test("should return 400 if day or slot missing", async () => {
      req.body = { day: 2 };
      await updateDriveState(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should update existing drive state", async () => {
      req.body = { day: 2, slot: "afternoon" };
      const mockState = {
        currentDay: 1,
        currentSlot: "morning",
        save: jest.fn().mockResolvedValue({}),
      };
      DriveState.findOne.mockResolvedValue(mockState);

      await updateDriveState(req, res);

      expect(mockState.currentDay).toBe(2);
      expect(mockState.currentSlot).toBe("afternoon");
      expect(mockState.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockState);
    });

    test("should create new drive state if none exists", async () => {
      req.body = { day: 1, slot: "morning" };
      DriveState.findOne.mockResolvedValue(null);
      DriveState.create.mockResolvedValue({ currentDay: 1, currentSlot: "morning" });

      await updateDriveState(req, res);
      expect(DriveState.create).toHaveBeenCalled();
    });
  });
});
