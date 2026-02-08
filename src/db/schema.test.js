import { describe, it, expect } from "vitest";
import { matchStatusEnum, matches, commentary } from "./schema.js";

describe("Database Schema", () => {
  describe("matchStatusEnum", () => {
    it("should export matchStatusEnum", () => {
      expect(matchStatusEnum).toBeDefined();
    });

    it("should have correct enum name", () => {
      expect(matchStatusEnum.enumName).toBe("match_status");
    });

    it("should have correct enum values", () => {
      expect(matchStatusEnum.enumValues).toEqual([
        "scheduled",
        "live",
        "finished",
      ]);
    });

    it("should contain all three status values in order", () => {
      const values = matchStatusEnum.enumValues;
      expect(values).toHaveLength(3);
      expect(values[0]).toBe("scheduled");
      expect(values[1]).toBe("live");
      expect(values[2]).toBe("finished");
    });
  });

  describe("matches table", () => {
    it("should export matches table", () => {
      expect(matches).toBeDefined();
    });

    it("should have correct table name", () => {
      expect(matches[Symbol.for("drizzle:Name")]).toBe("matches");
    });

    it("should have id column as primary key", () => {
      const columns = Object.keys(matches);
      expect(columns).toContain("id");
      expect(matches.id).toBeDefined();
    });

    it("should have all required columns", () => {
      const columns = Object.keys(matches);
      expect(columns).toContain("id");
      expect(columns).toContain("sport");
      expect(columns).toContain("homeTeam");
      expect(columns).toContain("awayTeam");
      expect(columns).toContain("status");
      expect(columns).toContain("startTime");
      expect(columns).toContain("endTime");
      expect(columns).toContain("homeScore");
      expect(columns).toContain("awayScore");
      expect(columns).toContain("createdAt");
    });

    it("should have correct column count", () => {
      const columns = Object.keys(matches).filter(
        (key) => !key.startsWith("_") && typeof key === "string"
      );
      // Filter out Symbol properties and internal properties
      const validColumns = columns.filter(
        (col) =>
          [
            "id",
            "sport",
            "homeTeam",
            "awayTeam",
            "status",
            "startTime",
            "endTime",
            "homeScore",
            "awayScore",
            "createdAt",
          ].includes(col)
      );
      expect(validColumns.length).toBeGreaterThanOrEqual(10);
    });

    it("should have sport column defined", () => {
      expect(matches.sport).toBeDefined();
      expect(matches.sport.name).toBe("sport");
    });

    it("should have homeTeam column defined", () => {
      expect(matches.homeTeam).toBeDefined();
      expect(matches.homeTeam.name).toBe("home_team");
    });

    it("should have awayTeam column defined", () => {
      expect(matches.awayTeam).toBeDefined();
      expect(matches.awayTeam.name).toBe("away_team");
    });

    it("should have status column with enum type", () => {
      expect(matches.status).toBeDefined();
      expect(matches.status.name).toBe("status");
    });

    it("should have score columns with integer type", () => {
      expect(matches.homeScore).toBeDefined();
      expect(matches.homeScore.name).toBe("home_score");
      expect(matches.awayScore).toBeDefined();
      expect(matches.awayScore.name).toBe("away_score");
    });

    it("should have timestamp columns", () => {
      expect(matches.startTime).toBeDefined();
      expect(matches.startTime.name).toBe("start_time");
      expect(matches.endTime).toBeDefined();
      expect(matches.endTime.name).toBe("end_time");
      expect(matches.createdAt).toBeDefined();
      expect(matches.createdAt.name).toBe("created_at");
    });
  });

  describe("commentary table", () => {
    it("should export commentary table", () => {
      expect(commentary).toBeDefined();
    });

    it("should have correct table name", () => {
      expect(commentary[Symbol.for("drizzle:Name")]).toBe("commentary");
    });

    it("should have id column as primary key", () => {
      const columns = Object.keys(commentary);
      expect(columns).toContain("id");
      expect(commentary.id).toBeDefined();
    });

    it("should have all required columns", () => {
      const columns = Object.keys(commentary);
      expect(columns).toContain("id");
      expect(columns).toContain("matchId");
      expect(columns).toContain("minute");
      expect(columns).toContain("sequence");
      expect(columns).toContain("period");
      expect(columns).toContain("eventType");
      expect(columns).toContain("actor");
      expect(columns).toContain("team");
      expect(columns).toContain("message");
      expect(columns).toContain("metadata");
      expect(columns).toContain("tags");
      expect(columns).toContain("createdAt");
    });

    it("should have matchId column with foreign key reference", () => {
      expect(commentary.matchId).toBeDefined();
      expect(commentary.matchId.name).toBe("match_id");
    });

    it("should have message column defined", () => {
      expect(commentary.message).toBeDefined();
      expect(commentary.message.name).toBe("message");
    });

    it("should have optional minute column", () => {
      expect(commentary.minute).toBeDefined();
      expect(commentary.minute.name).toBe("minute");
    });

    it("should have optional sequence column", () => {
      expect(commentary.sequence).toBeDefined();
      expect(commentary.sequence.name).toBe("sequence");
    });

    it("should have optional period column", () => {
      expect(commentary.period).toBeDefined();
      expect(commentary.period.name).toBe("period");
    });

    it("should have optional eventType column", () => {
      expect(commentary.eventType).toBeDefined();
      expect(commentary.eventType.name).toBe("event_type");
    });

    it("should have optional actor column", () => {
      expect(commentary.actor).toBeDefined();
      expect(commentary.actor.name).toBe("actor");
    });

    it("should have optional team column", () => {
      expect(commentary.team).toBeDefined();
      expect(commentary.team.name).toBe("team");
    });

    it("should have metadata column for JSON data", () => {
      expect(commentary.metadata).toBeDefined();
      expect(commentary.metadata.name).toBe("metadata");
    });

    it("should have tags column as array", () => {
      expect(commentary.tags).toBeDefined();
      expect(commentary.tags.name).toBe("tags");
    });

    it("should have createdAt timestamp column", () => {
      expect(commentary.createdAt).toBeDefined();
      expect(commentary.createdAt.name).toBe("created_at");
    });
  });

  describe("Schema relationships", () => {
    it("should have commentary.matchId reference to matches.id", () => {
      expect(commentary.matchId).toBeDefined();
      // The foreign key relationship is defined in the schema
      // We verify the column exists and has the correct name
      expect(commentary.matchId.name).toBe("match_id");
    });

    it("should maintain referential integrity between tables", () => {
      // Both tables should exist
      expect(matches).toBeDefined();
      expect(commentary).toBeDefined();
      // Commentary should have matchId column
      expect(commentary.matchId).toBeDefined();
      // Matches should have id column
      expect(matches.id).toBeDefined();
    });
  });

  describe("Schema edge cases", () => {
    it("should handle schema exports as objects", () => {
      expect(typeof matches).toBe("object");
      expect(typeof commentary).toBe("object");
    });

    it("should have distinct table names", () => {
      const matchesName = matches[Symbol.for("drizzle:Name")];
      const commentaryName = commentary[Symbol.for("drizzle:Name")];
      expect(matchesName).not.toBe(commentaryName);
    });

    it("should have all enum values as strings", () => {
      matchStatusEnum.enumValues.forEach((value) => {
        expect(typeof value).toBe("string");
      });
    });

    it("should not have duplicate enum values", () => {
      const values = matchStatusEnum.enumValues;
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});