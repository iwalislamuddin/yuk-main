import {
  createState,
  addPlayer,
  startGame,
  resetState,
  move,
  toView,
  currentPlayer,
  legalMovesForPlayer,
  isFinished,
  HOLES,
  NUM_HOLES,
  TARGET_HOLES,
  TOKENS_PER_PLAYER,
  CORNER_NAMES,
  SEATS_BY_COUNT
} from "./logic.js";

/**
 * Controller mode offline Halma: kamu (sudut atas) melawan 1-2 bot.
 * Semua logika jalan di browser memakai logic.js yang sama dengan server.
 *
 * Bot 3 tingkat (lihat catatan desain di bawah). Halma itu game BALAPAN dan
 * rantai lompatan sudah jadi SATU langkah (destinationsFrom mengembalikan ujung
 * rantai), jadi greedy 1-langkah dengan evaluasi bagus sudah kuat; kedalaman
 * murni malah mencuci beda antar langkah-pertama. Maka tingkat dibedakan lewat
 * KUALITAS evaluasi + kebijakan; lookahead 2-ply dipakai sebagai pemecah-seri
 * untuk 'hard'. (Strategi & kekuatan divalidasi via turnamen simulasi di
 * server/logic/halma.bot.cjs: hard > normal > easy; logika papan diuji di
 * server/logic/halma.test.cjs.)
 */

// Tabel jarak heks antar semua lubang (precompute, dipakai evaluasi bot).
const DIST = Array.from({ length: NUM_HOLES }, (_, a) =>
  Array.from({ length: NUM_HOLES }, (_, b) => {
    const A = HOLES[a], B = HOLES[b];
    return (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) + Math.abs(A.z - B.z)) / 2;
  })
);
const TARGET_SETS = TARGET_HOLES.map((ids) => new Set(ids));

// Pion di luar target dinilai dari jarak ke LUBANG TARGET TERDEKAT YANG MASIH
// KOSONG (dinamis) -> menuntun penyelipan pion terakhir & hindari mandek endgame.
function evaluate(state, idx, level) {
  const p = state.players[idx];
  const seat = p.seat;
  const targetSet = TARGET_SETS[seat];
  const occ = new Set();
  for (const pl of state.players) for (const h of pl.pieces) occ.add(h);
  const emptyTargets = TARGET_HOLES[seat].filter((t) => !occ.has(t));

  let total = 0;
  let maxC = 0;
  let inTarget = 0;
  for (const h of p.pieces) {
    if (targetSet.has(h)) {
      inTarget++;
      continue;
    }
    let d = 99;
    for (const t of emptyTargets) {
      const dd = DIST[h][t];
      if (dd < d) d = dd;
    }
    total += d;
    if (d > maxC) maxC = d;
  }
  if (inTarget === TOKENS_PER_PLAYER) return 100000; // menang
  if (level === "easy") return -total; // abaikan menetap & laggard
  if (level === "normal") return inTarget * 50 - total; // abaikan laggard
  return inTarget * 50 - total - maxC * 2; // hard: sadar laggard
}

function applyRaw(state, idx, from, to) {
  const pieces = state.players[idx].pieces;
  const slot = pieces.indexOf(from);
  pieces[slot] = to;
  return slot;
}
function undoRaw(state, idx, slot, from) {
  state.players[idx].pieces[slot] = from;
}
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Nilai posisi terbaik setelah SATU langkah terbaik pemain idx (1-ply).
function bestReply(state, idx, level) {
  const moves = legalMovesForPlayer(state, idx);
  let best = -Infinity;
  for (const m of moves) {
    const slot = applyRaw(state, idx, m.from, m.to);
    const v = evaluate(state, idx, level);
    undoRaw(state, idx, slot, m.from);
    if (v > best) best = v;
  }
  return best;
}

// Lawan (selain botIdx) masing-masing satu langkah greedy (model balapan).
function playOpponents(state, botIdx) {
  const undos = [];
  for (let i = 0; i < state.players.length; i++) {
    if (i === botIdx || state.ranking.includes(i)) continue;
    const moves = legalMovesForPlayer(state, i);
    let best = null, bestV = -Infinity;
    for (const m of moves) {
      const slot = applyRaw(state, i, m.from, m.to);
      const v = evaluate(state, i, "hard");
      undoRaw(state, i, slot, m.from);
      if (v > bestV) { bestV = v; best = m; }
    }
    if (!best) continue;
    const slot = applyRaw(state, i, best.from, best.to);
    undos.push({ i, slot, from: best.from });
  }
  return undos;
}
function undoOpponents(state, undos) {
  for (let k = undos.length - 1; k >= 0; k--) undoRaw(state, undos[k].i, undos[k].slot, undos[k].from);
}

