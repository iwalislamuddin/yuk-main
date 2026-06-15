// Logika inti Halma bintang (Chinese Checkers) — sisi SERVER (CommonJS).
// PENTING: jaga agar IDENTIK perilakunya dengan client/src/games/halma/logic.js.
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

// 6 arah tetangga heks dalam koordinat kubus (x,y,z).
const DIRS = [
  [1, -1, 0],
  [-1, 1, 0],
  [0, -1, 1],
  [0, 1, -1],
  [1, 0, -1],
  [-1, 0, 1]
];

const TOKENS_PER_PLAYER = 10;

// Apakah (x,y,z) salah satu dari 121 lubang papan?
function inHex(x, y, z) {
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) <= 4;
}
function onBoard(x, y, z) {
  if (x + y + z !== 0) return false;
  if (inHex(x, y, z)) return true;
  // 6 sudut: satu sumbu >= 5 (atau <= -5), dua sumbu lain di sisi berlawanan 1..4.
  if (x >= 5 && y <= -1 && y >= -4 && z <= -1 && z >= -4) return true; // +x (kanan-atas)
  if (x <= -5 && y >= 1 && y <= 4 && z >= 1 && z <= 4) return true; // -x (kiri-bawah)
  if (y >= 5 && x <= -1 && x >= -4 && z <= -1 && z >= -4) return true; // +y (kiri-atas)
  if (y <= -5 && x >= 1 && x <= 4 && z >= 1 && z <= 4) return true; // -y (kanan-bawah)
  if (z >= 5 && x <= -1 && x >= -4 && y <= -1 && y >= -4) return true; // +z (bawah)
  if (z <= -5 && x >= 1 && x <= 4 && y >= 1 && y <= 4) return true; // -z (atas)
  return false;
}

// ---- Bangun daftar lubang + tabel langkah/lompat (sekali, saat modul dimuat) ----

const HOLES = []; // { id, x, y, z, q, r } ; q,r = koordinat aksial untuk layar
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

const NUM_HOLES = HOLES.length; // 121

// STEP[id][d] = lubang tetangga ke arah d (atau -1). JUMP = dua langkah ke arah d.
const STEP = HOLES.map((h) =>
  DIRS.map((d) => {
    const id = idByKey.get(keyOf(h.x + d[0], h.y + d[1], h.z + d[2]));
    return id === undefined ? -1 : id;
  })
);
const JUMP = HOLES.map((h) =>
  DIRS.map((d) => {
    const id = idByKey.get(keyOf(h.x + 2 * d[0], h.y + 2 * d[1], h.z + 2 * d[2]));
    return id === undefined ? -1 : id;
  })
);

// ---- Sudut (rumah) tiap pemain & arah kemajuan menuju target ----
// Urutan sudut searah jarum jam mulai dari atas (lihat pemetaan layar di scene):
//   0 atas, 1 kanan-atas, 2 kanan-bawah, 3 bawah, 4 kiri-bawah, 5 kiri-atas.
// Target tiap sudut = sudut seberang = (seat + 3) % 6.
// goal = sign * koordinat[axis], makin besar makin dekat ke target.
const CORNERS = [
  { test: (x, y, z) => z <= -5 && x >= 1 && x <= 4 && y >= 1 && y <= 4, axis: "z", sign: 1 }, // 0 atas (-z) -> +z
  { test: (x, y, z) => x >= 5 && y <= -1 && y >= -4 && z <= -1 && z >= -4, axis: "x", sign: -1 }, // 1 kanan-atas (+x) -> -x
  { test: (x, y, z) => y <= -5 && x >= 1 && x <= 4 && z >= 1 && z <= 4, axis: "y", sign: 1 }, // 2 kanan-bawah (-y) -> +y
  { test: (x, y, z) => z >= 5 && x <= -1 && x >= -4 && y <= -1 && y >= -4, axis: "z", sign: -1 }, // 3 bawah (+z) -> -z
  { test: (x, y, z) => x <= -5 && y >= 1 && y <= 4 && z >= 1 && z <= 4, axis: "x", sign: 1 }, // 4 kiri-bawah (-x) -> +x
  { test: (x, y, z) => y >= 5 && x <= -1 && x >= -4 && z <= -1 && z >= -4, axis: "y", sign: -1 } // 5 kiri-atas (+y) -> -y
];

// HOME_HOLES[seat] = 10 id lubang rumah; TARGET_HOLES[seat] = rumah sudut seberang.
const HOME_HOLES = CORNERS.map((c) =>
  HOLES.filter((h) => c.test(h.x, h.y, h.z)).map((h) => h.id)
);
const TARGET_HOLES = HOME_HOLES.map((_, seat) => HOME_HOLES[(seat + 3) % 6]);
const TARGET_SETS = TARGET_HOLES.map((ids) => new Set(ids));

// Warna tiap sudut (0xRRGGBB). Pasangan seberang (0,3)(1,4)(2,5) kontras tinggi.
const CORNER_COLORS = [0xdc2626, 0xea580c, 0x16a34a, 0x0891b2, 0x2563eb, 0x9333ea];
const CORNER_NAMES = ["Merah", "Oranye", "Hijau", "Sian", "Biru", "Ungu"];

