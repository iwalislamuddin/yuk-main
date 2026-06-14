const { Room } = require("colyseus");
const { LudoPlayer, LudoState } = require("./ludoSchema");
const Ludo = require("../logic/ludo");

/**
 * Room Ludo. Server otoritatif:
 * - dadu dilempar di server, langkah divalidasi di server,
 * - state plain (Ludo.logic) jadi sumber kebenaran, lalu dicermin ke schema
 *   Colyseus supaya tersinkron ke semua client.
 *
 * Default 2 pemain agar match cepat penuh; naikkan maxClients ke 4 untuk
 * Ludo penuh (lihat catatan di onLeave soal pemain keluar di tengah main).
 */
class LudoRoom extends Room {
  onCreate(options) {
    this.maxClients = 2;
    const mode = options?.mode === "ranking" ? "ranking" : "single";
    this.logic = Ludo.createState(mode);
    this.setState(new LudoState());

    this.onMessage("roll", (client) => {
      if (!this.isTurn(client.sessionId)) return;
      Ludo.roll(this.logic);
      this.sync();
    });
    this.onMessage("move", (client, msg) => {
      if (!this.isTurn(client.sessionId)) return;
      Ludo.move(this.logic, Number(msg?.token));
      this.sync();
    });
  }

  isTurn(sessionId) {
    const p = Ludo.currentPlayer(this.logic);
    return this.logic.phase === "playing" && !this.logic.winner && p && p.id === sessionId;
  }

  onJoin(client, options) {
    Ludo.addPlayer(this.logic, {
      id: client.sessionId,
      name: String(options?.name || "Pemain").slice(0, 16),
      isBot: false
    });
    if (this.logic.players.length >= this.maxClients) {
      Ludo.startGame(this.logic);
      this.lock();
    }
    this.sync();
  }

  onLeave(client) {
    // Pemain keluar saat main: untuk room 2 pemain, pemain tersisa menang.
    // (Untuk 4 pemain perlu penanganan lebih halus — lihat catatan di atas.)
    if (this.logic.phase === "playing") {
      const others = this.logic.players.filter((p) => p.id !== client.sessionId);
      if (others.length === 1) {
        this.logic.phase = "finished";
        this.logic.winner = others[0].name;
        this.logic.dicePending = false;
        this.logic.legalTokens = [];
        this.sync();
      }
    }
  }

  // Cermin state plain -> schema Colyseus.
  sync() {
    const s = this.state;
    const L = this.logic;
    const active = L.phase === "playing" && !L.winner;

    s.phase = L.phase;
    s.currentTurn = active ? L.players[L.currentIndex].id : "";
    s.lastDice = L.lastDice;
    s.dicePending = L.dicePending;
    s.winner = L.winner || "";
    s.mode = L.mode;

    for (const p of L.players) {
      let sp = s.players.get(p.id);
      if (!sp) {
        sp = new LudoPlayer();
        s.players.set(p.id, sp);
      }
      sp.name = p.name;
      sp.isBot = p.isBot;
      sp.index = p.index;
      for (let i = 0; i < 4; i++) sp.tokens[i] = p.tokens[i];
    }

    s.legalTokens.splice(0);
    L.legalTokens.forEach((t) => s.legalTokens.push(t));

    s.ranking.splice(0);
    L.ranking.forEach((idx) => s.ranking.push(L.players[idx].name));
  }
}

module.exports = { LudoRoom };
