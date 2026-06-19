const { Room } = require("colyseus");
const { LudoPlayer, LudoState } = require("./ludoSchema");
const Ludo = require("../logic/ludo");
const hof = require("../hof/store");

const COUNTDOWN_MS = 30_000; // jeda standby sebelum sisa kursi diisi bot
// Masa tenggang reconnect saat pemain terputus (B3). Override via env utk tes.
const RECONNECT_SECONDS = Number(process.env.RECONNECT_SECONDS) || 30;

// Seat (warna/sudut) yg dipakai per jumlah target. 2 pemain = DIAGONAL (seat 0
// vs 2) supaya tidak bersebelahan; 3/4 pakai urutan biasa.
const LUDO_SEATS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

/**
 * Room Ludo. Server otoritatif:
 * - dadu dilempar di server, langkah divalidasi di server,
 * - state plain (Ludo.logic) jadi sumber kebenaran, lalu dicermin ke schema.
 *
 * Fase B2 (bot-fill): room punya TARGET pemain (2..4, dipilih host & jadi
 * kriteria matchmaking lewat filterBy). Saat sudah ada >=2 manusia tapi belum
 * penuh dan target>2, jalan countdown 30 dtk; saat habis (atau host menekan
 * "Mulai sekarang") sisa kursi diisi BOT lalu game mulai. Bot dijalankan di
 * server (heuristik identik LocalBotController client).
 */
class LudoRoom extends Room {
  onCreate(options) {
    // Konfigurasi online DIPATOK (otoritatif): satu antrian per game supaya dua
    // pemain yang online berdekatan waktunya pasti mendarat di room yang sama
    // (tak ada lagi fragmentasi 2/3/4 × mode). Sisa kursi diisi bot.
    this.target = 4; // Ludo online selalu 4 pemain
    this.maxClients = this.target;
    this.gameMode = "ranking"; // online selalu mode peringkat
    this.logic = Ludo.createState(this.gameMode);

    // Room privat (B3): dibuat lewat client.create({private:true}); tak muncul di
    // matchmaking publik & lobi, hanya bisa digabung lewat KODE (roomId) -> joinById.
    if (options?.private) this.setPrivate(true);
    this.isPrivate = !!options?.private;
    this.startsAt = 0; // epoch ms akhir countdown (0 = tak ada)
    this.countdownTimer = null;
    this.botTimer = null;
    this.setState(new LudoState());

    this.onMessage("roll", (client) => {
      if (!this.isTurn(client.sessionId)) return;
      Ludo.roll(this.logic);
      this.sync();
    });
    this.onMessage("move", (client, msg) => {
      if (!this.isTurn(client.sessionId)) return;
      Ludo.move(this.logic, Number(msg?.token));
      this.sync();
    });
    // Host menekan "Mulai sekarang": isi sisa kursi dgn bot lalu mulai.
    this.onMessage("startNow", (client) => {
      if (this.logic.phase !== "waiting") return;
      if (this.logic.players.length < 2) return;
      if (this.logic.players[0]?.id !== client.sessionId) return; // host saja
      this.fillAndStart();
    });
  }

  isTurn(sessionId) {
    const p = Ludo.currentPlayer(this.logic);
    return this.logic.phase === "playing" && !this.logic.winner && p && p.id === sessionId;
  }

