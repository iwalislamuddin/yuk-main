import { joinPublic, createPrivate, joinByCode } from "../../lib/online.js";

/**
 * Controller mode online Ludo: terhubung ke room Colyseus "ludo".
 * Server adalah otoritas penuh — dadu dilempar & langkah divalidasi di server.
 * Controller ini hanya memetakan state server ke bentuk view yang dipakai scene
 * (bentuknya dijaga identik dengan toView() di logic.js).
 */
export class OnlineController {
  constructor(url, playerName, opts = {}) {
    this.url = url;
    this.playerName = playerName;
    this.winMode = opts.winMode === "ranking" ? "ranking" : "single";
    const t = Number(opts.target);
    this.target = t >= 2 && t <= 4 ? t : 2;
    this.cb = null;
    this.lastState = null;
  }

  // Matchmaking publik (konfigurasi dipatok server).
  async connect() {
    await joinPublic(this, "ludo", { name: this.playerName });
  }

  // Buat room privat (B3): roomId jadi kode undangan (lihat getCode()).
  async connectPrivate() {
    await createPrivate(this, "ludo", { name: this.playerName });
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
    state.players.forEach((p, id) => {
      const tokens = [p.tokens[0], p.tokens[1], p.tokens[2], p.tokens[3]];
      players.push({
        id,
        name: p.name,
        isBot: p.isBot,
        disconnected: p.disconnected,
        color: p.index,
        tokens,
        finished: tokens.every((t) => t === 56)
      });
    });
    // Urutkan stabil berdasar warna/kursi supaya rendering konsisten.
    players.sort((a, b) => a.color - b.color);

    const myId = this.room?.sessionId;
    const me = players.find((p) => p.id === myId);
    return {
      mode: state.mode || "single",
      phase: state.phase,
      players,
      turnId: state.currentTurn,
      myId,
      myIndex: me ? me.color : -1,
      target: state.target || players.length,
      startsAt: state.startsAt || 0,
      lastDice: state.lastDice,
      dicePending: state.dicePending,
      legalTokens: Array.from(state.legalTokens || []),
      ranking: Array.from(state.ranking || []),
      winner: state.winner || null
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

  requestMove(tokenIndex) {
    this.room?.send("move", { token: tokenIndex });
  }

  // Host menekan "Mulai sekarang" saat menunggu: isi sisa kursi dgn bot.
  requestStart() {
    this.room?.send("startNow");
  }

  dispose() {
    this.disposed = true; // cegah reconnect setelah keluar disengaja
    this.room?.leave();
    this.cb = null;
  }
}
