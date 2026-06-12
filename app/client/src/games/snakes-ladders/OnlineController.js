import { Client } from "colyseus.js";

/**
 * Controller mode online: terhubung ke room Colyseus di server.
 * Server adalah otoritas penuh: dadu dilempar dan divalidasi di server.
 */
export class OnlineController {
  constructor(url, playerName) {
    this.url = url;
    this.playerName = playerName;
    this.cb = null;
    this.lastState = null;
  }

  async connect() {
    this.client = new Client(this.url);
    this.room = await this.client.joinOrCreate("snakes_ladders", {
      name: this.playerName
    });
    this.room.onStateChange((state) => {
      this.lastState = this.mapState(state);
      this.cb?.(this.lastState);
    });
  }

  mapState(state) {
    const players = [];
    state.players.forEach((p, id) =>
      players.push({ id, name: p.name, pos: p.pos, isBot: p.isBot })
    );
    return {
      phase: state.phase,
      players,
      turnId: state.currentTurn,
      lastDice: state.lastDice,
      winner: state.winner || null,
      myId: this.room?.sessionId
    };
  }

  onUpdate(cb) {
    this.cb = cb;
    if (this.lastState) cb(this.lastState);
  }

  requestRoll() {
    this.room?.send("roll");
  }

  dispose() {
    this.room?.leave();
    this.cb = null;
  }
}
