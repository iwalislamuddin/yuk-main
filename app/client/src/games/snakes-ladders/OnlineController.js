import { joinPublic, createPrivate, joinByCode } from "../../lib/online.js";

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

  // Matchmaking publik.
  async connect() {
    await joinPublic(this, "snakes_ladders", { name: this.playerName });
  }

  // Buat room privat (B3): roomId jadi kode undangan (lihat getCode()).
  async connectPrivate() {
    await createPrivate(this, "snakes_ladders", { name: this.playerName });
  }

  // Gabung room privat lewat kode.
  async connectByCode(code) {
    await joinByCode(this, code, { name: this.playerName });
  }

  // Kode undangan room (= roomId) untuk dibagikan saat buat room privat.
  getCode() {
    return this.room?.roomId || "";
  }

  mapState(state) {
    const players = [];
    state.players.forEach((p, id) =>
      players.push({
        id,
        name: p.name,
        pos: p.pos,
        isBot: p.isBot,
        disconnected: p.disconnected
      })
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

  // Status koneksi: "reconnecting" | "connected" | "lost" (untuk banner UI).
  onConnectionChange(cb) {
    this.statusCb = cb;
    if (this.connStatus) cb(this.connStatus);
  }

  requestRoll() {
    this.room?.send("roll");
  }

  dispose() {
    this.disposed = true; // cegah reconnect setelah keluar disengaja
    this.room?.leave();
    this.cb = null;
  }
}
