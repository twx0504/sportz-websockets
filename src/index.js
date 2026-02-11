import AgentAPI from "apminsight";
AgentAPI.config();
import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { commentaryRouter } from "./routes/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

// Port for both HTTP and WebSocket server
const PORT = Number(process.env.PORT || 8083);

/* HOST explanation:
   - "0.0.0.0": listen on all IPv4 addresses of the machine
   - "127.0.0.1": IPv4 localhost only
   - "::1": IPv6 localhost only
   - "::": listen on all IPv6 addresses, and IPv4-mapped addresses

   Note:
   - Using "0.0.0.0" may cause wscat or WS clients to fail if "localhost" resolves to an IPv6 address.
   - "::" ensures both IPv4 and IPv6 localhost connections work during development.
*/
const HOST = process.env.HOST || "::";

// Create Express app
const app = express();
// Create HTTP server from Express app so it can be shared with WebSocket
const server = http.createServer(app);

// ------------------------- Middleware -------------------------

// Built-in middleware to parse JSON request bodies
app.use(express.json());

// Global security / rate-limiting / bot protection middleware
// This will run before all routes and filter requests
// app.use(securityMiddleware());

// ------------------------- Routes -------------------------
// Routers are technically middleware that can have multiple routes inside

// Mount matchRouter on /matches path
app.use("/matches", matchRouter);

// Mount commentaryRouter on /matches/:id/commentary path
app.use("/matches/:id/commentary", commentaryRouter);

// Root route for testing / health check
app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

// ------------------------- WebSocket -------------------------

// Attach WebSocket server to the same HTTP server
// Returns helper functions, e.g., for broadcasting events
const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);

// Make broadcastMatchCreated & broadcastCommentary globally accessible via app.locals
// This allows other parts of the Express app (like routes) to broadcast events easily
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

// ------------------------- Server Startup -------------------------

// Start the HTTP server (and implicitly WebSocket server on same port)
server.listen(PORT, HOST, () => {
  // For development, if HOST is "::", show localhost in logs for clarity
  const baseUrl =
    HOST === "::" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
