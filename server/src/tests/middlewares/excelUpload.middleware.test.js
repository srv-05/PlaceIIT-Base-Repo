/**
 * BRANCH 2c: Excel Upload Middleware Tests
 * Tests excelUpload.middleware.js multer config
 */
const path = require("path");

// We test the fileFilter function directly since multer is a config object
describe("Excel Upload Middleware", () => {
  let fileFilter;

  beforeEach(() => {
    // Re-require to get fresh module
    jest.resetModules();
    // Mock multer to capture config
    jest.doMock("multer", () => {
      const m = (config) => {
        fileFilter = config.fileFilter;
        return {
          single: jest.fn(() => (req, res, next) => next()),
          array: jest.fn(() => (req, res, next) => next()),
        };
      };
      m.diskStorage = jest.fn(() => ({}));
      return m;
    });
    require("../../middlewares/excelUpload.middleware");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should accept .xlsx files", () => {
    const cb = jest.fn();
    const file = { originalname: "data.xlsx" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test("should accept .xls files", () => {
    const cb = jest.fn();
    const file = { originalname: "data.xls" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test("should reject non-excel file types", () => {
    const cb = jest.fn();
    const file = { originalname: "data.csv" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test("should reject pdf files", () => {
    const cb = jest.fn();
    const file = { originalname: "resume.pdf" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test("should reject txt files", () => {
    const cb = jest.fn();
    const file = { originalname: "notes.txt" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(Error));
  });

  test("should accept .XLSX (case-insensitive)", () => {
    const cb = jest.fn();
    const file = { originalname: "DATA.XLSX" };
    fileFilter({}, file, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });
});
