import { Client } from "colyseus.js";
import { isFinished } from "./logic.js";

/**
 * Controller mode online Halma: terhubung ke room Colyseus "halma".
 * Server otoritatif — langkah divalidasi di server. Controller ini memetakan
 * state server ke bentuk view yang dipakai scene (identik dengan toView()).
 * Online = 2 pemain (sudut atas vs bawah).
 */
export class OnlineController {
  constructor(url, playerName, opts = {}) {
    this.url = url;
    this.playerName = playerName;
    this.winMode = opts.winMode === "ranking" ? "ranking" : "single";
    this.target = Number(opts.target) === 3 ? 3 : 2;
    this.cb = null;
    this.lastState = null;
  }

  async connect() {
    this.client = new Client(this.url);
    this.room = await this.client.joinOrCreate("halma", {
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
      const pieces = Array.from(p.pieces);
      players.push({
        id,
        name: p.name,
        isBot: p.isBot,
        seat: p.seat,
        pieces,
        finished: isFinished({ seat: p.seat, pieces })
      });
    });
    players.sort((a, b) => a.seat - b.seat);

    const myId = this.room?.sessionId;
    const me = players.find((p) => p.id === myId);
    const lastMove =
      state.lastTo >= 0
        ? {
            seat: state.lastSeat,
            from: state.lastFrom,
            to: state.lastTo,
            path: Array.from(state.lastPath)
          }
        : null;

    return {
      mode: state.mode || "single",
      playerCount: state.playerCount || 2,
      phase: state.phase,
      players,
      turnId: state.currentTurn,
      myId,
      mySeat: me ? me.seat : -1,
      myIndex: me ? players.indexOf(me) : -1,
      target: state.target || players.length,
      startsAt: state.startsAt || 0,
      lastMove,
      ranking: Array.from(state.ranking || []),
      winner: state.winner || null
    };
  }

  onUpdate(cb) {
    this.cb = cb;
    if (this.lastState) cb(this.lastState);
  }

  requestMove(from, to) {
    this.room?.send("move", { from, to });
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
