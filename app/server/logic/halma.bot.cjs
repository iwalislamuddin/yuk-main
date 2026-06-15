// Prototipe + turnamen bot Halma (validasi kekuatan & kecepatan).
// node app/server/logic/halma.bot.cjs
//
// Catatan desain: Halma itu game BALAPAN, dan rantai lompatan sudah jadi SATU
// langkah (destinationsFrom mengembalikan ujung rantai). Jadi greedy depth-1
// dengan evaluasi bagus sudah kuat; menambah kedalaman murni malah MENCUCI beda
// antar langkah-pertama (bot tetap maju tiap giliran) -> jadi acak/lemah.
// Maka 3 tingkat dibedakan lewat KUALITAS evaluasi + kebijakan, dan lookahead
// 2-ply dipakai hanya sebagai PEMECAH-SERI untuk 'hard' (tempo tetap primer).
const H = require("./halma");

const TARGET_SETS = H.TARGET_HOLES.map((ids) => new Set(ids));

// Tabel jarak heks antar semua lubang (precompute).
const N = H.NUM_HOLES;
const DIST = Array.from({ length: N }, (_, a) =>
  Array.from({ length: N }, (_, b) => {
    const A = H.HOLES[a], B = H.HOLES[b];
    return (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) + Math.abs(A.z - B.z)) / 2;
  })
);

// Evaluasi berdasar tingkat. Pion di luar target dinilai dari jarak ke LUBANG
// TARGET TERDEKAT YANG MASIH KOSONG (dinamis) -> menuntun penyelipan pion terakhir
// dengan presisi & menghindari mandek di endgame. Pion yg sudah di target = biaya 0.
//   easy   : -total saja (abaikan menetap & laggard) -> mudah keliru.
//   normal : inTarget*50 - total (abaikan laggard -> cenderung tinggalkan 1 pion).
//   hard   : inTarget*50 - total - maxC*2 (sadar laggard, jaga rombongan rapat).
function evaluate(state, idx, level) {
  const p = state.players[idx];
  const seat = p.seat;
  const targetSet = TARGET_SETS[seat];
  const occ = new Set();
  for (const pl of state.players) for (const h of pl.pieces) occ.add(h);
  const emptyTargets = H.TARGET_HOLES[seat].filter((t) => !occ.has(t));

  let total = 0;
  let maxC = 0;
  let inTarget = 0;
  for (const h of p.pieces) {
    if (targetSet.has(h)) {
      inTarget++;
      continue; // sudah menetap -> biaya 0
    }
    let d = 99;
    for (const t of emptyTargets) {
      const dd = DIST[h][t];
      if (dd < d) d = dd;
    }
    total += d;
    if (d > maxC) maxC = d;
  }
  if (inTarget === H.TOKENS_PER_PLAYER) return 100000; // menang
  if (level === "easy") return -total;
  if (level === "normal") return inTarget * 50 - total;
  return inTarget * 50 - total - maxC * 2; // hard
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

// Langkah sah, dilarang membalik langkah terakhir pion yg sama (anti-osilasi).
function genMoves(state, idx, banned) {
  let moves = H.legalMovesForPlayer(state, idx);
  if (banned) moves = moves.filter((m) => !(m.from === banned.to && m.to === banned.from));
  return moves;
}

// Nilai posisi terbaik setelah SATU langkah terbaik pemain idx (1-ply).
function bestReply(state, idx, level) {
  const moves = H.legalMovesForPlayer(state, idx);
  let best = -Infinity;
  for (const m of moves) {
    const slot = applyRaw(state, idx, m.from, m.to);
    const v = evaluate(state, idx, level);
    undoRaw(state, idx, slot, m.from);
    if (v > best) best = v;
  }
  return best;
}

// Lawan (semua kecuali botIdx) masing-masing satu langkah greedy (model balapan).
function playOpponents(state, botIdx) {
  const undos = [];
  for (let i = 0; i < state.players.length; i++) {
    if (i === botIdx) continue;
    if (state.ranking && state.ranking.includes(i)) continue;
    const moves = H.legalMovesForPlayer(state, i);
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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Pemilih langkah per tingkat kesulitan.
function pickMove(state, idx, level, banned) {
  const moves = genMoves(state, idx, banned);
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
    // Kadang ambil non-terbaik (sedikit cacat) supaya lebih lemah dari hard.
    if (Math.random() < 0.2 && moves.length > 2) return pickRandom(moves.slice(0, 3));
    return pickRandom(tied);
  }

  // hard: di antara langkah ber-tempo-terbaik, pilih yg follow-up-nya terbaik
  // (lookahead 2-ply sebagai pemecah-seri; tempo tetap primer -> tak tercuci).
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

// ---------- Turnamen: adu dua tingkat kesulitan ----------
function playMatch(diffA, diffB, maxMoves = 1500) {
  const state = H.createState("single", 2);
  H.addPlayer(state, { id: "A", name: "A", isBot: true });
  H.addPlayer(state, { id: "B", name: "B", isBot: true });
  H.startGame(state);
  const diffs = [diffA, diffB];
  const banned = [null, null];
  let moves = 0;
  while (state.phase === "playing" && moves < maxMoves) {
    const idx = state.currentIndex;
    const m = pickMove(state, idx, diffs[idx], banned[idx]);
    if (!m) break;
    banned[idx] = { from: m.from, to: m.to };
    H.move(state, m.from, m.to);
    moves++;
  }
  return { winner: state.winner, moves, finished: state.phase === "finished" };
}

function tournament(diffA, diffB, n) {
  let aWins = 0, bWins = 0, draws = 0, totalMoves = 0;
  for (let i = 0; i < n; i++) {
    const swap = i % 2 === 1; // tukar yg jalan duluan agar adil
    const r = playMatch(swap ? diffB : diffA, swap ? diffA : diffB);
    totalMoves += r.moves;
    if (!r.finished) draws++;
    else {
      const winnerIsA = (r.winner === "A") !== swap;
      if (winnerIsA) aWins++;
      else bWins++;
    }
  }
  console.log(
    `${diffA} vs ${diffB} (${n}x): ${diffA} ${aWins} - ${bWins} ${diffB}` +
      (draws ? ` (${draws} seri/timeout)` : "") +
      `  | rata2 ${(totalMoves / n).toFixed(0)} langkah`
  );
}

console.log("Turnamen kekuatan bot (2 pemain, single):");
const t0 = Date.now();
tournament("normal", "normal", 20); // cek konvergensi (harus selesai)
tournament("normal", "easy", 24);
tournament("hard", "easy", 24);
tournament("hard", "normal", 30);
console.log(`Waktu total: ${Date.now() - t0} ms`);

// Kecepatan berpikir 'hard' di posisi awal 3 pemain.
{
  const state = H.createState("single", 3);
  ["A", "B", "C"].forEach((id) => H.addPlayer(state, { id, name: id, isBot: true }));
  H.startGame(state);
  const t = Date.now();
  let iter = 0;
  while (Date.now() - t < 300) { pickMove(state, 0, "hard", null); iter++; }
  console.log(`Kecepatan 'hard' (3p): ${((Date.now() - t) / iter).toFixed(2)} ms/langkah`);
}
