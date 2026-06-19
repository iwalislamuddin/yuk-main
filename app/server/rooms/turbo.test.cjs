// Tes turbo bot online: isTurbo() di LudoRoom & HalmaRoom.
// Turbo = mode peringkat & SEMUA pemain manusia sudah finis (posisi-array ada di
// ranking) -> sisa giliran cuma antar-bot, dipercepat. Mode single tak pernah
// turbo. Tes memanggil method NYATA yang dipakai room via prototype.call.
const assert = require("assert");
const { LudoRoom } = require("./LudoRoom");
const { HalmaRoom } = require("./HalmaRoom");
const Ludo = require("../logic/ludo");
const Halma = require("../logic/halma");

let pass = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  console.log("  ✓", msg);
  pass++;
};

// ---- Ludo ----
{
  const turbo = (logic) => LudoRoom.prototype.isTurbo.call({ logic });

  // Ranking, 1 manusia + 3 bot.
  const L = Ludo.createState("ranking");
  Ludo.addPlayer(L, { id: "me", name: "Aku", isBot: false, seat: 0 });
  Ludo.addPlayer(L, { id: "b1", name: "B1", isBot: true, seat: 1 });
  Ludo.addPlayer(L, { id: "b2", name: "B2", isBot: true, seat: 2 });
  Ludo.addPlayer(L, { id: "b3", name: "B3", isBot: true, seat: 3 });
  Ludo.startGame(L);
  ok(turbo(L) === false, "Ludo: manusia belum finis -> turbo OFF");

  // Manusia (posisi-array 0) masuk ranking -> semua manusia selesai.
  L.ranking.push(0);
  ok(turbo(L) === true, "Ludo: manusia finis (ranking) -> turbo ON");

  // Mode single tak pernah turbo, walau ada di ranking.
  const S = Ludo.createState("single");
  Ludo.addPlayer(S, { id: "me", name: "Aku", isBot: false, seat: 0 });
  Ludo.addPlayer(S, { id: "b1", name: "B1", isBot: true, seat: 1 });
  Ludo.startGame(S);
  S.ranking.push(0);
  ok(turbo(S) === false, "Ludo: mode single -> turbo OFF");

  // Dua manusia: turbo hanya saat KEDUANYA finis.
  const D = Ludo.createState("ranking");
  Ludo.addPlayer(D, { id: "h1", name: "H1", isBot: false, seat: 0 });
  Ludo.addPlayer(D, { id: "h2", name: "H2", isBot: false, seat: 1 });
  Ludo.addPlayer(D, { id: "b1", name: "B1", isBot: true, seat: 2 });
  Ludo.addPlayer(D, { id: "b2", name: "B2", isBot: true, seat: 3 });
  Ludo.startGame(D);
  D.ranking.push(0);
  ok(turbo(D) === false, "Ludo: baru 1 dari 2 manusia finis -> turbo OFF");
  D.ranking.push(1);
  ok(turbo(D) === true, "Ludo: kedua manusia finis -> turbo ON");
}

// ---- Halma ----
{
  const turbo = (logic) => HalmaRoom.prototype.isTurbo.call({ logic });

  const H = Halma.createState("ranking", 3);
  Halma.addPlayer(H, { id: "me", name: "Aku", isBot: false });
  Halma.addPlayer(H, { id: "b1", name: "B1", isBot: true });
  Halma.addPlayer(H, { id: "b2", name: "B2", isBot: true });
  Halma.startGame(H);
  ok(turbo(H) === false, "Halma: manusia belum finis -> turbo OFF");

  H.ranking.push(0);
  ok(turbo(H) === true, "Halma: manusia finis -> turbo ON");

  const S = Halma.createState("single", 2);
  Halma.addPlayer(S, { id: "me", name: "Aku", isBot: false });
  Halma.addPlayer(S, { id: "b1", name: "B1", isBot: true });
  Halma.startGame(S);
  S.ranking.push(0);
  ok(turbo(S) === false, "Halma: mode single -> turbo OFF");
}

console.log(`\n${pass} asersi turbo LULUS.`);
