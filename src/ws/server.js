import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

/**
 * Send a JSON message to a single WebSocket client.
 * @param {WebSocket} socket - The WebSocket connection to send the message to.
 * @param {object} payload - The data object to send (will be converted to JSON).
 * @returns
 */
function sendJson(socket, payload) {
  // Only send if the socket is open
  if (socket.readyState !== WebSocket.OPEN) return;
  // Convert the payload to a JSON string and send it to the client
  socket.send(JSON.stringify(payload));
}

/**
 * Broadcast a JSON message to all connected clients.
 *
 * @param {WebSocketServer} wss - The WebSocket server instance (WebSocketServer).
 * @param {object} payload - The data to broadcast (will be converted to JSON).
 */
function broadcast(wss, payload) {
  for (const client of wss.clients) {
    // Only send to clients that are currently open
    if (client.readyState !== WebSocket.OPEN) continue;
    // Convert the payload to a JSON string and send it to the client
    client.send(JSON.stringify(payload));
  }
}

/**
 * Attach a WebSocket server to an existing HTTP server.
 * @param {import("http").Server} server
 * @returns {object} - Object with helper functions for broadcasting events
 */
export function attachWebSocketServer(server) {
  // Create a new WebSocket server that shares the same HTTP server
  const wss = new WebSocketServer({
    server, // Use the same HTTP server
    path: "/ws", // WebSocket clients connect to /ws
    maxPayload: 1024 * 1024, // Maximum message size: 1MB
  });

  /**
   * Periodically ping all clients to check if they are alive.
   * If a client doesn't respond with pong, terminate it.
   */
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Listen for new client connections
  wss.on("connection", async (socket, req) => {
    console.log("New WebSocket connection from:", req.socket.remoteAddress);

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Access denied";
          socket.close(code, reason);
        }
      } catch (err) {
        console.error(`Ws connection error ${err}`);
        socket.close(1011, "Server security error");
      }
    }

    // Mark socket as alive
    socket.isAlive = true;

    // Listen for pong messages from client
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    // Send a welcome message to the newly connected client
    sendJson(socket, {
      type: "welcome",
    });

    // Listen for errors on this socket
    socket.on("error", (err) => {
      console.error(err);
    });
  });

  // Clean up
  wss.on("close", () => {
    // Clear heartbeat interval when server closes
    clearInterval(heartbeatInterval);
  });

  /**
   * Broadcast a "match created" event to all connected clients.
   * @param {object} match - The match data to send
   */
  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  // Return helper functions we want to expose
  return { broadcastMatchCreated };
}
