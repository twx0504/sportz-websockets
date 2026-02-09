import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode =
  process.env.ARCJET_ENV === "development" ? "DRY_RUN" : "LIVE";

/**
 * HTTP Arcjet instance for protecting HTTP routes.
 * Only initialized if ARCJET_KEY exists.
 *
 * Rules:
 * 1. Shield: core protection
 * 2. detectBot: blocks bots except search engines, and preview services
 * 3. slidingWindow: rate-limiting (max 50 requests per 10s)
 */
export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjetMode,
          interval: "10s",
          max: 50,
        }),
      ],
    })
  : null;

/**
 * WebSocket Arcjet instance for protecting WS connections.
 * Only initialized if ARCJET_KEY exists.
 *
 * Rules:
 * 1. Shield
 * 2. detectBot: blocks bots except search engines and preview services
 * 3. slidingWindow: rate-limiting (max 5 connections per 2s)
 */
export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

/**
 * Express middleware to protect HTTP routes using Arcjet.
 * Denies bots or requests exceeding rate limits.
 * If Arcjet is not configured, it simply calls next().
 */
export function securityMiddleware() {
  return async (req, res, next) => {
    // Skip Arcjet if not configured
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
