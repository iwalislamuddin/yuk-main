// Bot Halma sisi server (untuk bot-fill mode online). PORT dari
// client/src/games/halma/LocalBotController.js — perilaku WAJIB identik.
// Halma itu balapan & rantai lompatan = satu langkah, jadi greedy 1-langkah
// dgn evaluasi bagus sudah kuat; lookahead 2-ply hanya pemecah-seri (hard).
const Halma = require("../logic/halma");

const { HOLES, NUM_HOLES, TARGET_HOLES, TOKENS_PER_PLAYER, legalMovesForPlayer } = Halma;

// Tabel jarak heks antar semua lubang (precompute).
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
  if (level === "easy") return -total;
  if (level === "normal") return inTarget * 50 - total;
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

// Pilih langkah bot index `idx`. `banned` = balikan langkah terakhir (anti-osilasi).
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
    if (r < 0.3) return pickRandom(moves);
    if (r < 0.55) return pickRandom(moves.slice(0, Math.min(3, moves.length)));
    return moves[0];
  }

  const best = moves[0].s;
  const tied = moves.filter((m) => m.s >= best - 1e-6);

  if (level === "normal") {
    if (Math.random() < 0.2 && moves.length > 2) return pickRandom(moves.slice(0, 3));
    return pickRandom(tied);
  }

  // hard: di antara langkah ber-tempo-terbaik, pilih follow-up terbaik.
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

module.exports = { pickBotMove };
