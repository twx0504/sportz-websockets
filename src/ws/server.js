import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

/**
 * Subscribe a WebSocket client to receive updates for a specific match.
 * @param {number} matchId - The ID of the match to subscribe to.
 * @param {WebSocket} socket - The WebSocket connection to subscribe.
 */
function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

/**
 * Unsubscribe a WebSocket client from receiving updates for a specific match.
 * @param {number} matchId - The ID of the match to unsubscribe from.
 * @param {WebSocket} socket - The WebSocket connection to unsubscribe.
 */
function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

/**
 * Remove all match subscriptions for a WebSocket client.
 * @param {WebSocket} socket - The WebSocket connection to clean up.
 */
function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

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
function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    // Only send to clients that are currently open
    if (client.readyState !== WebSocket.OPEN) continue;
    // Convert the payload to a JSON string and send it to the client
    client.send(JSON.stringify(payload));
  }
}

/**
 * Broadcast a JSON message to all clients subscribed to a specific match.
 * @param {number} matchId - The ID of the match to broadcast to.
 * @param {object} payload - The data to broadcast (will be converted to JSON).
 */
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Handle incoming WebSocket messages from a client.
 * @param {WebSocket} socket - The WebSocket connection that sent the message.
 * @param {Buffer|string} data - The raw message data received.
 * @returns
 */
function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (err) {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(m.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    return;
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
    noServer: true,
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

  /**
   * Handle WebSocket upgrade requests manually.
   * This allows us to run security checks before accepting connection.
   */
  server.on("upgrade", async (req, socket, head) => {
    let pathname;
    try {
      ({ pathname } = new URL(req.url, `http://${req.headers.host}`));
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Only allow upgrades to /ws path
    if (pathname !== "/ws") {
      // Send HTTP 404
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      // Close TCP socket
      socket.destroy();
      return;
    }

    // Run Arcjet protection/security check if available
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
          } else {
            socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          }
          socket.destroy();
          return;
        }
      } catch (err) {
        console.error("WS upgrade protection error", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    // If all checks pass, upgrade the HTTP connection to a WebSocket
    wss.handleUpgrade(req, socket, head, (ws) => {
      // Emit 'connection' event for the new WebSocket
      wss.emit("connection", ws, req);
    });
  });

  /**
   * Handle newly established WebSocket connections
   */
  wss.on("connection", async (socket, req) => {
    console.log("New WebSocket connection from:", req.socket.remoteAddress);

    // Mark socket as alive for heartbeat
    socket.isAlive = true;

    // Update alive status when receiving pong
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    // Keep what the socket is subscribed to
    socket.subscriptions = new Set();

    // Send a welcome message to the client
    sendJson(socket, {
      type: "welcome",
    });

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });

    // Listen for errors on this socket
    socket.on("error", (err) => {
      console.error(err);
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });
  });

  /**
   * Cleanup: stop heartbeat when WebSocket server closes
   */
  wss.on("close", () => {
    // Clear heartbeat interval when server closes
    clearInterval(heartbeatInterval);
  });

  /**
   * Broadcast a "match created" event to all connected clients.
   * @param {object} match - The match data to send
   */
  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  /**
   * Broadcast a commentary event to all clients subscribed to a specific match.
   * @param {number} matchId - The ID of the match the commentary is for.
   * @param {object} comment - The commentary data to broadcast.
   */
  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  // Return helper functions we want to expose
  return { broadcastMatchCreated, broadcastCommentary };
}
