const { Room } = require("colyseus");
const { HalmaPlayer, HalmaState } = require("./halmaSchema");
const Halma = require("../logic/halma");
const { pickBotMove } = require("../bots/halma");
const { generatePrivateCode } = require("./privateCode");
const hof = require("../hof/store");

const COUNTDOWN_MS = 30_000;
// Masa tenggang reconnect saat pemain terputus (B3). Override via env utk tes.
const RECONNECT_SECONDS = Number(process.env.RECONNECT_SECONDS) || 30;
const BOT_LEVEL = "normal"; // tingkat bot pengisi online

/**
 * Room Halma. Server otoritatif: langkah divalidasi di server (logic Halma jadi
 * sumber kebenaran, lalu dicermin ke schema). Fase B2: room punya TARGET pemain
 * (2 atau 3, jadi kriteria matchmaking lewat filterBy). Saat >=2 manusia & belum
 * penuh dan target>2, countdown 30 dtk; habis (atau host "Mulai sekarang") sisa
 * kursi diisi bot. Bot dijalankan server (heuristik identik LocalBotController).
 */
class HalmaRoom extends Room {
  async onCreate(options) {
    // Konfigurasi online DIPATOK (otoritatif): satu antrian per game — lihat
    // catatan di LudoRoom. Halma online selalu 3 pemain, mode peringkat.
    this.target = 3;
    this.maxClients = this.target;
    this.gameMode = "ranking";
    this.logic = Halma.createState(this.gameMode, this.target);

    // Room privat (B3): hanya bisa digabung lewat KODE 4 digit. Kode disimpan di
    // metadata (resolusi -> roomId) & di state (untuk host bagikan).
    this.isPrivate = !!options?.private;
    this.code = "";
    if (this.isPrivate) {
      this.setPrivate(true);
      this.code = await generatePrivateCode("halma");
      await this.setMetadata({ code: this.code });
    }
    this.startsAt = 0;
    this.countdownTimer = null;
    this.botTimer = null;
    this.banned = []; // langkah terakhir per index pemain (anti-osilasi)
    this.setState(new HalmaState());

    this.onMessage("move", (client, msg) => {
      if (!this.isTurn(client.sessionId)) return;
      const idx = this.logic.currentIndex;
      const from = Number(msg?.from);
      const to = Number(msg?.to);
      if (Halma.move(this.logic, from, to)) this.banned[idx] = { from, to };
      this.sync();
    });
    this.onMessage("startNow", (client) => {
      if (this.logic.phase !== "waiting") return;
      if (this.logic.players.length < 2) return;
      if (this.logic.players[0]?.id !== client.sessionId) return; // host saja
      this.fillAndStart();
    });
  }

  isTurn(sessionId) {
    const p = Halma.currentPlayer(this.logic);
    return this.logic.phase === "playing" && !this.logic.winner && p && p.id === sessionId;
  }

  onJoin(client, options) {
    Halma.addPlayer(this.logic, {
      id: client.sessionId,
      name: String(options?.name || "Pemain").slice(0, 16),
      isBot: false
    });
    if (this.logic.players.length === 1) {
      this.setMetadata({
        gameId: "halma",
        host: this.logic.players[0].name,
        mode: this.gameMode,
        target: this.target
      });
    }

    if (this.logic.players.length >= this.target) {
      this.clearCountdown();
      Halma.startGame(this.logic);
      this.banned = this.logic.players.map(() => null);
      this.lock();
    } else if (this.logic.players.length >= 2 && this.target > 2 && !this.countdownTimer) {
      this.startCountdown();
    }
    this.sync();
  }

  startCountdown() {
    this.startsAt = Date.now() + COUNTDOWN_MS;
    this.countdownTimer = this.clock.setTimeout(() => this.fillAndStart(), COUNTDOWN_MS);
  }

  clearCountdown() {
    if (this.countdownTimer) {
      this.countdownTimer.clear();
      this.countdownTimer = null;
    }
    this.startsAt = 0;
  }

  fillAndStart() {
    if (this.logic.phase !== "waiting") return;
    this.clearCountdown();
    const seats = Halma.SEATS_BY_COUNT[this.target];
    while (this.logic.players.length < this.target) {
      const seat = seats[this.logic.players.length % seats.length];
      Halma.addPlayer(this.logic, {
        id: `bot-${this.logic.players.length}`,
        name: `Bot ${Halma.CORNER_NAMES[seat]}`,
        isBot: true
      });
    }
    Halma.startGame(this.logic);
    this.banned = this.logic.players.map(() => null);
    this.lock();
    this.sync();
  }

