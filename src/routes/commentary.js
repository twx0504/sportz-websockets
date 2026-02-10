import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

// Create router with mergeParams to access parent route parameters
export const commentaryRouter = Router({ mergeParams: true });

// Maximum number of commentary entries to return
const MAX_LIMIT = 100;

// GET / - List commentary for a match
commentaryRouter.get("/", async (req, res) => {
  // Validate match ID from URL parameters
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid match ID",
      details: paramsResult.error.issues,
    });
  }

  // Validate query parameters, such as limit
  const queryResult = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: queryResult.error.issues,
    });
  }

  try {
    // Extract match ID and limit
    const matchId = paramsResult.data.id;
    const { limit = 10 } = queryResult.data;
    const safeLimit = Math.min(limit, MAX_LIMIT);

    // Fetch commentary from database
    // Filter by match ID
    // Order by createdAt descending so newest entries come first
    // Limit the number of results
    const rows = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, matchId))
      .orderBy(desc(commentary.createdAt))
      .limit(safeLimit);

    // Return the fetched commentary
    res.status(200).json({ data: rows });
  } catch (err) {
    console.error(`Failed to fetch commentary: ${err}`);
    res.status(500).json({ error: "Failed to fetch commentary." });
  }
});

// POST / - Create a new commentary entry for a match
commentaryRouter.post("/", async (req, res) => {
  // Validate match ID from URL parameters
  const paramsResult = matchIdParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res
      .status(400)
      .json({ error: "Invalid match ID", details: paramsResult.error.issues });
  }

  // Validate request body against the commentary schema
  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload.",
      details: bodyResult.error.issues,
    });
  }

  try {
    const matchId = paramsResult.data.id;

    // Insert the commentary into the database
    // Spread validated body data and attach match ID
    // returning() gives the inserted row
    const [inserted] = await db
      .insert(commentary)
      .values({
        matchId,
        ...bodyResult.data,
      })
      .returning();

    // Return the inserted commentary
    res.status(201).json({ data: inserted });
  } catch (err) {
    console.error(`Failed to create commentary: ${err}`);
    res.status(500).json({ error: "Failed to create commentary." });
  }
});
