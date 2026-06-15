// Logika inti Halma bintang (Chinese Checkers) — sisi CLIENT (ESM), untuk mode
// lawan bot offline & dipakai scene untuk menghitung langkah sah (highlight).
// PENTING: jaga agar IDENTIK perilakunya dengan server/logic/halma.js.
//
// Papan = bintang enam sudut (hexagram) berisi 121 lubang, dimodelkan dengan
// koordinat kubus hex (x + y + z = 0):
//   - Hexagon pusat   : max(|x|,|y|,|z|) <= 4            (61 lubang)
//   - 6 segitiga sudut : satu sumbu menonjol ke 5..8     (6 x 10 = 60 lubang)
// Tiap pemain menempati satu sudut (10 pion) dan harus memindahkan SEMUA pionnya
// ke sudut seberang (target). Langkah: geser ke lubang tetangga kosong, ATAU
// lompati pion bersebelahan ke lubang kosong di baliknya (boleh berantai).
// Tidak ada pion yang dimakan.
//
// Fungsi di sini murni-data (tanpa pixel). Pemetaan ke layar ada di HalmaScene.js.

// 6 arah tetangga heks dalam koordinat kubus (x,y,z). Disusun berpasangan lawan.
export const DIRS = [
  [1, -1, 0],
  [-1, 1, 0],
  [0, -1, 1],
  [0, 1, -1],
  [1, 0, -1],
  [-1, 0, 1]
];

export const TOKENS_PER_PLAYER = 10;

function inHex(x, y, z) {
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 4;
}
function onBoard(x, y, z) {
  if (x + y + z !== 0) return false;
  if (inHex(x, y, z)) return true;
  if (x >= 5 && y <= -1 && y >= -4 && z <= -1 && z >= -4) return true; // +x (kanan-atas)
  if (x <= -5 && y >= 1 && y <= 4 && z >= 1 && z <= 4) return true; // -x (kiri-bawah)
  if (y >= 5 && x <= -1 && x >= -4 && z <= -1 && z >= -4) return true; // +y (kiri-atas)
  if (y <= -5 && x >= 1 && x <= 4 && z >= 1 && z <= 4) return true; // -y (kanan-bawah)
  if (z >= 5 && x <= -1 && x >= -4 && y <= -1 && y >= -4) return true; // +z (bawah)
  if (z <= -5 && x >= 1 && x <= 4 && y >= 1 && y <= 4) return true; // -z (atas)
  return false;
}

// ---- Bangun daftar lubang + tabel langkah/lompat (sekali, saat modul dimuat) ----

export const HOLES = []; // { id, x, y, z, q, r } ; q,r = koordinat aksial untuk layar
const idByKey = new Map();
const keyOf = (x, y, z) => x + "," + y + "," + z;

for (let x = -8; x <= 8; x++) {
  for (let y = -8; y <= 8; y++) {
    const z = -x - y;
    if (z < -8 || z > 8) continue;
    if (!onBoard(x, y, z)) continue;
    const id = HOLES.length;
    idByKey.set(keyOf(x, y, z), id);
    HOLES.push({ id, x, y, z, q: x, r: z });
  }
}

export const NUM_HOLES = HOLES.length; // 121

export const STEP = HOLES.map((h) =>
  DIRS.map((d) => {
    const id = idByKey.get(keyOf(h.x + d[0], h.y + d[1], h.z + d[2]));
    return id === undefined ? -1 : id;
  })
);
export const JUMP = HOLES.map((h) =>
  DIRS.map((d) => {
    const id = idByKey.get(keyOf(h.x + 2 * d[0], h.y + 2 * d[1], h.z + 2 * d[2]));
    return id === undefined ? -1 : id;
  })
);

// Urutan sudut searah jarum jam mulai dari atas (lihat pemetaan layar di scene):
//   0 atas, 1 kanan-atas, 2 kanan-bawah, 3 bawah, 4 kiri-bawah, 5 kiri-atas.
// Target tiap sudut = sudut seberang = (seat + 3) % 6.
export const CORNERS = [
  { test: (x, y, z) => z <= -5 && x >= 1 && x <= 4 && y >= 1 && y <= 4, axis: "z", sign: 1 }, // 0 atas (-z) -> +z
  { test: (x, y, z) => x >= 5 && y <= -1 && y >= -4 && z <= -1 && z >= -4, axis: "x", sign: -1 }, // 1 kanan-atas (+x) -> -x
  { test: (x, y, z) => y <= -5 && x >= 1 && x <= 4 && z >= 1 && z <= 4, axis: "y", sign: 1 }, // 2 kanan-bawah (-y) -> +y
  { test: (x, y, z) => z >= 5 && x <= -1 && x >= -4 && y <= -1 && y >= -4, axis: "z", sign: -1 }, // 3 bawah (+z) -> -z
  { test: (x, y, z) => x <= -5 && y >= 1 && y <= 4 && z >= 1 && z <= 4, axis: "x", sign: 1 }, // 4 kiri-bawah (-x) -> +x
  { test: (x, y, z) => y >= 5 && x <= -1 && x >= -4 && z <= -1 && z >= -4, axis: "y", sign: -1 } // 5 kiri-atas (+y) -> -y
];

export const HOME_HOLES = CORNERS.map((c) =>
  HOLES.filter((h) => c.test(h.x, h.y, h.z)).map((h) => h.id)
);
export const TARGET_HOLES = HOME_HOLES.map((_, seat) => HOME_HOLES[(seat + 3) % 6]);
const TARGET_SETS = TARGET_HOLES.map((ids) => new Set(ids));

