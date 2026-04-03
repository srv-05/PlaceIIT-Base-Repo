const mongoose = require("mongoose");
const ExcelUpload = require("../../models/ExcelUpload.model");

describe("ExcelUpload Model", () => {
  test("should enforce required fields", () => {
    const upload = new ExcelUpload({});
    const err = upload.validateSync();
    expect(err).toBeDefined();
    expect(err.name).toBe("ValidationError");
  });

  test("should store file reference correctly", () => {
    const upload = new ExcelUpload({
      uploadedBy: new mongoose.Types.ObjectId(),
      uploadType: "students",
      originalFilename: "data.xlsx",
      filePath: "/path/to/data.xlsx",
      status: "pending"
    });
    expect(upload.filePath).toBe("/path/to/data.xlsx");
  });
});
