// Logika inti Ludo (sisi server - otoritatif).
// PENTING: jaga agar IDENTIK dengan client/src/games/ludo/logic.js.
//
// Model posisi token (progress), satu angka per pion:
//   -1            : di kandang (yard), belum jalan
//   0..50         : di lintasan utama (ring 52 kotak). Kotak global papan =
//                   (START_INDEX[pemain] + progress) % 52
//   51..55        : di jalur pulang (home column) milik pemain (5 kotak)
//   56            : SAMPAI RUMAH (pusat) — pion selesai

const TOKENS_PER_PLAYER = 4;
const RING = 52;
const START_INDEX = [0, 13, 26, 39];
const LAST_RING_STEP = 50;
const HOME_STEP = 56;
const YARD = -1;

const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const PLAYER_COLORS = [0xdc2626, 0x16a34a, 0xeab308, 0x2563eb];
const COLOR_NAMES = ["Merah", "Hijau", "Kuning", "Biru"];

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function ringCell(playerIndex, progress) {
  if (progress < 0 || progress > LAST_RING_STEP) return null;
  return (START_INDEX[playerIndex] + progress) % RING;
}

// mode "single"  = pemain pertama yang menyelesaikan 4 pion menang, game selesai.
// mode "ranking" = lanjut sampai semua kebagian peringkat (juara 1..N).
function createState(mode = "single") {
  return {
    mode,
    phase: "waiting",
    players: [],
    currentIndex: 0,
    lastDice: 0,
    dicePending: false,
    legalTokens: [],
    sixStreak: 0,
    ranking: [],
    winner: null
  };
}

// `seat` = warna/kursi papan (0..3). Bila tak diberikan, pakai urutan gabung
// (default 0,1,2,3). Memisahkan seat dari posisi-array dipakai untuk menempatkan
// 2 pemain (online 1v1) di sudut DIAGONAL (mis. seat 0 vs 2), bukan bersebelahan.
function addPlayer(state, { id, name, isBot = false, seat }) {
  const index = seat === undefined ? state.players.length : seat;
  state.players.push({
    id,
    name,
    isBot,
    index,
    tokens: [YARD, YARD, YARD, YARD]
  });
  return index;
}

function startGame(state) {
  state.phase = "playing";
  state.currentIndex = 0;
  state.lastDice = 0;
  state.dicePending = false;
  state.legalTokens = [];
  state.sixStreak = 0;
  state.ranking = [];
  state.winner = null;
  // state.mode sengaja TIDAK direset (dipertahankan saat main lagi).
}

function isFinished(player) {
  return player.tokens.every((p) => p === HOME_STEP);
}

function resetState(state) {
  state.players.forEach((p) => (p.tokens = [YARD, YARD, YARD, YARD]));
  startGame(state);
}

function currentPlayer(state) {
  return state.players[state.currentIndex];
}

function legalTokenIndices(player, dice) {
  if (!dice) return [];
  const legal = [];
  player.tokens.forEach((p, i) => {
    if (p === HOME_STEP) return;
    if (p === YARD) {
      if (dice === 6) legal.push(i);
      return;
    }
    if (p + dice <= HOME_STEP) legal.push(i);
  });
  return legal;
}

function advanceTurn(state) {
  // Lewati pemain yang sudah finis (mode ranking).
  if (state.ranking.length >= state.players.length) return;
  let next = state.currentIndex;
  do {
    next = (next + 1) % state.players.length;
  } while (state.ranking.includes(next));
  state.currentIndex = next;
}

function resolveMove(state, tokenIndex) {
  const player = currentPlayer(state);
  const from = player.tokens[tokenIndex];
  const to = from === YARD ? 0 : from + state.lastDice;
  player.tokens[tokenIndex] = to;

  let captured = false;
  const cell = ringCell(player.index, to);
  if (cell !== null && !SAFE_CELLS.has(cell)) {
    for (const other of state.players) {
      if (other.index === player.index) continue;
      other.tokens.forEach((op, oi) => {
        if (ringCell(other.index, op) === cell) {
          other.tokens[oi] = YARD;
          captured = true;
        }
      });
    }
  }
  return { captured, reachedHome: to === HOME_STEP };
}

function commitMove(state, tokenIndex) {
  const player = currentPlayer(state);
  const dice = state.lastDice;
  const { captured, reachedHome } = resolveMove(state, tokenIndex);
  state.dicePending = false;
  state.legalTokens = [];

  // ranking menyimpan POSISI-ARRAY pemain (bukan seat) agar konsisten dengan
  // advanceTurn/toView/winner — penting saat seat != posisi-array (2p diagonal).
  const justFinished = isFinished(player);
  if (justFinished && !state.ranking.includes(state.currentIndex)) {
    state.ranking.push(state.currentIndex);
  }

  if (state.mode === "single") {
    if (justFinished) {
      state.phase = "finished";
      state.winner = player.name;
      state.sixStreak = 0;
      return;
    }
  } else {
    const remaining = state.players
      .map((_, i) => i)
      .filter((i) => !state.ranking.includes(i));
    if (remaining.length <= 1) {
      if (remaining.length === 1) state.ranking.push(remaining[0]); // juru kunci
      state.phase = "finished";
      state.winner = state.players[state.ranking[0]].name; // juara 1
      state.sixStreak = 0;
      return;
    }
  }

  // Pemain yang baru finis tidak dapat bonus (tak ada pion tersisa).
  const extra = !justFinished && (dice === 6 || captured || reachedHome);
  if (extra) {
    if (dice !== 6) state.sixStreak = 0;
  } else {
    state.sixStreak = 0;
    advanceTurn(state);
  }
}

function roll(state) {
  if (state.phase !== "playing" || state.dicePending) return;
  const dice = rollDie();
  state.lastDice = dice;

  if (dice === 6) {
    state.sixStreak += 1;
    if (state.sixStreak >= 3) {
      state.sixStreak = 0;
      advanceTurn(state);
      return;
    }
  }

  const legal = legalTokenIndices(currentPlayer(state), dice);
  if (legal.length === 0) {
    state.sixStreak = 0;
    advanceTurn(state);
    return;
  }
  if (legal.length === 1) {
    commitMove(state, legal[0]);
    return;
  }
  state.dicePending = true;
  state.legalTokens = legal;
}

function move(state, tokenIndex) {
  if (state.phase !== "playing" || !state.dicePending) return;
  if (!state.legalTokens.includes(tokenIndex)) return;
  commitMove(state, tokenIndex);
}

function toView(state, myId) {
  const me = state.players.find((p) => p.id === myId);
  const active = state.phase === "playing" && !state.winner;
  return {
    mode: state.mode,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      color: p.index,
      tokens: p.tokens.slice(),
      finished: isFinished(p)
    })),
    turnId: active ? state.players[state.currentIndex].id : "",
    myId,
    myIndex: me ? me.index : -1,
    lastDice: state.lastDice,
    dicePending: state.dicePending,
    legalTokens: state.legalTokens.slice(),
    ranking: state.ranking.map((idx) => state.players[idx].name),
    winner: state.winner
  };
}

module.exports = {
  TOKENS_PER_PLAYER,
  RING,
  START_INDEX,
  LAST_RING_STEP,
  HOME_STEP,
  YARD,
  SAFE_CELLS,
  PLAYER_COLORS,
  COLOR_NAMES,
  rollDie,
  ringCell,
  createState,
  addPlayer,
  startGame,
  isFinished,
  resetState,
  currentPlayer,
  legalTokenIndices,
  roll,
  move,
  toView
};
