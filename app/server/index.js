// Arena Papan - server multiplayer (Node.js + Colyseus)
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { SnakesLaddersRoom } = require("./rooms/SnakesLaddersRoom");
const { LudoRoom } = require("./rooms/LudoRoom");

const PORT = process.env.PORT || 2567;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, name: "arena-papan" }));

// TODO (roadmap): endpoint Hall of Fame global.
// POST /hof  -> simpan hasil match (divalidasi dari room, bukan dari client)
// GET  /hof  -> leaderboard lintas perangkat (simpan di Postgres/SQLite)

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer })
});

// Daftarkan room per game. Game baru = define() baru + file room baru.
gameServer.define("snakes_ladders", SnakesLaddersRoom);
// filterBy mode: pemain online hanya dipasangkan dengan mode kemenangan sama.
gameServer.define("ludo", LudoRoom).filterBy(["mode"]);
// gameServer.define("halma", HalmaRoom);

httpServer.listen(PORT, () =>
  console.log(`Arena Papan server jalan di ws://localhost:${PORT}`)
);
