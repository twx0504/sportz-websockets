import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

// Create a new Express router instance for match-related routes
export const matchRouter = Router();

// Define the maximum number of matches that can be returned in a single request
const MAX_LIMIT = 100;

// GET /matches - List matches with optional query parameters for filtering/pagination
matchRouter.get("/", async (req, res) => {
  // Validate query parameters using Zod schema
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    // Return 400 if query parameters are invalid
    return res.status(400).json({
      error: "Invalid query.",
      details: parsed.error.issues,
    });
  }

  // Use provided limit or default to 50, but cap at MAX_LIMIT
  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    // Fetch matches from the database, ordered by creation date descending
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    // Return matches as JSON
    res.json({ data });
  } catch (err) {
    // Return 500 if database query fails
    res
      .status(500)
      .json({ error: "Failed to list matches.", details: JSON.stringify(err) });
  }
});

// POST /matches - Create a new match
matchRouter.post("/", async (req, res) => {
  // Validate request body using Zod schema
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    // Return 400 if payload is invalid
    return res.status(400).json({
      error: "Invalid payload.",
      details: parsed.error.issues,
    });
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    // Insert new match into the database with default scores if not provided
    // Also compute the match status using the utility function
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    // Return the newly created match with 201 status
    res.status(201).json({ data: event });
  } catch (err) {
    // Return 500 if insertion fails
    res
      .status(500)
      .json({ error: "Failed to create match.", details: JSON.stringify(err) });
  }
});