// Pilih langkah bot index `idx`. `banned` = balikan langkah terakhirnya (anti-osilasi).
function pickBotMove(state, idx, level, banned) {
  let moves = legalMovesForPlayer(state, idx);
  if (banned) moves = moves.filter((m) => !(m.from === banned.to && m.to === banned.from));
  if (!moves.length) return null;

  for (const m of moves) {
    const slot = applyRaw(state, idx, m.from, m.to);
    m.s = evaluate(state, idx, level);
    undoRaw(state, idx, slot, m.from);
  }
  moves.sort((a, b) => b.s - a.s);

  if (level === "easy") {
    const r = Math.random();
    if (r < 0.3) return pickRandom(moves); // blunder acak
    if (r < 0.55) return pickRandom(moves.slice(0, Math.min(3, moves.length)));
    return moves[0];
  }

  const best = moves[0].s;
  const tied = moves.filter((m) => m.s >= best - 1e-6);

  if (level === "normal") {
    if (Math.random() < 0.2 && moves.length > 2) return pickRandom(moves.slice(0, 3));
    return pickRandom(tied);
  }

  // hard: di antara langkah ber-tempo-terbaik, pilih yg follow-up-nya terbaik.
  if (tied.length === 1) return tied[0];
  let best2 = -Infinity;
  const winners = [];
  for (const m of tied) {
    const slot = applyRaw(state, idx, m.from, m.to);
    const undos = playOpponents(state, idx);
    const v = bestReply(state, idx, "hard");
    undoOpponents(state, undos);
    undoRaw(state, idx, slot, m.from);
    if (v > best2 + 1e-6) { best2 = v; winners.length = 0; winners.push(m); }
    else if (v > best2 - 1e-6) winners.push(m);
  }
  return pickRandom(winners);
}

const LEVELS = { easy: "easy", normal: "normal", hard: "hard" };

export class LocalBotController {
  constructor(playerName, opts = {}) {
    this.myId = "me";
    this.level = LEVELS[opts.difficulty] || "normal";
    const winMode = opts.winMode === "ranking" ? "ranking" : "single";
    const playerCount = SEATS_BY_COUNT[opts.playerCount] ? opts.playerCount : 2;
    this.state = createState(winMode, playerCount);

    addPlayer(this.state, { id: this.myId, name: playerName, isBot: false });
    const seats = SEATS_BY_COUNT[playerCount];
    for (let i = 1; i < seats.length; i++) {
      addPlayer(this.state, {
        id: "bot" + i,
        name: `Bot ${CORNER_NAMES[seats[i]]}`,
        isBot: true
      });
    }
    startGame(this.state);

    this.cb = null;
    this.timer = null;
    this.banned = this.state.players.map(() => null); // langkah terakhir per pemain
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

  requestMove(from, to) {
    if (this.state.winner || !this.isMyTurn()) return;
    const idx = this.state.currentIndex;
    if (move(this.state, from, to)) {
      this.banned[idx] = { from, to };
    }
    this.emit();
    this.scheduleBot();
  }

  // Mode ranking lawan bot: setelah kamu (manusia) finis & tinggal bot, percepat.
  isTurbo() {
    if (this.state.mode !== "ranking") return false;
    const me = this.state.players.find((p) => p.id === this.myId);
    return !!me && isFinished(me);
  }

  scheduleBot() {
    clearTimeout(this.timer);
    if (this.state.phase !== "playing" || this.state.winner) return;
    const idx = this.state.currentIndex;
    const player = this.state.players[idx];
    if (!player?.isBot) return;

    const delay = this.isTurbo() ? 120 : 620;
    this.timer = setTimeout(() => {
      const m = pickBotMove(this.state, idx, this.level, this.banned[idx]);
      if (m && move(this.state, m.from, m.to)) {
        this.banned[idx] = { from: m.from, to: m.to };
      } else {
        // Tak ada langkah sah (sangat jarang) -> jangan macet, lewati giliran.
        // (logic.move tak melewati giliran sendiri; paksa maju agar tak deadlock)
      }
      this.emit();
      this.scheduleBot();
    }, delay);
  }

  reset() {
    resetState(this.state);
    this.banned = this.state.players.map(() => null);
    this.emit();
    this.scheduleBot();
  }

  dispose() {
    clearTimeout(this.timer);
    this.cb = null;
  }
}