  async onLeave(client, consented) {
    const id = client.sessionId;
    if (this.logic.phase === "playing") {
      const p = this.logic.players.find((x) => x.id === id);
      if (!p || p.isBot) return; // sudah jadi bot / tak ada

      // Putus tak sengaja: beri masa tenggang reconnect (B3).
      if (!consented) {
        p.disconnected = true;
        this.sync();
        try {
          await this.allowReconnection(client, RECONNECT_SECONDS);
          const back = this.logic.players.find((x) => x.id === id);
          if (back) back.disconnected = false;
          this.sync();
          return; // berhasil kembali
        } catch (e) {
          // tenggang habis -> jatuh ke konversi bot di bawah
        }
      }

      const gone = this.logic.players.find((x) => x.id === id);
      if (gone) {
        gone.isBot = true; // lanjut dgn bot
        gone.disconnected = false;
      }
      this.sync();
    } else {
      this.logic.players = this.logic.players.filter((x) => x.id !== id);
      // Reindex seat sesuai urutan baru (game belum mulai).
      const seats = Halma.SEATS_BY_COUNT[this.target];
      this.logic.players.forEach((p, i) => (p.seat = seats[i % seats.length]));
      if (this.logic.players.length < 2) this.clearCountdown();
      if (this.logic.players[0]) {
        this.setMetadata({
          gameId: "halma",
          host: this.logic.players[0].name,
          mode: this.gameMode,
          target: this.target
        });
      }
      this.sync();
    }
  }

  // Turbo: mode peringkat, semua MANUSIA sudah finis (posisi-array ada di
  // ranking). Sisa giliran cuma antar-bot — percepat (selaras client offline).
  isTurbo() {
    const L = this.logic;
    if (L.mode !== "ranking") return false;
    return L.players.every((p, i) => p.isBot || L.ranking.includes(i));
  }

  scheduleBot() {
    if (this.botTimer) {
      this.botTimer.clear();
      this.botTimer = null;
    }
    if (this.logic.phase !== "playing" || this.logic.winner) return;
    const idx = this.logic.currentIndex;
    const p = this.logic.players[idx];
    if (!p || !p.isBot) return;
    const delay = this.isTurbo() ? 120 : 620;
    this.botTimer = this.clock.setTimeout(() => {
      this.botTimer = null;
      if (this.logic.phase !== "playing" || this.logic.winner) return;
      const i = this.logic.currentIndex;
      const cur = this.logic.players[i];
      if (!cur || !cur.isBot) return;
      const m = pickBotMove(this.logic, i, BOT_LEVEL, this.banned[i]);
      if (m && Halma.move(this.logic, m.from, m.to)) {
        this.banned[i] = { from: m.from, to: m.to };
      }
      this.sync();
    }, delay);
  }

  sync() {
    const s = this.state;
    const L = this.logic;
    const active = L.phase === "playing" && !L.winner;

    s.phase = L.phase;
    s.currentTurn = active ? L.players[L.currentIndex].id : "";
    s.winner = L.winner || "";
    s.mode = L.mode;
    s.playerCount = L.playerCount;
    s.target = this.target;
    s.startsAt = this.startsAt || 0;
    s.code = this.code || "";

    for (const p of L.players) {
      let sp = s.players.get(p.id);
      if (!sp) {
        sp = new HalmaPlayer();
        s.players.set(p.id, sp);
      }
      sp.name = p.name;
      sp.isBot = p.isBot;
      sp.disconnected = !!p.disconnected;
      sp.seat = p.seat;
      sp.pieces.splice(0);
      p.pieces.forEach((h) => sp.pieces.push(h));
    }
    const ids = new Set(L.players.map((p) => p.id));
    for (const key of [...s.players.keys()]) {
      if (!ids.has(key)) s.players.delete(key);
    }

    s.ranking.splice(0);
    L.ranking.forEach((idx) => s.ranking.push(L.players[idx].name));

    const lm = L.lastMove;
    s.lastFrom = lm ? lm.from : -1;
    s.lastTo = lm ? lm.to : -1;
    s.lastSeat = lm ? lm.seat : -1;
    s.lastPath.splice(0);
    if (lm) lm.path.forEach((h) => s.lastPath.push(h));

    this.maybeRecordFinish();
    this.scheduleBot();
  }

  maybeRecordFinish() {
    if (this.recorded || !this.logic.winner) return;
    this.recorded = true;
    const players = this.logic.players.map((p) => ({ name: p.name }));
    hof
      .recordMatch({ gameId: "halma", players, winnerName: this.logic.winner })
      .catch((e) => console.error("[hof] catat halma gagal:", e.message));
  }
}

module.exports = { HalmaRoom };
