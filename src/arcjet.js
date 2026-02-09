import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_KEY environment variable is missing.");

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        /* Note: CURL will be deemed as BOT */
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),

        // Max 50 requests every 10 seconds
        slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),

        // Max 5 connection every two seconds
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    // Move to the next middleware
    if (!httpArcjet) return next();
    try {
      const decision = await httpArcjet.protect(req);
      console.log("ID used for rate limiting:", decision.id);
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          // Rate-limiting
          return res.status(429).json({ error: "Too many requests." });
        }
        // Bot
        return res.status(403).json({ error: "Forbidden." });
      }
    } catch (err) {
      console.error(`Arcjet middleware error: ${err}`);
      return res.status(503).json({ error: "Service unavailable" });
    }

    // The decision is allowed, move to the next middleware
    next();
  };
}
