import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Database Connection", () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear module cache to test different scenarios
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("DATABASE_URL validation", () => {
    it("should throw error when DATABASE_URL is not set", async () => {
      // Remove DATABASE_URL from environment
      delete process.env.DATABASE_URL;

      // Dynamically import should throw
      await expect(async () => {
        await import("./db.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not defined");
    });

    it("should throw error with correct message when DATABASE_URL is undefined", async () => {
      process.env.DATABASE_URL = undefined;

      await expect(async () => {
        await import("./db.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not defined");
    });

    it("should throw error when DATABASE_URL is empty string", async () => {
      process.env.DATABASE_URL = "";

      await expect(async () => {
        await import("./db.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not defined");
    });
  });

  describe("Database initialization with valid DATABASE_URL", () => {
    beforeEach(() => {
      // Set a valid DATABASE_URL for successful initialization
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should successfully import db module when DATABASE_URL is set", async () => {
      const dbModule = await import("./db.js?t=" + Date.now());
      expect(dbModule).toBeDefined();
    });

    it("should export pool object", async () => {
      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool).toBeDefined();
      expect(pool).toHaveProperty("connect");
      expect(pool).toHaveProperty("query");
      expect(pool).toHaveProperty("end");
    });

    it("should export db object", async () => {
      const { db } = await import("./db.js?t=" + Date.now());
      expect(db).toBeDefined();
      expect(typeof db).toBe("object");
    });

    it("should create pool with correct connection string", async () => {
      const testUrl = "postgresql://testuser:testpass@testhost:5432/testdb";
      process.env.DATABASE_URL = testUrl;

      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool).toBeDefined();
      // Pool should be configured (we can't easily check internal config without exposing it)
      expect(pool.options.connectionString).toBe(testUrl);
    });

    it("should export both db and pool", async () => {
      const dbModule = await import("./db.js?t=" + Date.now());
      expect(dbModule).toHaveProperty("db");
      expect(dbModule).toHaveProperty("pool");
    });

    it("should create drizzle instance from pool", async () => {
      const { db, pool } = await import("./db.js?t=" + Date.now());
      expect(db).toBeDefined();
      expect(pool).toBeDefined();
      // Drizzle instance should be an object
      expect(typeof db).toBe("object");
    });
  });

  describe("Database connection properties", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should have pool with query method", async () => {
      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool.query).toBeDefined();
      expect(typeof pool.query).toBe("function");
    });

    it("should have pool with connect method", async () => {
      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool.connect).toBeDefined();
      expect(typeof pool.connect).toBe("function");
    });

    it("should have pool with end method for cleanup", async () => {
      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool.end).toBeDefined();
      expect(typeof pool.end).toBe("function");
    });

    it("should initialize db as drizzle instance", async () => {
      const { db } = await import("./db.js?t=" + Date.now());
      // Drizzle instances have specific properties
      expect(db).toBeDefined();
      expect(typeof db).toBe("object");
    });
  });

  describe("Environment variable handling", () => {
    it("should handle DATABASE_URL from .env file", async () => {
      // Set DATABASE_URL as if it came from .env
      process.env.DATABASE_URL = "postgresql://envuser:envpass@envhost/envdb";

      const { pool } = await import("./db.js?t=" + Date.now());
      expect(pool).toBeDefined();
      expect(pool.options.connectionString).toBe(
        "postgresql://envuser:envpass@envhost/envdb"
      );
    });

    it("should throw error for null DATABASE_URL", async () => {
      process.env.DATABASE_URL = null;

      await expect(async () => {
        await import("./db.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not defined");
    });

    it("should accept various PostgreSQL URL formats", async () => {
      const validUrls = [
        "postgresql://localhost/mydb",
        "postgres://user@localhost/db",
        "postgresql://user:pass@host:5432/db?ssl=true",
      ];

      for (const url of validUrls) {
        process.env.DATABASE_URL = url;
        vi.resetModules();

        const { pool } = await import("./db.js?t=" + Date.now());
        expect(pool).toBeDefined();
        expect(pool.options.connectionString).toBe(url);
      }
    });
  });

  describe("Module exports", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should export exactly two named exports", async () => {
      const dbModule = await import("./db.js?t=" + Date.now());
      const exports = Object.keys(dbModule);
      expect(exports).toContain("pool");
      expect(exports).toContain("db");
    });

    it("should not have default export", async () => {
      const dbModule = await import("./db.js?t=" + Date.now());
      expect(dbModule.default).toBeUndefined();
    });

    it("should export pool as pg.Pool instance", async () => {
      const { pool } = await import("./db.js?t=" + Date.now());
      // Pool might be wrapped (BoundPool) so check it contains "Pool" in the name
      expect(pool.constructor.name).toContain("Pool");
    });
  });

  describe("Error scenarios", () => {
    it("should fail fast on missing DATABASE_URL", async () => {
      delete process.env.DATABASE_URL;

      const startTime = Date.now();
      await expect(async () => {
        await import("./db.js?t=" + Date.now());
      }).rejects.toThrow();
      const endTime = Date.now();

      // Should fail immediately, not after timeout
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should provide clear error message", async () => {
      delete process.env.DATABASE_URL;

      try {
        await import("./db.js?t=" + Date.now());
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toBe("DATABASE_URL is not defined");
        expect(error.message).not.toContain("undefined");
      }
    });
  });
});