export const CORNER_COLORS = [0xdc2626, 0xea580c, 0x16a34a, 0x0891b2, 0x2563eb, 0x9333ea];
export const CORNER_NAMES = ["Merah", "Oranye", "Hijau", "Sian", "Biru", "Ungu"];

export const SEATS_BY_COUNT = { 2: [0, 3], 3: [0, 2, 4] };

export function goalValue(seat, holeId) {
  const c = CORNERS[seat];
  return c.sign * HOLES[holeId][c.axis];
}

// ---------- Siklus hidup state ----------

export function createState(mode = "single", playerCount = 2) {
  const count = SEATS_BY_COUNT[playerCount] ? playerCount : 2;
  return {
    mode: mode === "ranking" ? "ranking" : "single",
    playerCount: count,
    phase: "waiting",
    players: [],
    currentIndex: 0,
    lastMove: null,
    ranking: [],
    winner: null
  };
}

export function addPlayer(state, { id, name, isBot = false }) {
  const seats = SEATS_BY_COUNT[state.playerCount];
  const seat = seats[state.players.length % seats.length];
  state.players.push({
    id,
    name,
    isBot,
    seat,
    pieces: HOME_HOLES[seat].slice()
  });
  return state.players.length - 1;
}

export function startGame(state) {
  state.phase = "playing";
  state.currentIndex = 0;
  state.lastMove = null;
  state.ranking = [];
  state.winner = null;
}

export function resetState(state) {
  state.players.forEach((p) => (p.pieces = HOME_HOLES[p.seat].slice()));
  startGame(state);
}

export function currentPlayer(state) {
  return state.players[state.currentIndex];
}

export function isFinished(player) {
  const target = TARGET_SETS[player.seat];
  return player.pieces.every((p) => target.has(p));
}

// ---------- Aturan langkah ----------

export function occupiedSet(state) {
  const s = new Set();
  for (const p of state.players) for (const h of p.pieces) s.add(h);
  return s;
}

// Semua tujuan sah dari lubang `from`. `from` dianggap kosong (pion sedang
// berpindah). Mengembalikan Map(idTujuan -> jalur[id...]).
export function destinationsFrom(occupied, from) {
  const isOcc = (h) => h !== from && occupied.has(h);
  const res = new Map();

  for (let d = 0; d < 6; d++) {
    const nb = STEP[from][d];
    if (nb !== -1 && !isOcc(nb)) res.set(nb, [from, nb]);
  }

  const visited = new Set([from]);
  const queue = [[from, [from]]];
  while (queue.length) {
    const [cur, path] = queue.shift();
    for (let d = 0; d < 6; d++) {
      const over = STEP[cur][d];
      const land = JUMP[cur][d];
      if (over === -1 || land === -1) continue;
      if (!isOcc(over) || isOcc(land) || visited.has(land)) continue;
      visited.add(land);
      const np = path.concat(land);
      if (!res.has(land)) res.set(land, np);
      queue.push([land, np]);
    }
  }

  res.delete(from);
  return res;
}

export function legalMovesForPlayer(state, idx) {
  const player = state.players[idx];
  const occ = occupiedSet(state);
  const moves = [];
  for (const from of player.pieces) {
    const dests = destinationsFrom(occ, from);
    for (const [to, path] of dests) moves.push({ from, to, path });
  }
  return moves;
}

function advanceTurn(state) {
  if (state.ranking.length >= state.players.length) return;
  let next = state.currentIndex;
  do {
    next = (next + 1) % state.players.length;
  } while (state.ranking.includes(next));
  state.currentIndex = next;
}

export function move(state, from, to) {
  if (state.phase !== "playing" || state.winner) return false;
  const player = currentPlayer(state);
  const slot = player.pieces.indexOf(from);
  if (slot === -1) return false;

  const occ = occupiedSet(state);
  const dests = destinationsFrom(occ, from);
  const path = dests.get(to);
  if (!path) return false;

  player.pieces[slot] = to;
  state.lastMove = { seat: player.seat, from, to, path };

  const justFinished = isFinished(player);
  if (justFinished && !state.ranking.includes(state.currentIndex)) {
    state.ranking.push(state.currentIndex);
  }

  if (state.mode === "single") {
    if (justFinished) {
      state.phase = "finished";
      state.winner = player.name;
      return true;
    }
  } else {
    const remaining = state.players
      .map((_, i) => i)
      .filter((i) => !state.ranking.includes(i));
    if (remaining.length <= 1) {
      if (remaining.length === 1) state.ranking.push(remaining[0]);
      state.phase = "finished";
      state.winner = state.players[state.ranking[0]].name;
      return true;
    }
  }

  advanceTurn(state);
  return true;
}

export function toView(state, myId) {
  const me = state.players.find((p) => p.id === myId);
  const active = state.phase === "playing" && !state.winner;
  return {
    mode: state.mode,
    playerCount: state.playerCount,
    phase: state.phase,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      seat: p.seat,
      pieces: p.pieces.slice(),
      finished: isFinished(p)
    })),
    turnId: active ? state.players[state.currentIndex].id : "",
    myId,
    mySeat: me ? me.seat : -1,
    lastMove: state.lastMove,
    ranking: state.ranking.map((idx) => state.players[idx].name),
    winner: state.winner
  };
}
