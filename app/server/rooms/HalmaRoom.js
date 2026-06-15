const { Room } = require("colyseus");
const { HalmaPlayer, HalmaState } = require("./halmaSchema");
const Halma = require("../logic/halma");

/**
 * Room Halma. Server otoritatif: langkah divalidasi di server (logic Halma jadi
 * sumber kebenaran, lalu dicermin ke schema Colyseus). Online = 2 pemain
 * (sudut atas vs bawah). filterBy mode supaya dipasangkan dgn mode kemenangan sama.
 */
class HalmaRoom extends Room {
  onCreate(options) {
    this.maxClients = 2;
    const mode = options?.mode === "ranking" ? "ranking" : "single";
    this.logic = Halma.createState(mode, 2);
    this.setState(new HalmaState());

    this.onMessage("move", (client, msg) => {
      if (!this.isTurn(client.sessionId)) return;
      Halma.move(this.logic, Number(msg?.from), Number(msg?.to));
      this.sync();
    });
  }

  isTurn(sessionId) {
    const p = Halma.currentPlayer(this.logic);
    return this.logic.phase === "playing" && !this.logic.winner && p && p.id === sessionId;
  }

  onJoin(client, options) {
    Halma.addPlayer(this.logic, {
      id: client.sessionId,
      name: String(options?.name || "Pemain").slice(0, 16),
      isBot: false
    });
    if (this.logic.players.length >= this.maxClients) {
      Halma.startGame(this.logic);
      this.lock();
    }
    this.sync();
  }

  onLeave(client) {
    // Room 2 pemain: bila satu keluar saat main, yang tersisa menang.
    if (this.logic.phase === "playing") {
      const others = this.logic.players.filter((p) => p.id !== client.sessionId);
      if (others.length === 1) {
        this.logic.phase = "finished";
        this.logic.winner = others[0].name;
        this.sync();
      }
    }
  }

  sync() {
    const s = this.state;
    const L = this.logic;
    const active = L.phase === "playing" && !L.winner;

    s.phase = L.phase;
    s.currentTurn = active ? L.players[L.currentIndex].id : "";
    s.winner = L.winner || "";
    s.mode = L.mode;
    s.playerCount = L.playerCount;

    for (const p of L.players) {
      let sp = s.players.get(p.id);
      if (!sp) {
        sp = new HalmaPlayer();
        s.players.set(p.id, sp);
      }
      sp.name = p.name;
      sp.isBot = p.isBot;
      sp.seat = p.seat;
      sp.pieces.splice(0);
      p.pieces.forEach((h) => sp.pieces.push(h));
    }

    s.ranking.splice(0);
    L.ranking.forEach((idx) => s.ranking.push(L.players[idx].name));

    const lm = L.lastMove;
    s.lastFrom = lm ? lm.from : -1;
    s.lastTo = lm ? lm.to : -1;
    s.lastSeat = lm ? lm.seat : -1;
    s.lastPath.splice(0);
    if (lm) lm.path.forEach((h) => s.lastPath.push(h));
  }
}

module.exports = { HalmaRoom };
