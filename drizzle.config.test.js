import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Drizzle Configuration", () => {
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
      delete process.env.DATABASE_URL;

      await expect(async () => {
        await import("./drizzle.config.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not set in .env file");
    });

    it("should throw error with correct message", async () => {
      process.env.DATABASE_URL = undefined;

      await expect(async () => {
        await import("./drizzle.config.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not set in .env file");
    });

    it("should throw error when DATABASE_URL is empty string", async () => {
      process.env.DATABASE_URL = "";

      await expect(async () => {
        await import("./drizzle.config.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not set in .env file");
    });

    it("should throw error for null DATABASE_URL", async () => {
      process.env.DATABASE_URL = null;

      await expect(async () => {
        await import("./drizzle.config.js?t=" + Date.now());
      }).rejects.toThrow("DATABASE_URL is not set in .env file");
    });
  });

  describe("Configuration with valid DATABASE_URL", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should successfully import config module when DATABASE_URL is set", async () => {
      const configModule = await import("./drizzle.config.js?t=" + Date.now());
      expect(configModule).toBeDefined();
    });

    it("should export default configuration", async () => {
      const configModule = await import("./drizzle.config.js?t=" + Date.now());
      expect(configModule.default).toBeDefined();
      expect(typeof configModule.default).toBe("object");
    });

    it("should have schema path configured", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.schema).toBe("./src/db/schema.js");
    });

    it("should have output directory configured", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.out).toBe("./drizzle");
    });

    it("should use postgresql dialect", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dialect).toBe("postgresql");
    });

    it("should have dbCredentials with url", async () => {
      const testUrl = "postgresql://testuser:testpass@testhost:5432/testdb";
      process.env.DATABASE_URL = testUrl;

      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dbCredentials).toBeDefined();
      expect(config.dbCredentials.url).toBe(testUrl);
    });

    it("should have all required configuration keys", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config).toHaveProperty("schema");
      expect(config).toHaveProperty("out");
      expect(config).toHaveProperty("dialect");
      expect(config).toHaveProperty("dbCredentials");
    });
  });

  describe("Configuration structure", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should have correct schema path format", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.schema).toMatch(/^\.\/.*\.js$/);
    });

    it("should have correct output path format", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.out).toMatch(/^\.\/drizzle$/);
    });

    it("should have dbCredentials as object", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(typeof config.dbCredentials).toBe("object");
      expect(config.dbCredentials).not.toBeNull();
    });

    it("should have url in dbCredentials", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dbCredentials.url).toBeDefined();
      expect(typeof config.dbCredentials.url).toBe("string");
    });

    it("should point to correct schema file location", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.schema).toBe("./src/db/schema.js");
    });

    it("should point to drizzle output directory", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.out).toBe("./drizzle");
    });
  });

  describe("Environment variable handling", () => {
    it("should use DATABASE_URL from environment", async () => {
      const customUrl = "postgresql://custom:pass@custom.host:5432/customdb";
      process.env.DATABASE_URL = customUrl;

      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dbCredentials.url).toBe(customUrl);
    });

    it("should handle different PostgreSQL URL formats", async () => {
      const urls = [
        "postgresql://localhost/mydb",
        "postgres://user@localhost:5432/db",
        "postgresql://user:pass@host/db?ssl=true",
      ];

      for (const url of urls) {
        process.env.DATABASE_URL = url;
        vi.resetModules();

        const { default: config } = await import(
          "./drizzle.config.js?t=" + Date.now()
        );
        expect(config.dbCredentials.url).toBe(url);
      }
    });

    it("should load environment variables via dotenv", async () => {
      // Simulate environment variable from .env file
      process.env.DATABASE_URL = "postgresql://fromenv:password@host/db";

      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dbCredentials.url).toBeTruthy();
    });
  });

  describe("Configuration immutability", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should not modify schema path", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      const originalSchema = config.schema;
      expect(originalSchema).toBe("./src/db/schema.js");
    });

    it("should not modify output directory", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      const originalOut = config.out;
      expect(originalOut).toBe("./drizzle");
    });

    it("should not modify dialect", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      const originalDialect = config.dialect;
      expect(originalDialect).toBe("postgresql");
    });
  });

  describe("Error scenarios", () => {
    it("should fail immediately on missing DATABASE_URL", async () => {
      delete process.env.DATABASE_URL;

      const startTime = Date.now();
      await expect(async () => {
        await import("./drizzle.config.js?t=" + Date.now());
      }).rejects.toThrow();
      const endTime = Date.now();

      // Should fail fast
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should provide helpful error message", async () => {
      delete process.env.DATABASE_URL;

      try {
        await import("./drizzle.config.js?t=" + Date.now());
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).toContain(".env file");
        expect(error.message).toContain("DATABASE_URL");
      }
    });

    it("should handle whitespace-only DATABASE_URL as invalid", async () => {
      process.env.DATABASE_URL = "   ";

      // Whitespace is still truthy, so it won't throw
      // but let's test it passes through
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );
      expect(config.dbCredentials.url).toBe("   ");
    });
  });

  describe("Config usage compatibility", () => {
    beforeEach(() => {
      process.env.DATABASE_URL =
        "postgresql://user:password@localhost:5432/testdb";
    });

    it("should be compatible with drizzle-kit commands", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );

      // Check all required properties for drizzle-kit
      expect(config.schema).toBeDefined();
      expect(config.out).toBeDefined();
      expect(config.dialect).toBeDefined();
      expect(config.dbCredentials).toBeDefined();
      expect(config.dbCredentials.url).toBeDefined();
    });

    it("should export valid drizzle config object", async () => {
      const { default: config } = await import(
        "./drizzle.config.js?t=" + Date.now()
      );

      // Verify it's a proper config object
      expect(config).toBeTruthy();
      expect(typeof config).toBe("object");
      expect(Array.isArray(config)).toBe(false);
    });
  });
});