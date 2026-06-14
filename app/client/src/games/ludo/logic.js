// Logika inti Ludo (sisi client, untuk mode lawan bot offline).
// PENTING: jaga agar IDENTIK dengan server/logic/ludo.js.
//
// Model posisi token (progress), satu angka per pion:
//   -1            : di kandang (yard), belum jalan
//   0..50         : di lintasan utama (ring 52 kotak). Kotak global papan =
//                   (START_INDEX[pemain] + progress) % 52
//   51..55        : di jalur pulang (home column) milik pemain (5 kotak)
//   56            : SAMPAI RUMAH (pusat) — pion selesai
//
// Semua fungsi di sini murni-data (tanpa pixel). Pemetaan ke koordinat
// layar ada di LudoScene.js. Logika dipakai langsung oleh LocalBotController
// (offline) dan oleh server (online) lewat salinan kembarannya.

export const TOKENS_PER_PLAYER = 4;
export const RING = 52; // jumlah kotak lintasan utama
export const START_INDEX = [0, 13, 26, 39]; // kotak masuk tiap pemain
export const LAST_RING_STEP = 50; // progress ring terakhir sebelum jalur pulang
export const HOME_STEP = 56; // progress = sampai rumah (pusat)
export const YARD = -1;

// Kotak aman: pion tidak bisa dimakan di sini. 4 kotak start + 4 kotak bintang.
export const SAFE_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Warna & nama tiap pemain (index 0..3). Dipakai untuk tampilan.
export const PLAYER_COLORS = [0xdc2626, 0x16a34a, 0xeab308, 0x2563eb];
export const COLOR_NAMES = ["Merah", "Hijau", "Kuning", "Biru"];

export function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

// Kotak global ring untuk satu langkah; null bila di kandang/jalur pulang/rumah.
export function ringCell(playerIndex, progress) {
  if (progress < 0 || progress > LAST_RING_STEP) return null;
  return (START_INDEX[playerIndex] + progress) % RING;
}

// ---------- Bentukan & siklus hidup state ----------

// mode "single"  = pemain pertama yang menyelesaikan 4 pion menang, game selesai.
// mode "ranking" = lanjut sampai semua kebagian peringkat (juara 1..N).
export function createState(mode = "single") {
  return {
    mode,
    phase: "waiting", // waiting | playing | finished
    players: [], // { id, name, isBot, index, tokens: [-1,-1,-1,-1] }
    currentIndex: 0,
    lastDice: 0,
    dicePending: false, // true = sudah lempar, menunggu pilih pion
    legalTokens: [], // pion yang boleh dijalankan giliran ini
    sixStreak: 0, // hitung 6 beruntun (tiga kali 6 = hangus)
    ranking: [], // index pemain urut finis (juara 1 = ranking[0])
    winner: null
  };
}

export function addPlayer(state, { id, name, isBot = false }) {
  const index = state.players.length;
  state.players.push({
    id,
    name,
    isBot,
    index,
    tokens: [YARD, YARD, YARD, YARD]
  });
  return index;
}

export function startGame(state) {
  state.phase = "playing";
  state.currentIndex = 0;
  state.lastDice = 0;
  state.dicePending = false;
  state.legalTokens = [];
  state.sixStreak = 0;
  state.ranking = [];
  state.winner = null;
  // catatan: state.mode sengaja TIDAK direset (dipertahankan saat main lagi).
}

export function isFinished(player) {
  return player.tokens.every((p) => p === HOME_STEP);
}

export function resetState(state) {
  state.players.forEach((p) => (p.tokens = [YARD, YARD, YARD, YARD]));
  startGame(state);
}

export function currentPlayer(state) {
  return state.players[state.currentIndex];
}

// ---------- Aturan langkah ----------

