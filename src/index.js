import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT || 8083);
/* HOST:
  "0.0.0.0": all IPv4 addresses on our machine
  "127.0.0.1": IPv4 localhost
  "::1": IPv6 localhost
  "::": all IPv6 (+IPv4) addresses

  -> Problem with "0.0.0.0": wscat -c "ws://localhost:PORT/ws" cannot work as localhost may be resolved using IPv6.
  -> Use "::" to make sure both localhost / 127.0.0.1 works as expected during development.
*/
const HOST = process.env.HOST || "::";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "::" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
