import { applyMove, rollDice, FINISH } from "./logic.js";

/**
 * Controller mode offline: kamu vs bot, semua logika jalan di browser.
 * Antarmukanya sama dengan OnlineController sehingga scene Phaser
 * tidak perlu tahu sedang main offline atau online.
 */
export class LocalBotController {
  constructor(playerName) {
    this.players = [
      { id: "me", name: playerName, pos: 0, isBot: false },
      { id: "bot", name: "Bot Dadu", pos: 0, isBot: true }
    ];
    this.turnIndex = 0;
    this.lastDice = 0;
    this.winner = null;
    this.cb = null;
    this.botTimer = null;
  }

  onUpdate(cb) {
    this.cb = cb;
    this.emit();
  }

  emit() {
    this.cb?.({
      phase: "playing",
      players: this.players.map((p) => ({ ...p })),
      turnId: this.winner ? "" : this.players[this.turnIndex].id,
      lastDice: this.lastDice,
      winner: this.winner,
      myId: "me"
    });
  }

  requestRoll() {
    if (this.winner) return;
    if (this.players[this.turnIndex].id !== "me") return;
    this.step();
  }

  step() {
    const player = this.players[this.turnIndex];
    this.lastDice = rollDice();
    player.pos = applyMove(player.pos, this.lastDice);

    if (player.pos === FINISH) {
      this.winner = player.name;
    } else {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      if (this.players[this.turnIndex].isBot) {
        this.botTimer = setTimeout(() => this.step(), 1100);
      }
    }
    this.emit();
  }

  reset() {
    clearTimeout(this.botTimer);
    this.players.forEach((p) => (p.pos = 0));
    this.turnIndex = 0;
    this.lastDice = 0;
    this.winner = null;
    this.emit();
  }

  dispose() {
    clearTimeout(this.botTimer);
    this.cb = null;
  }
}
