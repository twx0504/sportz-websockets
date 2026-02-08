import { z } from "zod";

// -----------------------------
// Constants
// -----------------------------

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

// -----------------------------
// Query Schemas
// -----------------------------

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// -----------------------------
// Param Schemas
// -----------------------------

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// -----------------------------
// Helpers
// -----------------------------

const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid ISO date string",
  });

// -----------------------------
// Body Schemas
// -----------------------------

export const createMatchSchema = z
  .object({
    sport: z.string().min(1),
    homeTeam: z.string().min(1),
    awayTeam: z.string().min(1),

    startTime: isoDateStringSchema,
    endTime: isoDateStringSchema,

    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        path: ["endTime"],
        message: "endTime must be after startTime",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
