describe("ENV Config", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clears any cache
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test("should load env variables from process.env if provided", () => {
    process.env.PORT = "8080";
    process.env.MONGO_URI = "mongodb://custom-uri";
    process.env.JWT_SECRET = "super_secret";
    process.env.JWT_EXPIRES_IN = "1d";
    process.env.CLIENT_URL = "http://client";
    process.env.NODE_ENV = "production";

    const env = require("../../config/env");

    expect(env.PORT).toBe("8080");
    expect(env.MONGO_URI).toBe("mongodb://custom-uri");
    expect(env.JWT_SECRET).toBe("super_secret");
    expect(env.JWT_EXPIRES_IN).toBe("1d");
    expect(env.CLIENT_URL).toBe("http://client");
    expect(env.NODE_ENV).toBe("production");
  });

  test("should use default fallback values if process.env is empty", () => {
    delete process.env.PORT;
    delete process.env.MONGO_URI;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.CLIENT_URL;
    delete process.env.NODE_ENV;

    const env = require("../../config/env");

    expect(env.PORT).toBe(5001);
    expect(env.MONGO_URI).toBe("mongodb://localhost:27017/placement_platform");
    expect(env.JWT_SECRET).toBe("fallback_secret");
    expect(env.JWT_EXPIRES_IN).toBe("7d");
    expect(env.CLIENT_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
  });
});
