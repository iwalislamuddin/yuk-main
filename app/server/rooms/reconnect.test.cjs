// Uji Fase B3 — masa tenggang reconnect (allowReconnection).
// Menjalankan server sungguhan (index.js) lalu menyambung lewat colyseus.js,
// mensimulasikan putus tak sengaja (leave(false)) + sambung ulang.
//   Jalankan: node app/server/rooms/reconnect.test.cjs
process.env.PORT = process.env.PORT || "2599";
process.env.RECONNECT_SECONDS = "2"; // grace pendek supaya tes cepat

const path = require("path");
const Colyseus = require(
  path.join(__dirname, "..", "..", "node_modules", "colyseus.js", "build", "cjs", "index.js")
);

require("../index.js"); // start server (efek samping: listen di PORT)

const URL = `ws://localhost:${process.env.PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findPlayer(state, name) {
  let found = null;
  state.players.forEach((p) => {
    if (p.name === name) found = p;
  });
  return found;
}

let failures = 0;
function check(cond, msg) {
  console.log((cond ? "  ✓ " : "  ✗ ") + msg);
  if (!cond) failures++;
}

async function main() {
  await sleep(600); // beri server waktu listen
  const client = new Colyseus.Client(URL);

  // --- Skenario 1: reconnect berhasil (Ludo) ---
  // Online Ludo dipatok 4 pemain: 2 manusia masuk, host "startNow" isi bot+mulai.
  console.log("Skenario 1: reconnect berhasil");
  const r1 = await client.joinOrCreate("ludo", { name: "Andi" });
  const r2 = await client.joinOrCreate("ludo", { name: "Budi" });
  await sleep(300);
  // Inti perbaikan antrian: tanpa filterBy + konfigurasi dipatok, dua pemain
  // yang joinOrCreate masuk SATU room yang sama (bukan dua antrian terpisah).
  check(r1.roomId === r2.roomId, "dua pemain mendarat di room yang sama (satu antrian)");
  check(!!findPlayer(r2.state, "Andi") && !!findPlayer(r2.state, "Budi"), "kedua pemain terlihat di room");
  r1.send("startNow"); // host isi sisa kursi dgn bot lalu mulai
  await sleep(400);
  check(r2.state.phase === "playing", "game mulai (2 manusia + bot) via startNow");
  const token = r1.reconnectionToken;

  await r1.leave(false); // putus tak sengaja
  await sleep(700);
  let pAndi = findPlayer(r2.state, "Andi");
  check(!!pAndi && pAndi.disconnected === true, "Andi ditandai disconnected saat putus");
  check(!!pAndi && pAndi.isBot === false, "Andi BELUM jadi bot selama grace");

  const r1b = await client.reconnect(token); // sambung ulang sebelum grace habis
  await sleep(600);
  pAndi = findPlayer(r2.state, "Andi");
  check(!!pAndi && pAndi.disconnected === false, "Andi disconnected=false setelah reconnect");
  check(!!pAndi && pAndi.isBot === false, "Andi tetap manusia setelah reconnect");

  await r1b.leave(true);
  await r2.leave(true);
  await sleep(400);

  // --- Skenario 2: grace habis -> pemain jadi bot (Ludo) ---
  console.log("Skenario 2: grace habis -> jadi bot");
  const s1 = await client.joinOrCreate("ludo", { name: "Citra" });
  const s2 = await client.joinOrCreate("ludo", { name: "Dewi" });
  await sleep(300);
  s1.send("startNow");
  await sleep(400);
  await s1.leave(false); // putus, TIDAK reconnect
  await sleep(700);
  let pCitra = findPlayer(s2.state, "Citra");
  check(!!pCitra && pCitra.disconnected === true, "Citra disconnected saat putus");
  await sleep(2500); // tunggu grace (2 dtk) habis
  pCitra = findPlayer(s2.state, "Citra");
  check(!!pCitra && pCitra.isBot === true, "Citra jadi bot setelah grace habis");
  check(!!pCitra && pCitra.disconnected === false, "flag disconnected dibersihkan saat jadi bot");

  await s2.leave(true);
  await sleep(400);

  // --- Skenario 3: leave DISENGAJA tidak menunggu grace (Ludo) ---
  console.log("Skenario 3: leave disengaja -> langsung bot (tanpa grace)");
  const t1 = await client.joinOrCreate("ludo", { name: "Eka" });
  const t2 = await client.joinOrCreate("ludo", { name: "Fajar" });
  await sleep(300);
  t1.send("startNow");
  await sleep(400);
  await t1.leave(true); // disengaja
  await sleep(500); // jauh lebih pendek dari grace
  const pEka = findPlayer(t2.state, "Eka");
  check(!!pEka && pEka.isBot === true, "Eka langsung jadi bot saat keluar disengaja");
  await t2.leave(true);
  await sleep(300);

  // --- Skenario 4: room privat berkode (B3 bagian 2) ---
  console.log("Skenario 4: room privat berkode");
  const host = await client.create("ludo", { private: true, name: "Gita" });
  const code = host.roomId;
  check(!!code, "host dapat kode room (roomId)");
  // Pemain publik TIDAK boleh mendarat di room privat.
  const pub = await client.joinOrCreate("ludo", { name: "Publik" });
  check(pub.roomId !== code, "joinOrCreate publik TIDAK masuk room privat");
  await pub.leave(true);
  // Teman gabung lewat KODE -> room privat yang sama.
  const friend = await client.joinById(code, { name: "Hadi" });
  check(friend.roomId === code, "teman joinById masuk room privat yang sama");
  await sleep(300);
  check(!!findPlayer(host.state, "Hadi"), "teman terlihat di room privat host");
  // Kode salah -> gagal join.
  let badCodeRejected = false;
  try {
    await client.joinById("KODENGAWUR", { name: "X" });
  } catch (e) {
    badCodeRejected = true;
  }
  check(badCodeRejected, "kode salah ditolak (joinById gagal)");
  await host.leave(true);
  await friend.leave(true);
  await sleep(300);

  console.log(failures === 0 ? "\nSEMUA LULUS ✅" : `\n${failures} GAGAL ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
