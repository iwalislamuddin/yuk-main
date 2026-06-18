import { Client } from "colyseus.js";

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

  async connect() {
    this.client = new Client(this.url);
    // mode + target jadi kriteria matchmaking (lihat filterBy di server).
    this.room = await this.client.joinOrCreate("ludo", {
      name: this.playerName,
      mode: this.winMode,
      target: this.target
    });
    this.room.onStateChange((state) => {
      this.lastState = this.mapState(state);
      this.cb?.(this.lastState);
    });
  }

  mapState(state) {
    const players = [];
    state.players.forEach((p, id) => {
      const tokens = [p.tokens[0], p.tokens[1], p.tokens[2], p.tokens[3]];
      players.push({
        id,
        name: p.name,
        isBot: p.isBot,
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
    this.room?.leave();
    this.cb = null;
  }
}
