const XLSX = require("xlsx");
const { processStudentExcel } = require("../../services/excel.service");
const Student = require("../../models/Student.model");
const User = require("../../models/User.model");
const ExcelUpload = require("../../models/ExcelUpload.model");
const emailService = require("../../services/email.service");

jest.mock("xlsx");
jest.mock("../../models/Student.model");
jest.mock("../../models/User.model");
jest.mock("../../models/ExcelUpload.model");
jest.mock("../../services/email.service");

describe("Excel Service - processStudentExcel", () => {
    let mockWb;

    beforeEach(() => {
        mockWb = {
            SheetNames: ["Sheet1"],
            Sheets: {
                "Sheet1": {}
            }
        };
        XLSX.readFile.mockReturnValue(mockWb);
        ExcelUpload.findByIdAndUpdate.mockResolvedValue({});
        jest.clearAllMocks();
    });

    test("handles empty file throwing error", async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([]);
        await expect(processStudentExcel("upload1", "dummy.xlsx"))
            .resolves.toEqual({ processed: 0, problemList: [] });
    });

    test("catches missing/invalid fields", async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { "Name": "John" } // missing email, roll, phone
        ]);

        const result = await processStudentExcel("upload1", "dummy.xlsx");
        
        expect(result.processed).toBe(0);
        expect(result.problemList).toContain("Row 2: Missing one of required fields (Name, Roll Number, Email ID, Phone Number)");
        expect(Student.create).not.toHaveBeenCalled();
    });

    test("bulk inserts students correctly", async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { "Name": "John", "Roll Number": "123", "Email ID": "john@test.com", "Phone Number": "1234567890" }
        ]);

        User.findOne.mockResolvedValue(null);
        User.create.mockResolvedValue({ _id: "user1" });
        Student.create.mockResolvedValue({ _id: "student1" });
        emailService.sendWelcomeEmail.mockResolvedValue(true);

        const result = await processStudentExcel("upload1", "dummy.xlsx");
        
        expect(result.processed).toBe(1);
        expect(Student.create).toHaveBeenCalledWith(expect.objectContaining({
            name: "John",
            rollNumber: "123",
            phone: "1234567890"
        }));
    });

    test("handles corrupt file gracefully", async () => {
        XLSX.readFile.mockImplementation(() => { throw new Error("Corrupt file"); });

        await expect(processStudentExcel("upload1", "corrupt.xlsx")).rejects.toThrow("Corrupt file");
        expect(ExcelUpload.findByIdAndUpdate).toHaveBeenCalledWith(
            "upload1", 
            expect.objectContaining({ status: "failed" })
        );
    });
});