// Konfigurasi sudut yang dipakai per jumlah pemain.
//  2 pemain: atas vs bawah (seberang).  3 pemain: selang-seling (segitiga seimbang).
const SEATS_BY_COUNT = { 2: [0, 3], 3: [0, 2, 4] };

// Nilai kemajuan satu lubang untuk pemain di sudut `seat` (makin besar makin baik).
function goalValue(seat, holeId) {
  const c = CORNERS[seat];
  return c.sign * HOLES[holeId][c.axis];
}

// ---------- Siklus hidup state ----------

// mode "single"  = pemain pertama yang memenuhi target menang, game selesai.
// mode "ranking" = lanjut sampai semua kebagian peringkat (juara 1..N).
function createState(mode = "single", playerCount = 2) {
  const count = SEATS_BY_COUNT[playerCount] ? playerCount : 2;
  return {
    mode: mode === "ranking" ? "ranking" : "single",
    playerCount: count,
    phase: "waiting", // waiting | playing | finished
    players: [], // { id, name, isBot, seat, pieces:[10 id lubang] }
    currentIndex: 0,
    lastMove: null, // { seat, from, to, path:[id...] } untuk animasi
    ranking: [], // index pemain (di state.players) urut finis
    winner: null
  };
}

function addPlayer(state, { id, name, isBot = false }) {
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

function startGame(state) {
  state.phase = "playing";
  state.currentIndex = 0;
  state.lastMove = null;
  state.ranking = [];
  state.winner = null;
  // catatan: mode & playerCount sengaja TIDAK direset (dipertahankan saat main lagi).
}

function resetState(state) {
  state.players.forEach((p) => (p.pieces = HOME_HOLES[p.seat].slice()));
  startGame(state);
}

function currentPlayer(state) {
  return state.players[state.currentIndex];
}

function isFinished(player) {
  const target = TARGET_SETS[player.seat];
  return player.pieces.every((p) => target.has(p));
}

// ---------- Aturan langkah ----------

function occupiedSet(state) {
  const s = new Set();
  for (const p of state.players) for (const h of p.pieces) s.add(h);
  return s;
}

// Semua tujuan sah dari lubang `from`, diberikan himpunan lubang terisi `occupied`.
// Mengembalikan Map(idTujuan -> jalur[id...]). `from` dianggap kosong (pion sedang
// berpindah), sehingga tidak menghalangi/melompati dirinya sendiri.
function destinationsFrom(occupied, from) {
  const isOcc = (h) => h !== from && occupied.has(h);
  const res = new Map();

  // 1) Geser satu langkah ke tetangga kosong.
  for (let d = 0; d < 6; d++) {
    const nb = STEP[from][d];
    if (nb !== -1 && !isOcc(nb)) res.set(nb, [from, nb]);
  }

  // 2) Lompatan berantai (BFS): lewati pion bersebelahan ke lubang kosong di baliknya.
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

// Semua langkah sah pemain index `idx`: [{ from, to, path }].
function legalMovesForPlayer(state, idx) {
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

// AKSI: pemain giliran ini memindahkan pion dari `from` ke `to`.
// Mengembalikan true bila langkah sah & diterapkan.
function move(state, from, to) {
  if (state.phase !== "playing" || state.winner) return false;
  const player = currentPlayer(state);
  const slot = player.pieces.indexOf(from);
  if (slot === -1) return false; // bukan pion milik pemain giliran ini

  const occ = occupiedSet(state);
  const dests = destinationsFrom(occ, from);
  const path = dests.get(to);
  if (!path) return false; // tujuan tidak sah

  player.pieces[slot] = to;
  state.lastMove = { seat: player.seat, from, to, path };

  // Pemain ini baru saja memenuhi targetnya?
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
    // Ranking: selesai bila tinggal <= 1 pemain yang belum finis.
    const remaining = state.players
      .map((_, i) => i)
      .filter((i) => !state.ranking.includes(i));
    if (remaining.length <= 1) {
      if (remaining.length === 1) state.ranking.push(remaining[0]); // juru kunci
      state.phase = "finished";
      state.winner = state.players[state.ranking[0]].name; // juara 1
      return true;
    }
  }

  advanceTurn(state);
  return true;
}

// Pandangan (view) yang dikirim ke scene. Bentuknya dijaga identik dengan
// yang dipetakan OnlineController dari state server.
function toView(state, myId) {
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

module.exports = {
  // konstanta & data papan
  DIRS,
  TOKENS_PER_PLAYER,
  HOLES,
  NUM_HOLES,
  STEP,
  JUMP,
  HOME_HOLES,
  TARGET_HOLES,
  CORNERS,
  CORNER_COLORS,
  CORNER_NAMES,
  SEATS_BY_COUNT,
  // util
  goalValue,
  occupiedSet,
  destinationsFrom,
  legalMovesForPlayer,
  isFinished,
  // siklus hidup & aksi
  createState,
  addPlayer,
  startGame,
  resetState,
  currentPlayer,
  move,
  toView
};
