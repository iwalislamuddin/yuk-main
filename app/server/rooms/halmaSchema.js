const { Schema, MapSchema, ArraySchema, defineTypes } = require("@colyseus/schema");

class HalmaPlayer extends Schema {
  constructor() {
    super();
    this.name = "";
    this.isBot = false;
    this.seat = 0; // sudut papan (0..5)
    this.pieces = new ArraySchema(); // 10 id lubang
  }
}
defineTypes(HalmaPlayer, {
  name: "string",
  isBot: "boolean",
  seat: "number",
  pieces: ["number"]
});

class HalmaState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.currentTurn = ""; // sessionId pemain giliran ini
    this.winner = "";
    this.phase = "waiting"; // waiting | playing | finished
    this.mode = "single"; // single | ranking
    this.playerCount = 2;
    this.ranking = new ArraySchema(); // nama pemain urut finis
    // Langkah terakhir (untuk animasi di client).
    this.lastFrom = -1;
    this.lastTo = -1;
    this.lastSeat = -1;
    this.lastPath = new ArraySchema(); // jalur id lubang [from..to]
  }
}
defineTypes(HalmaState, {
  players: { map: HalmaPlayer },
  currentTurn: "string",
  winner: "string",
  phase: "string",
  mode: "string",
  playerCount: "number",
  ranking: ["string"],
  lastFrom: "number",
  lastTo: "number",
  lastSeat: "number",
  lastPath: ["number"]
});

module.exports = { HalmaPlayer, HalmaState };
