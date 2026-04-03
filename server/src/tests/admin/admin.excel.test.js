/**
 * BRANCH 5d: Admin Excel Tests
 * Tests admin.controller.js upload endpoints
 */
const {
  uploadCompanyExcel, uploadShortlistExcel, uploadStudentExcel, uploadCocoExcel,
} = require("../../controllers/admin.controller");
const ExcelUpload = require("../../models/ExcelUpload.model");
const excelService = require("../../services/excel.service");
const Student = require("../../models/Student.model");
const Coordinator = require("../../models/Coordinator.model");
const Company = require("../../models/Company.model");

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

describe("Admin Controller - Excel Uploads", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "admin1" }, body: {}, params: {}, file: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("uploadCompanyExcel", () => {
    test("should return 400 if no file uploaded", async () => {
      req.file = null;
      await uploadCompanyExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "No file uploaded" })
      );
    });

    test("should process company excel successfully", async () => {
      req.file = { originalname: "companies.xlsx", path: "/tmp/companies.xlsx" };
      ExcelUpload.create.mockResolvedValue({ _id: "upload1" });
      excelService.processCompanyExcel.mockResolvedValue({ processed: 5 });
      Student.countDocuments.mockResolvedValue(0);
      Coordinator.countDocuments.mockResolvedValue(0);
      Company.countDocuments.mockResolvedValue(5);

      await uploadCompanyExcel(req, res);

      expect(ExcelUpload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadedBy: "admin1",
          type: "company_info",
        })
      );
      expect(excelService.processCompanyExcel).toHaveBeenCalledWith("upload1", "/tmp/companies.xlsx");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("5"),
          uploadId: "upload1",
        })
      );
    });
  });

  describe("uploadShortlistExcel", () => {
    test("should return 400 if no file", async () => {
      req.file = null;
      await uploadShortlistExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if companyId missing", async () => {
      req.file = { originalname: "shortlist.xlsx", path: "/tmp/shortlist.xlsx" };
      req.body = {};
      await uploadShortlistExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should process shortlist excel successfully", async () => {
      req.file = { originalname: "shortlist.xlsx", path: "/tmp/shortlist.xlsx" };
      req.body = { companyId: "comp1" };
      ExcelUpload.create.mockResolvedValue({ _id: "upload2" });
      excelService.processShortlistExcel.mockResolvedValue({ successCount: 10, failedCount: 0, errors: [] });

      await uploadShortlistExcel(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ successCount: 10, failedCount: 0 })
      );
    });
  });

  describe("uploadStudentExcel", () => {
    test("should return 400 if no file", async () => {
      req.file = null;
      await uploadStudentExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should process student excel successfully", async () => {
      req.file = { originalname: "students.xlsx", path: "/tmp/students.xlsx" };
      ExcelUpload.create.mockResolvedValue({ _id: "upload3" });
      excelService.processStudentExcel.mockResolvedValue({ processed: 20 });
      Student.countDocuments.mockResolvedValue(20);
      Coordinator.countDocuments.mockResolvedValue(0);
      Company.countDocuments.mockResolvedValue(0);

      await uploadStudentExcel(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("20"),
        })
      );
    });
  });

  describe("uploadCocoExcel", () => {
    test("should return 400 if no file", async () => {
      req.file = null;
      await uploadCocoExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should process coco excel successfully", async () => {
      req.file = { originalname: "cocos.xlsx", path: "/tmp/cocos.xlsx" };
      ExcelUpload.create.mockResolvedValue({ _id: "upload4" });
      excelService.processCocoExcel.mockResolvedValue({ processed: 3, problemList: [] });
      Student.countDocuments.mockResolvedValue(0);
      Coordinator.countDocuments.mockResolvedValue(3);
      Company.countDocuments.mockResolvedValue(0);

      await uploadCocoExcel(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("3"),
        })
      );
    });
  });
});
