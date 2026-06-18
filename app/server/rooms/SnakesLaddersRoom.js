const { Room } = require("colyseus");
const { Player, SnakesLaddersState } = require("./schema");
const { applyMove, rollDice, FINISH } = require("../logic/snakesLadders");
const hof = require("../hof/store");

/**
 * Room Ular Tangga. Server otoritatif:
 * - dadu dilempar di server (client tidak bisa curang),
 * - giliran divalidasi di server,
 * - state otomatis tersinkron ke semua client lewat Colyseus.
 */
class SnakesLaddersRoom extends Room {
  onCreate() {
    this.maxClients = 2; // naikkan ke 4 untuk mendukung lebih banyak pemain
    this.setState(new SnakesLaddersState());
    this.turnOrder = [];

    this.onMessage("roll", (client) => this.handleRoll(client.sessionId));
  }

  onJoin(client, options) {
    const player = new Player();
    player.name = String(options?.name || "Pemain").slice(0, 16);
    this.state.players.set(client.sessionId, player);
    this.turnOrder.push(client.sessionId);

    // Metadata untuk lobi (GET /lobby): host = pemain pertama.
    if (this.turnOrder.length === 1) {
      this.setMetadata({ gameId: "ular-tangga", host: player.name, mode: "single" });
    }

    if (this.turnOrder.length >= this.maxClients) this.startGame();
  }

  startGame() {
    this.state.phase = "playing";
    this.state.currentTurn = this.turnOrder[0];
    this.lock(); // room penuh, jangan terima pemain baru
  }

  handleRoll(sessionId) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== sessionId) return; // bukan gilirannya
    const player = this.state.players.get(sessionId);
    if (!player) return;

    const dice = rollDice();
    this.state.lastDice = dice;
    player.pos = applyMove(player.pos, dice);

    if (player.pos === FINISH) {
      this.state.winner = player.name;
      this.state.phase = "finished";
      this.state.currentTurn = "";
      this.recordFinish();
      return;
    }

    const idx = this.turnOrder.indexOf(sessionId);
    this.state.currentTurn = this.turnOrder[(idx + 1) % this.turnOrder.length];
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.turnOrder = this.turnOrder.filter((id) => id !== client.sessionId);

    // Lawan kabur saat main -> pemain tersisa menang.
    if (this.state.phase === "playing" && this.turnOrder.length === 1) {
      const last = this.state.players.get(this.turnOrder[0]);
      if (last) {
        this.state.winner = last.name;
        this.state.phase = "finished";
        this.state.currentTurn = "";
        this.recordFinish();
      }
    }
  }

  // Catat hasil match ke Hall of Fame global (sekali per match, otoritatif).
  recordFinish() {
    if (this.recorded) return;
    this.recorded = true;
    const players = [];
    this.state.players.forEach((p) => players.push({ name: p.name }));
    hof
      .recordMatch({ gameId: "ular-tangga", players, winnerName: this.state.winner })
      .catch((e) => console.error("[hof] catat ular-tangga gagal:", e.message));
  }
}

module.exports = { SnakesLaddersRoom };
