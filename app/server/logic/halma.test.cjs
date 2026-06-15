// Uji cepat logika Halma (jalankan: node app/server/logic/halma.test.cjs)
const H = require("./halma");

let fails = 0;
function check(name, cond) {
  if (!cond) {
    fails++;
    console.log("  FAIL:", name);
  }
}

// ---- 1. Invarian papan ----
check("121 lubang", H.NUM_HOLES === 121);
check("6 sudut rumah", H.HOME_HOLES.length === 6);
H.HOME_HOLES.forEach((ids, i) => check(`rumah ${i} berisi 10`, ids.length === 10));

// Tidak ada lubang dobel & semua koordinat unik
const seen = new Set();
H.HOLES.forEach((h) => seen.add(h.x + "," + h.y + "," + h.z));
check("koordinat unik", seen.size === 121);

// Adjacency simetris: jika A tetangga B lewat arah d, B tetangga A lewat arah lawan.
let symOK = true;
for (let id = 0; id < H.NUM_HOLES; id++) {
  for (let d = 0; d < 6; d++) {
    const nb = H.STEP[id][d];
    if (nb === -1) continue;
    const back = d % 2 === 0 ? d + 1 : d - 1; // DIRS disusun berpasangan lawan
    if (H.STEP[nb][back] !== id) symOK = false;
  }
}
check("adjacency simetris", symOK);

// JUMP konsisten: JUMP[id][d] = STEP[STEP[id][d]][d]
let jumpOK = true;
for (let id = 0; id < H.NUM_HOLES; id++) {
  for (let d = 0; d < 6; d++) {
    const over = H.STEP[id][d];
    const expect = over === -1 ? -1 : H.STEP[over][d];
    if (H.JUMP[id][d] !== expect) jumpOK = false;
  }
}
check("JUMP konsisten dgn STEP", jumpOK);

// Rumah & target seberang tidak beririsan, dan target = rumah (seat+3)%6
let targetOK = true;
for (let s = 0; s < 6; s++) {
  const home = new Set(H.HOME_HOLES[s]);
  const tgt = H.TARGET_HOLES[s];
  if (tgt.some((id) => home.has(id))) targetOK = false;
  if (tgt.join() !== H.HOME_HOLES[(s + 3) % 6].join()) targetOK = false;
}
check("target = sudut seberang & disjoint", targetOK);

// goalValue: rumah sendiri rendah, target tinggi
let goalOK = true;
for (let s = 0; s < 6; s++) {
  const homeAvg = H.HOME_HOLES[s].reduce((a, id) => a + H.goalValue(s, id), 0) / 10;
  const tgtAvg = H.TARGET_HOLES[s].reduce((a, id) => a + H.goalValue(s, id), 0) / 10;
  if (!(tgtAvg > homeAvg + 8)) goalOK = false;
}
check("goalValue naik menuju target", goalOK);

// ---- 2. destinationsFrom: kasus terarah ----
// Lubang tip rumah atas (seat 0) -> punya beberapa langkah geser ke hexagon.
{
  const occ = new Set();
  const someHole = H.HOME_HOLES[0][0];
  const d = H.destinationsFrom(occ, someHole);
  check("ada langkah dari lubang rumah (papan kosong)", d.size > 0);
}
// Uji lompat: tempatkan satu pion bersebelahan -> harus muncul tujuan jarak-2.
{
  // cari id & arah di mana STEP & JUMP keduanya valid
  let from = -1, over = -1, land = -1;
  outer: for (let id = 0; id < H.NUM_HOLES; id++)
    for (let dir = 0; dir < 6; dir++)
      if (H.STEP[id][dir] !== -1 && H.JUMP[id][dir] !== -1) {
        from = id; over = H.STEP[id][dir]; land = H.JUMP[id][dir];
        break outer;
      }
  const occ = new Set([from, over]);
  const dests = H.destinationsFrom(occ, from);
  check("lompatan menghasilkan tujuan jarak-2", dests.has(land));
  const path = dests.get(land);
  check("jalur lompat = [from, land]", path && path.length === 2 && path[0] === from && path[1] === land);
}

// ---- 3. Simulasi game acak (terminasi + deteksi menang) ----
function randomBotMove(state, idx) {
  const moves = H.legalMovesForPlayer(state, idx);
  if (!moves.length) return null;
  // bias maju: pilih di antara langkah dgn kenaikan goal terbesar (lebih cepat selesai)
  const seat = state.players[idx].seat;
  moves.forEach((m) => (m.gain = H.goalValue(seat, m.to) - H.goalValue(seat, m.from)));
  moves.sort((a, b) => b.gain - a.gain);
  const top = moves.slice(0, Math.max(1, Math.ceil(moves.length * 0.25)));
  return top[Math.floor(Math.random() * top.length)];
}

function simulate(mode, playerCount, maxMoves = 4000) {
  const state = H.createState(mode, playerCount);
  for (let i = 0; i < playerCount; i++)
    H.addPlayer(state, { id: "p" + i, name: "P" + i, isBot: true });
  H.startGame(state);
  let moves = 0;
  while (state.phase === "playing" && moves < maxMoves) {
    const idx = state.currentIndex;
    const m = randomBotMove(state, idx);
    if (!m) {
      // tak ada langkah (tak seharusnya terjadi) -> hindari deadlock
      H.move(state, -1, -1);
      break;
    }
    const ok = H.move(state, m.from, m.to);
    if (!ok) {
      console.log("  FAIL: move ditolak padahal legal", m);
      fails++;
      break;
    }
    moves++;
  }
  return { finished: state.phase === "finished", moves, winner: state.winner, ranking: state.ranking, state };
}

function runBatch(mode, playerCount, n) {
  let finished = 0, totalMoves = 0, maxM = 0;
  for (let i = 0; i < n; i++) {
    const r = simulate(mode, playerCount);
    if (r.finished) finished++;
    totalMoves += r.moves;
    maxM = Math.max(maxM, r.moves);
    // validasi: pemenang benar2 sudah finis
    if (r.finished) {
      const champ = r.state.players[r.state.ranking[0]];
      if (!H.isFinished(champ)) {
        fails++;
        console.log("  FAIL: juara 1 belum finis", mode, playerCount);
      }
    }
  }
  console.log(
    `  ${mode}/${playerCount}p: selesai ${finished}/${n}, rata2 ${(totalMoves / n).toFixed(0)} langkah, maks ${maxM}`
  );
  check(`semua game ${mode}/${playerCount}p selesai`, finished === n);
}

console.log("Simulasi game acak:");
runBatch("single", 2, 300);
runBatch("single", 3, 200);
runBatch("ranking", 2, 200);
runBatch("ranking", 3, 200);

console.log(fails === 0 ? "\nSEMUA UJI LULUS ✓" : `\n${fails} UJI GAGAL ✗`);
process.exit(fails === 0 ? 0 : 1);