  onJoin(client, options) {
    const seat = LUDO_SEATS[this.target][this.logic.players.length];
    Ludo.addPlayer(this.logic, {
      id: client.sessionId,
      name: String(options?.name || "Pemain").slice(0, 16),
      isBot: false,
      seat
    });
    // Metadata untuk lobi (GET /lobby): host = pemain pertama.
    if (this.logic.players.length === 1) {
      this.setMetadata({
        gameId: "ludo",
        host: this.logic.players[0].name,
        mode: this.gameMode,
        target: this.target
      });
    }

    if (this.logic.players.length >= this.target) {
      // Penuh oleh manusia -> langsung mulai.
      this.clearCountdown();
      Ludo.startGame(this.logic);
      this.lock();
    } else if (this.logic.players.length >= 2 && this.target > 2 && !this.countdownTimer) {
      // Cukup utk mulai dgn bot: beri jeda standby.
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

  // Isi sisa kursi dengan bot, mulai game, kunci room.
  fillAndStart() {
    if (this.logic.phase !== "waiting") return;
    this.clearCountdown();
    while (this.logic.players.length < this.target) {
      const i = this.logic.players.length;
      const seat = LUDO_SEATS[this.target][i];
      Ludo.addPlayer(this.logic, {
        id: `bot-${i}`,
        name: `Bot ${Ludo.COLOR_NAMES[seat]}`,
        isBot: true,
        seat
      });
    }
    Ludo.startGame(this.logic);
    this.lock();
    this.sync();
  }

  async onLeave(client, consented) {
    const id = client.sessionId;
    if (this.logic.phase === "playing") {
      const p = this.logic.players.find((x) => x.id === id);
      if (!p || p.isBot) return; // sudah jadi bot / tak ada

      // Putus tak sengaja: beri masa tenggang reconnect (B3). Giliran pemain ini
      // tertahan (bot belum ambil alih) sampai dia kembali atau tenggang habis.
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

      // Keluar disengaja ATAU tenggang habis: lanjutkan dgn bot (2/3/4 pemain).
      const gone = this.logic.players.find((x) => x.id === id);
      if (gone) {
        gone.isBot = true;
        gone.disconnected = false;
      }
      this.sync();
    } else {
      // Masih menunggu: buang pemain & reindex kursi.
      this.logic.players = this.logic.players.filter((x) => x.id !== id);
      this.logic.players.forEach((p, i) => (p.index = LUDO_SEATS[this.target][i]));
      if (this.logic.players.length < 2) this.clearCountdown();
      if (this.logic.players[0]) {
        this.setMetadata({
          gameId: "ludo",
          host: this.logic.players[0].name,
          mode: this.gameMode,
          target: this.target
        });
      }
      this.sync();
    }
  }

  // Turbo: mode peringkat, semua MANUSIA sudah finis (posisi-array ada di
  // ranking). Sisa giliran cuma antar-bot menentukan juru kunci — percepat,
  // tak perlu ditonton lama (selaras LocalBotController client offline).
  isTurbo() {
    const L = this.logic;
    if (L.mode !== "ranking") return false;
    return L.players.every((p, i) => p.isBot || L.ranking.includes(i));
  }

  // Jalankan giliran bot di server (sekali per panggilan; rantai lewat sync).
  scheduleBot() {
    if (this.botTimer) {
      this.botTimer.clear();
      this.botTimer = null;
    }
    if (this.logic.phase !== "playing" || this.logic.winner) return;
    const p = Ludo.currentPlayer(this.logic);
    if (!p || !p.isBot) return;
    const turbo = this.isTurbo();
    const delay = turbo
      ? this.logic.dicePending
        ? 90
        : 130
      : this.logic.dicePending
        ? 650
        : 900;
    this.botTimer = this.clock.setTimeout(() => {
      this.botTimer = null;
      if (this.logic.phase !== "playing" || this.logic.winner) return;
      const cur = Ludo.currentPlayer(this.logic);
      if (!cur || !cur.isBot) return;
      if (!this.logic.dicePending) Ludo.roll(this.logic);
      else Ludo.move(this.logic, this.pickBotToken());
      this.sync();
    }, delay);
  }

  // Heuristik bot identik dgn client LocalBotController: utamakan makan lawan,
  // lalu pulangkan pion, lalu keluarkan dari kandang, sisanya dorong terdepan.
  pickBotToken() {
    const player = Ludo.currentPlayer(this.logic);
    const dice = this.logic.lastDice;
    let best = this.logic.legalTokens[0];
    let bestScore = -Infinity;

    for (const i of this.logic.legalTokens) {
      const from = player.tokens[i];
      const to = from === Ludo.YARD ? 0 : from + dice;
      const cell = Ludo.ringCell(player.index, to);

      let capture = false;
      if (cell !== null && !Ludo.SAFE_CELLS.has(cell)) {
        for (const other of this.logic.players) {
          if (other.index === player.index) continue;
          if (other.tokens.some((op) => Ludo.ringCell(other.index, op) === cell)) {
            capture = true;
          }
        }
      }

      const score =
        (capture ? 100 : 0) +
        (to === Ludo.HOME_STEP ? 60 : 0) +
        (from === Ludo.YARD ? 40 : 0) +
        to;

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  // Cermin state plain -> schema Colyseus.
  sync() {
    const s = this.state;
    const L = this.logic;
    const active = L.phase === "playing" && !L.winner;

    s.phase = L.phase;
    s.currentTurn = active ? L.players[L.currentIndex].id : "";
    s.lastDice = L.lastDice;
    s.dicePending = L.dicePending;
    s.winner = L.winner || "";
    s.mode = L.mode;
    s.target = this.target;
    s.startsAt = this.startsAt || 0;

    for (const p of L.players) {
      let sp = s.players.get(p.id);
      if (!sp) {
        sp = new LudoPlayer();
        s.players.set(p.id, sp);
      }
      sp.name = p.name;
      sp.isBot = p.isBot;
      sp.disconnected = !!p.disconnected;
      sp.index = p.index;
      for (let i = 0; i < 4; i++) sp.tokens[i] = p.tokens[i];
    }
    // Buang pemain yg sudah tidak ada (keluar saat menunggu).
    const ids = new Set(L.players.map((p) => p.id));
    for (const key of [...s.players.keys()]) {
      if (!ids.has(key)) s.players.delete(key);
    }

    s.legalTokens.splice(0);
    L.legalTokens.forEach((t) => s.legalTokens.push(t));

    s.ranking.splice(0);
    L.ranking.forEach((idx) => s.ranking.push(L.players[idx].name));

    this.maybeRecordFinish();
    this.scheduleBot();
  }

  // Catat hasil match ke Hall of Fame global saat ada pemenang (sekali, otoritatif).
  maybeRecordFinish() {
    if (this.recorded || !this.logic.winner) return;
    this.recorded = true;
    const players = this.logic.players.map((p) => ({ name: p.name }));
    hof
      .recordMatch({ gameId: "ludo", players, winnerName: this.logic.winner })
      .catch((e) => console.error("[hof] catat ludo gagal:", e.message));
  }
}

module.exports = { LudoRoom };
