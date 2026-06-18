const { Schema, MapSchema, ArraySchema, defineTypes } = require("@colyseus/schema");

class LudoPlayer extends Schema {
  constructor() {
    super();
    this.name = "";
    this.isBot = false;
    this.index = 0; // kursi/warna 0..3
    this.tokens = new ArraySchema(-1, -1, -1, -1); // progress 4 pion
  }
}
defineTypes(LudoPlayer, {
  name: "string",
  isBot: "boolean",
  index: "number",
  tokens: ["number"]
});

class LudoState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.currentTurn = ""; // sessionId pemain giliran ini
    this.lastDice = 0;
    this.dicePending = false;
    this.winner = "";
    this.phase = "waiting"; // waiting | playing | finished
    this.mode = "single"; // single | ranking
    this.target = 2; // jumlah pemain target room (2..4)
    this.startsAt = 0; // epoch ms akhir countdown standby (0 = tak ada)
    this.legalTokens = new ArraySchema(); // pion sah utk pemain giliran ini
    this.ranking = new ArraySchema(); // nama pemain urut finis (juara 1 dulu)
  }
}
defineTypes(LudoState, {
  players: { map: LudoPlayer },
  currentTurn: "string",
  lastDice: "number",
  dicePending: "boolean",
  winner: "string",
  phase: "string",
  mode: "string",
  target: "number",
  startsAt: "number",
  legalTokens: ["number"],
  ranking: ["string"]
});

module.exports = { LudoPlayer, LudoState };
