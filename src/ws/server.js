import { WebSocketServer, WebSocket } from "ws";

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

  // Listen for new client connections
  wss.on("connection", (socket, request) => {
    console.log("New WebSocket connection from:", request.socket.remoteAddress);

    // Send a welcome message to the newly connected client
    sendJson(socket, {
      type: "welcome",
    });

    // Listen for errors on this socket
    socket.on("error", (err) => {
      console.error(err);
    });
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
