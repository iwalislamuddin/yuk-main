const { Schema, MapSchema, defineTypes } = require("@colyseus/schema");

class Player extends Schema {
  constructor() {
    super();
    this.name = "";
    this.pos = 0;
    this.isBot = false;
  }
}
defineTypes(Player, {
  name: "string",
  pos: "number",
  isBot: "boolean"
});

class SnakesLaddersState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.currentTurn = "";
    this.lastDice = 0;
    this.winner = "";
    this.phase = "waiting"; // waiting | playing | finished
  }
}
defineTypes(SnakesLaddersState, {
  players: { map: Player },
  currentTurn: "string",
  lastDice: "number",
  winner: "string",
  phase: "string"
});

module.exports = { Player, SnakesLaddersState };