// Pion mana yang sah dijalankan pemain ini dengan nilai dadu tertentu.
export function legalTokenIndices(player, dice) {
  if (!dice) return [];
  const legal = [];
  player.tokens.forEach((p, i) => {
    if (p === HOME_STEP) return; // sudah selesai
    if (p === YARD) {
      if (dice === 6) legal.push(i); // keluar kandang wajib dadu 6
      return;
    }
    if (p + dice <= HOME_STEP) legal.push(i); // tidak boleh lewat rumah
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

// Terapkan perpindahan satu pion; kembalikan { captured, reachedHome }.
function resolveMove(state, tokenIndex) {
  const player = currentPlayer(state);
  const from = player.tokens[tokenIndex];
  const to = from === YARD ? 0 : from + state.lastDice;
  player.tokens[tokenIndex] = to;

  let captured = false;
  const cell = ringCell(player.index, to);
  if (cell !== null && !SAFE_CELLS.has(cell)) {
    // Makan pion lawan yang berdiri di kotak global yang sama.
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

// Jalankan pion terpilih lalu tentukan giliran berikutnya (dipakai internal,
// baik dari pilihan pemain maupun auto-move saat hanya ada satu pilihan).
function commitMove(state, tokenIndex) {
  const player = currentPlayer(state);
  const dice = state.lastDice;
  const { captured, reachedHome } = resolveMove(state, tokenIndex);
  state.dicePending = false;
  state.legalTokens = [];

  // Pemain ini baru saja menuntaskan keempat pion?
  const justFinished = isFinished(player);
  if (justFinished && !state.ranking.includes(player.index)) {
    state.ranking.push(player.index);
  }

  if (state.mode === "single") {
    if (justFinished) {
      state.phase = "finished";
      state.winner = player.name;
      state.sixStreak = 0;
      return;
    }
  } else {
    // Ranking: selesai bila tinggal <=1 pemain yang belum finis.
    const remaining = state.players.filter((p) => !state.ranking.includes(p.index));
    if (remaining.length <= 1) {
      if (remaining.length === 1) state.ranking.push(remaining[0].index); // juru kunci
      state.phase = "finished";
      state.winner = state.players[state.ranking[0]].name; // juara 1
      state.sixStreak = 0;
      return;
    }
  }

  // Bonus giliran bila: dadu 6, makan lawan, atau ada pion sampai rumah.
  // Pemain yang baru finis tidak dapat bonus (tak ada pion tersisa).
  const extra = !justFinished && (dice === 6 || captured || reachedHome);
  if (extra) {
    if (dice !== 6) state.sixStreak = 0; // bonus non-6 tidak menambah streak
  } else {
    state.sixStreak = 0;
    advanceTurn(state);
  }
}

// AKSI: lempar dadu untuk pemain giliran ini.
export function roll(state) {
  if (state.phase !== "playing" || state.dicePending) return;
  const dice = rollDie();
  state.lastDice = dice;

  if (dice === 6) {
    state.sixStreak += 1;
    if (state.sixStreak >= 3) {
      // Tiga kali 6 beruntun: hangus, giliran langsung lewat.
      state.sixStreak = 0;
      advanceTurn(state);
      return;
    }
  }

  const legal = legalTokenIndices(currentPlayer(state), dice);
  if (legal.length === 0) {
    state.sixStreak = 0; // tak ada langkah sah → giliran lewat (termasuk saat 6)
    advanceTurn(state);
    return;
  }
  if (legal.length === 1) {
    commitMove(state, legal[0]); // satu pilihan → otomatis dijalankan
    return;
  }
  state.dicePending = true;
  state.legalTokens = legal;
}

// AKSI: pemain memilih pion yang dijalankan (saat ada >1 pilihan).
export function move(state, tokenIndex) {
  if (state.phase !== "playing" || !state.dicePending) return;
  if (!state.legalTokens.includes(tokenIndex)) return;
  commitMove(state, tokenIndex);
}

// Pandangan (view) yang dikirim ke scene. Bentuknya dijaga identik dengan
// yang dipetakan OnlineController dari state server.
export function toView(state, myId) {
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
