const mongoose = require("mongoose");
const connectDB = require("../../config/db");
const { MONGO_URI } = require("../../config/env");

jest.mock("mongoose");
jest.mock("../../config/env", () => ({ MONGO_URI: "mongodb://test-uri" }));

describe("DB Config - connectDB", () => {
  let consoleLogSpy, consoleErrorSpy, processExitSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test("should successfully connect to db and log confirmation", async () => {
    mongoose.connect.mockResolvedValue({
      connection: { host: "localhost" }
    });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(MONGO_URI);
    expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB Connected: localhost");
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  test("should catch error, log error, and exit process on failure", async () => {
    const errorMsg = "Connection failed";
    mongoose.connect.mockRejectedValue(new Error(errorMsg));

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(MONGO_URI);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`DB Connection Error: ${errorMsg}`);
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
