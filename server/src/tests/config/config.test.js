/**
 * BRANCH 10a: Config Tests
 * Tests config/env.js, config/db.js, config/socket.js
 */

describe("Config - Environment", () => {
  test("should export config values", () => {
    jest.resetModules();
    process.env.PORT = "4000";
    const env = require("../../config/env");
    expect(env).toBeDefined();
    expect(env.PORT).toBe("4000");
  });

  test("should have default values when env vars not set", () => {
    jest.resetModules();
    const origPort = process.env.PORT;
    delete process.env.PORT;
    const env = require("../../config/env");
    // Should still export without error
    expect(env).toBeDefined();
    process.env.PORT = origPort;
  });
});

describe("Config - Database", () => {
  test("should export connectDB as a function", () => {
    jest.resetModules();
    // Mock mongoose before requiring db
    jest.mock("mongoose", () => ({
      connect: jest.fn().mockResolvedValue({ connection: { host: "localhost" } }),
      connection: { on: jest.fn(), once: jest.fn() },
    }));
    const connectDB = require("../../config/db");
    expect(typeof connectDB).toBe("function");
  });

  test("should call mongoose.connect", async () => {
    jest.resetModules();
    process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
    const mockConnect = jest.fn().mockResolvedValue({ connection: { host: "localhost" } });
    jest.mock("mongoose", () => ({
      connect: mockConnect,
      connection: { on: jest.fn(), once: jest.fn() },
    }));
    jest.spyOn(console, "log").mockImplementation(() => {});

    const connectDB = require("../../config/db");
    await connectDB();

    expect(mockConnect).toHaveBeenCalled();

    console.log.mockRestore();
  });

  test("should exit process on connection error", async () => {
    jest.resetModules();
    const mockConnect = jest.fn().mockRejectedValue(new Error("Connection failed"));
    const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
    jest.mock("mongoose", () => ({
      connect: mockConnect,
      connection: { on: jest.fn(), once: jest.fn() },
    }));
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    const connectDB = require("../../config/db");
    await connectDB();

    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    console.log.mockRestore();
    console.error.mockRestore();
  });
});

describe("Config - Socket", () => {
  test("should export initSocket and getIO", () => {
    jest.resetModules();
    const socket = require("../../config/socket");
    expect(typeof socket.initSocket).toBe("function");
    expect(typeof socket.getIO).toBe("function");
  });

  test("should initialize socket.io from HTTP server", () => {
    jest.resetModules();
    // Mock socket.io 
    jest.mock("socket.io", () => {
      return {
        Server: jest.fn().mockImplementation(() => ({
          on: jest.fn(),
          emit: jest.fn(),
        })),
      };
    });

    const socket = require("../../config/socket");
    const mockServer = {};
    const io = socket.initSocket(mockServer);
    expect(io).toBeDefined();
    expect(io.on).toBeDefined();
  });

  test("getIO should return io after init", () => {
    jest.resetModules();
    jest.mock("socket.io", () => ({
      Server: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        emit: jest.fn(),
      })),
    }));

    const socket = require("../../config/socket");
    const mockServer = {};
    socket.initSocket(mockServer);
    const io = socket.getIO();
    expect(io).toBeDefined();
  });
});
