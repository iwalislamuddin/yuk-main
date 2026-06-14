import {
  createState,
  addPlayer,
  startGame,
  resetState,
  roll,
  move,
  toView,
  currentPlayer,
  ringCell,
  SAFE_CELLS,
  HOME_STEP,
  YARD,
  COLOR_NAMES
} from "./logic.js";

/**
 * Controller mode offline Ludo: kamu (Merah) melawan 3 bot.
 * Semua logika jalan di browser memakai logic.js yang sama dengan server,
 * jadi aturannya identik dengan mode online.
 *
 * Antarmukanya mengikuti pola controller Ular Tangga + dua tambahan untuk
 * Ludo: requestMove(tokenIndex) (memilih pion) dan view yang berisi tokens.
 */
export class LocalBotController {
  constructor(playerName, opts = {}) {
    this.myId = "me";
    const winMode = opts.winMode === "ranking" ? "ranking" : "single";
    this.state = createState(winMode);
    addPlayer(this.state, { id: "me", name: playerName, isBot: false });
    addPlayer(this.state, { id: "bot1", name: `Bot ${COLOR_NAMES[1]}`, isBot: true });
    addPlayer(this.state, { id: "bot2", name: `Bot ${COLOR_NAMES[2]}`, isBot: true });
    addPlayer(this.state, { id: "bot3", name: `Bot ${COLOR_NAMES[3]}`, isBot: true });
    startGame(this.state);

    this.cb = null;
    this.timer = null;
  }

  onUpdate(cb) {
    this.cb = cb;
    this.emit();
    this.scheduleBot();
  }

  emit() {
    this.cb?.(toView(this.state, this.myId));
  }

  isMyTurn() {
    return currentPlayer(this.state)?.id === this.myId;
  }

  requestRoll() {
    if (this.state.winner || !this.isMyTurn() || this.state.dicePending) return;
    roll(this.state);
    this.afterAction();
  }

  requestMove(tokenIndex) {
    if (this.state.winner || !this.isMyTurn() || !this.state.dicePending) return;
    move(this.state, tokenIndex);
    this.afterAction();
  }

  afterAction() {
    this.emit();
    this.scheduleBot();
  }

  // Jika giliran jatuh ke bot, jalankan langkahnya bertahap (dengan jeda
  // supaya animasinya kebaca). Bonus giliran bot ditangani rekursif.
  // Mode ranking: setelah kamu (manusia, index 0) selesai dan tinggal bot,
  // percepat permainan (jeda sangat pendek) — tak perlu ditonton lama.
  scheduleBot() {
    clearTimeout(this.timer);
    if (this.state.phase !== "playing" || this.state.winner) return;
    const player = currentPlayer(this.state);
    if (!player?.isBot) return;

    const turbo = this.state.mode === "ranking" && this.state.ranking.includes(0);
    const delay = turbo
      ? this.state.dicePending
        ? 90
        : 130
      : this.state.dicePending
        ? 650
        : 900;

    this.timer = setTimeout(() => {
      if (!this.state.dicePending) {
        roll(this.state);
      } else {
        move(this.state, this.pickBotToken());
      }
      this.afterAction();
    }, delay);
  }

  // Heuristik bot sederhana: utamakan makan lawan, lalu pulangkan pion,
  // lalu keluarkan pion dari kandang, sisanya majukan pion terdepan.
  pickBotToken() {
    const player = currentPlayer(this.state);
    const dice = this.state.lastDice;
    let best = this.state.legalTokens[0];
    let bestScore = -Infinity;

    for (const i of this.state.legalTokens) {
      const from = player.tokens[i];
      const to = from === YARD ? 0 : from + dice;
      const cell = ringCell(player.index, to);

      let capture = false;
      if (cell !== null && !SAFE_CELLS.has(cell)) {
        for (const other of this.state.players) {
          if (other.index === player.index) continue;
          if (other.tokens.some((op) => ringCell(other.index, op) === cell)) {
            capture = true;
          }
        }
      }

      const score =
        (capture ? 100 : 0) +
        (to === HOME_STEP ? 60 : 0) +
        (from === YARD ? 40 : 0) +
        to; // sisanya: dorong pion yang paling jauh

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  reset() {
    resetState(this.state);
    this.emit();
    this.scheduleBot();
  }

  dispose() {
    clearTimeout(this.timer);
    this.cb = null;
  }
}
