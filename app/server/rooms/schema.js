const { Schema, MapSchema, defineTypes } = require("@colyseus/schema");

class Player extends Schema {
  constructor() {
    super();
    this.name = "";
    this.pos = 0;
    this.isBot = false;
    this.disconnected = false; // terputus, dalam masa tenggang reconnect (B3)
  }
}
defineTypes(Player, {
  name: "string",
  pos: "number",
  isBot: "boolean",
  disconnected: "boolean"
});

class SnakesLaddersState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.currentTurn = "";
    this.lastDice = 0;
    this.winner = "";
    this.phase = "waiting"; // waiting | playing | finished
    this.code = ""; // kode room privat (4 digit) bila room privat; else ""
  }
}
defineTypes(SnakesLaddersState, {
  players: { map: Player },
  currentTurn: "string",
  lastDice: "number",
  winner: "string",
  phase: "string",
  code: "string"
});

module.exports = { Player, SnakesLaddersState };
