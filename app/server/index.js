// Arena Papan - server multiplayer (Node.js + Colyseus)
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server, matchMaker } = require("colyseus");
const { WebSocketTransport } = require("@colyseus/ws-transport");
const { SnakesLaddersRoom } = require("./rooms/SnakesLaddersRoom");
const { LudoRoom } = require("./rooms/LudoRoom");
const { HalmaRoom } = require("./rooms/HalmaRoom");
const { findRoomIdByCode } = require("./rooms/privateCode");
const hof = require("./hof/store");

const PORT = process.env.PORT || 2567;

const app = express();
app.use(cors());
app.use(express.json());

hof.init(); // mulai inisialisasi store (Turso bila env diisi, else in-memory)

app.get("/health", (_req, res) => res.json({ ok: true, name: "arena-papan" }));

// ---------- Lobi online (presence + discovery) ----------
// Nama room Colyseus -> id game di registry client.
const ROOM_TO_GAME = {
  snakes_ladders: "ular-tangga",
  ludo: "ludo",
  halma: "halma"
};
const ROOM_NAMES = new Set(Object.keys(ROOM_TO_GAME));

// GET /private-room?game=<roomName>&code=<kode> -> { roomId }
//   Resolusi KODE room privat (4+ digit) menjadi roomId Colyseus, supaya client
//   bisa joinById. 404 bila kode tak cocok room privat aktif mana pun.
app.get("/private-room", async (req, res) => {
  const game = String(req.query.game || "");
  const code = String(req.query.code || "").trim();
  if (!ROOM_NAMES.has(game) || !/^\d{3,8}$/.test(code)) {
    return res.status(400).json({ error: "permintaan tidak valid" });
  }
  try {
    const roomId = await findRoomIdByCode(game, code);
    if (!roomId) return res.status(404).json({ error: "kode tidak ditemukan" });
    res.json({ roomId });
  } catch (e) {
    console.error("[private-room] gagal:", e.message);
    res.status(500).json({ error: "gagal mencari room" });
  }
});

// GET /lobby -> { online, rooms, waitingByGame }
//   online        = jumlah client tersambung di semua room (orang siap main).
//   rooms         = room yang MASIH bisa digabung (menunggu pemain).
//   waitingByGame = jumlah room menunggu per game (untuk badge kartu).
app.get("/lobby", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({});
    let online = 0;
    const waiting = [];
    const waitingByGame = {};
    for (const r of rooms) {
      online += r.clients || 0;
      const gameId = ROOM_TO_GAME[r.name];
      if (!gameId) continue;
      const joinable =
        !r.locked && !r.private && r.clients > 0 && r.clients < r.maxClients;
      if (!joinable) continue;
      const meta = r.metadata || {};
      waiting.push({
        roomId: r.roomId,
        gameId,
        host: meta.host || "Pemain",
        mode: meta.mode || "single",
        humans: r.clients,
        max: r.maxClients
      });
      waitingByGame[gameId] = (waitingByGame[gameId] || 0) + 1;
    }
    res.json({ online, rooms: waiting, waitingByGame });
  } catch (e) {
    console.error("[lobby] gagal:", e.message);
    res.status(500).json({ error: "gagal mengambil lobi" });
  }
});

// ---------- Hall of Fame global (leaderboard lintas perangkat) ----------
// GET  /hof  -> baris per (nama, game); client mengagregasi + hitung rasio.
// POST /hof  -> lapor hasil LAWAN-BOT (offline) saja, source dipaksa "bot".
//   Hasil ONLINE dicatat otoritatif oleh room (source "online"), TIDAK lewat
//   sini. Endpoint ini berbasis-percaya (tanpa login), jadi dipasangi pengaman
//   murah: validasi input + rate limit per IP. Lihat catatan anti-curang.

// Rate limit sederhana per IP: maks 30 POST / menit.
const rlHits = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const WINDOW = 60_000;
  const MAX = 30;
  let e = rlHits.get(ip);
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + WINDOW };
    rlHits.set(ip, e);
  }
  e.count += 1;
  return e.count > MAX;
}
function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "?";
}

app.get("/hof", async (_req, res) => {
  try {
    res.json({ rows: await hof.getLeaderboardRows() });
  } catch (e) {
    console.error("[hof] GET gagal:", e.message);
    res.status(500).json({ error: "gagal mengambil leaderboard" });
  }
});

app.post("/hof", async (req, res) => {
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: "terlalu sering, coba lagi nanti" });
  }
  const { name, gameId, win } = req.body || {};
  if (typeof name !== "string" || !hof.sanitizeName(name)) {
    return res.status(400).json({ error: "nama tidak valid" });
  }
  if (!hof.KNOWN_GAMES.has(gameId)) {
    return res.status(400).json({ error: "game tidak dikenal" });
  }
  if (typeof win !== "boolean") {
    return res.status(400).json({ error: "field win harus boolean" });
  }
  try {
    await hof.recordResult({ name, gameId, source: "bot", win });
    res.json({ ok: true });
  } catch (e) {
    console.error("[hof] POST gagal:", e.message);
    res.status(500).json({ error: "gagal menyimpan hasil" });
  }
});

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer })
});

// Daftarkan room per game. Game baru = define() baru + file room baru.
// TANPA filterBy: konfigurasi online dipatok per game (target+mode tetap di
// onCreate masing-masing room), jadi semua pemain satu game masuk SATU antrian
// — dua orang yang online berdekatan waktunya pasti ketemu di room yang sama.
gameServer.define("snakes_ladders", SnakesLaddersRoom);
gameServer.define("ludo", LudoRoom);
gameServer.define("halma", HalmaRoom);

httpServer.listen(PORT, () =>
  console.log(`Arena Papan server jalan di ws://localhost:${PORT}`)
);
