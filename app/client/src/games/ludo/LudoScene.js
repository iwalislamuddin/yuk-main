import Phaser from "phaser";
import {
  START_INDEX,
  LAST_RING_STEP,
  HOME_STEP,
  YARD,
  SAFE_CELLS,
  PLAYER_COLORS
} from "./logic.js";
import { loadAssets, hasTexture, PIN_KEYS, DICE_KEY } from "./assets.js";

// ---------- Geometri papan (15x15) ----------
const COLS = 15;
const CELL = 36;
const BX = 10; // tepi kiri papan
const BY = 50; // tepi atas papan (sisakan ruang status di atas)

// 52 kotak lintasan utama, urut searah jarum jam. Index 0 = start pemain 0.
// (col, row) pada grid 15x15. Start tiap pemain berjarak 13 (lihat START_INDEX).
// prettier-ignore
const RING_COORDS = [
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],
  [0,6]
];

// Jalur pulang (home column) tiap pemain: 5 kotak menuju pusat.
// prettier-ignore
const HOME_COLS = [
  [[1,7],[2,7],[3,7],[4,7],[5,7]],       // 0 merah  (dari kiri)
  [[7,1],[7,2],[7,3],[7,4],[7,5]],       // 1 hijau  (dari atas)
  [[13,7],[12,7],[11,7],[10,7],[9,7]],   // 2 kuning (dari kanan)
  [[7,13],[7,12],[7,11],[7,10],[7,9]]    // 3 biru   (dari bawah)
];

// Slot kandang (yard) tiap pemain: 4 posisi di blok sudut 6x6.
// prettier-ignore
const YARDS = [
  [[1,1],[3,1],[1,3],[3,3]],         // 0 merah  (kiri-atas)
  [[10,1],[12,1],[10,3],[12,3]],     // 1 hijau  (kanan-atas)
  [[13,13],[11,13],[13,11],[11,11]], // 2 kuning (kanan-bawah)
  [[1,13],[3,13],[1,11],[3,11]]      // 3 biru   (kiri-bawah)
];

// Blok sudut tiap pemain [colMin,rowMin] (ukuran 6x6).
const BASES = [
  [0, 0],
  [9, 0],
  [9, 9],
  [0, 9]
];

const PLAYER_LIGHT = [0xf3b4b4, 0xb2e0c2, 0xf6e3a0, 0xb0c6f3];
const TOKEN_OFFSET = [
  [-5, -5],
  [5, -5],
  [-5, 5],
  [5, 5]
];

const STEP_MS = 200; // durasi jalan per kotak
const DICE_ROLL_MS = 650;
const TOKEN_R = 11; // radius token vektor

// Pusat papan (titik tengah blok pusat 3x3).
const CX = BX + 7.5 * CELL;
const CY = BY + 7.5 * CELL;

function cellCenter(col, row) {
  return { x: BX + col * CELL + CELL / 2, y: BY + row * CELL + CELL / 2 };
}

// 0xRRGGBB -> "#rrggbb" untuk warna teks.
function cssColor(n) {
  return "#" + n.toString(16).padStart(6, "0");
}

// Titik pixel untuk satu progress di jalur pemain (tanpa offset token).
function stepPoint(player, step) {
  if (step <= LAST_RING_STEP) {
    const [c, r] = RING_COORDS[(START_INDEX[player] + step) % RING_COORDS.length];
    return cellCenter(c, r);
  }
  if (step < HOME_STEP) {
    const [c, r] = HOME_COLS[player][step - 51];
    return cellCenter(c, r);
  }
  // step === HOME_STEP: pojok pusat sesuai arah pemain.
  const d = 0.55 * CELL;
  const dir = [
    [-d, 0],
    [0, -d],
    [d, 0],
    [0, d]
  ][player];
  return { x: CX + dir[0], y: CY + dir[1] };
}

// Posisi diam token (termasuk offset agar tumpukan terlihat).
function tokenRest(player, tokenIndex, progress) {
  const [ox, oy] = TOKEN_OFFSET[tokenIndex];
  if (progress === YARD) {
    const [c, r] = YARDS[player][tokenIndex];
    const p = cellCenter(c, r);
    return { x: p.x, y: p.y };
  }
  const p = stepPoint(player, progress);
  return { x: p.x + ox, y: p.y + oy };
}

export default class LudoScene extends Phaser.Scene {
  constructor(deps) {
    super("Ludo");
    this.deps = deps;
    this.tokens = new Map(); // key `${color}-${ti}` -> { obj, sprite, color, ti }
    this.lastProgress = new Map();
    this.highlights = [];
    this.reported = false;
  }

  preload() {
    loadAssets(this);
  }

  create() {
    this.animQueue = [];
    this.animating = false;
    this.prevDice = null;
    this.prevTurn = null;
    this.prevPending = null;
    this.latestView = null; // state terbaru dari logika (bisa mendahului animasi)
    this.committedView = null; // state yang sedang DITAMPILKAN (mengikuti animasi)
    this.playerCount = 0;
    this.turbo = false; // percepat animasi (mode ranking, hanya bot tersisa)
    this.shownRanking = 0; // jumlah finisher yang sudah diumumkan
    this.overlayItems = []; // objek overlay akhir (untuk dibersihkan saat main lagi)

    this.drawBoard();
    this.createUI();
    this.deps.controller.onUpdate((view) => this.renderState(view));
  }

  // ---------- Gambar papan ----------

  drawBoard() {
    if (hasTexture(this, "board")) {
      this.add
        .image(BX, BY, "board")
        .setOrigin(0)
        .setDisplaySize(CELL * COLS, CELL * COLS);
      return;
    }

    const g = this.add.graphics();
    g.fillStyle(0xf7f1e3, 1);
    g.fillRect(BX, BY, CELL * COLS, CELL * COLS);

    // Blok sudut (basis pemain).
    BASES.forEach(([c0, r0], i) => {
      g.fillStyle(PLAYER_LIGHT[i], 1);
      g.fillRect(BX + c0 * CELL, BY + r0 * CELL, 6 * CELL, 6 * CELL);
      // Kotak putih tempat kandang.
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(
        BX + (c0 + 1) * CELL,
        BY + (r0 + 1) * CELL,
        4 * CELL,
        4 * CELL,
        10
      );
      // Empat sarang token.
      YARDS[i].forEach(([c, r]) => {
        const p = cellCenter(c, r);
        g.fillStyle(PLAYER_LIGHT[i], 1);
        g.fillCircle(p.x, p.y, TOKEN_R + 3);
        g.lineStyle(2, PLAYER_COLORS[i], 1);
        g.strokeCircle(p.x, p.y, TOKEN_R + 3);
      });
    });

    // Kotak lintasan utama.
    RING_COORDS.forEach(([c, r], idx) => {
      let fill = 0xffffff;
      const startOwner = START_INDEX.indexOf(idx);
      if (startOwner >= 0) fill = PLAYER_LIGHT[startOwner];
      else if (SAFE_CELLS.has(idx)) fill = 0xf3ead0;
      this.drawCell(g, c, r, fill);
    });

    // Bintang di kotak aman (selain kotak start).
    SAFE_CELLS.forEach((idx) => {
      if (START_INDEX.indexOf(idx) >= 0) return;
      const [c, r] = RING_COORDS[idx];
      const p = cellCenter(c, r);
      this.add
        .star(p.x, p.y, 5, 5, 11, 0xcbb26a)
        .setDepth(1);
    });

    // Jalur pulang berwarna tiap pemain.
    HOME_COLS.forEach((cells, i) => {
      cells.forEach(([c, r]) => this.drawCell(g, c, r, PLAYER_LIGHT[i]));
    });

    // Pusat: empat segitiga warna pemain.
    this.drawCenter();

    // Garis tepi papan.
    g.lineStyle(3, 0x143b30, 1);
    g.strokeRect(BX, BY, CELL * COLS, CELL * COLS);
  }

  drawCell(g, col, row, fill) {
    const x = BX + col * CELL;
    const y = BY + row * CELL;
    g.fillStyle(fill, 1);
    g.fillRect(x, y, CELL, CELL);
    g.lineStyle(1, 0xd8ccae, 1);
    g.strokeRect(x, y, CELL, CELL);
  }

  drawCenter() {
    const tl = { x: BX + 6 * CELL, y: BY + 6 * CELL };
    const br = { x: BX + 9 * CELL, y: BY + 9 * CELL };
    const tr = { x: br.x, y: tl.y };
    const bl = { x: tl.x, y: br.y };
    const c = { x: CX, y: CY };
    const tri = (a, b, color) => {
      const t = this.add.triangle(0, 0, a.x, a.y, b.x, b.y, c.x, c.y, color);
      t.setOrigin(0, 0).setDepth(1);
    };
    tri(tl, tr, PLAYER_COLORS[1]); // atas  - hijau
    tri(tr, br, PLAYER_COLORS[2]); // kanan - kuning
    tri(br, bl, PLAYER_COLORS[3]); // bawah - biru
    tri(bl, tl, PLAYER_COLORS[0]); // kiri  - merah
  }

  // ---------- UI bawah ----------

  createUI() {
    this.turnText = this.add.text(BX, 12, "Memuat...", {
      fontSize: "19px",
      color: "#143b30",
      fontFamily: "Fredoka, sans-serif",
      fontStyle: "bold"
    });
    this.infoText = this.add.text(BX + 240, 18, "", {
      fontSize: "13px",
      color: "#5c5246",
      fontFamily: "Fredoka, sans-serif"
    });

    const cy = 638;
    this.rollBtn = this.add
      .rectangle(BX + 150, cy, 240, 56, 0xe8a13c)
      .setStrokeStyle(2, 0xb97a1f)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.isBusy()) return; // jangan kocok saat pion masih bergerak
        this.deps.controller.requestRoll();
      });
    this.rollLabel = this.add
      .text(BX + 150, cy, "KOCOK DADU", {
        fontSize: "18px",
        color: "#3b2a08",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.add.rectangle(BX + 380, cy, 56, 56, 0xffffff).setStrokeStyle(2, 0x143b30);
    if (hasTexture(this, DICE_KEY)) {
      this.diceSprite = this.add.sprite(BX + 380, cy, DICE_KEY, 0).setDisplaySize(48, 48);
    }
    this.diceText = this.add
      .text(BX + 380, cy, "-", {
        fontSize: "26px",
        color: "#143b30",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setVisible(!this.diceSprite);

    // Penanda giliran: bingkai berkedip di sekeliling basis pemain aktif.
    this.turnGlow = this.add
      .rectangle(0, 0, 6 * CELL, 6 * CELL, 0xffffff, 0.18)
      .setStrokeStyle(5, 0xffffff)
      .setDepth(8)
      .setVisible(false);
    this.tweens.add({
      targets: this.turnGlow,
      alpha: { from: 1, to: 0.3 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  // Pindahkan & warnai penanda giliran ke basis pemain yang sedang giliran.
  updateTurnIndicator(view) {
    const cur =
      view.phase === "playing" && !view.winner && view.turnId
        ? view.players.find((p) => p.id === view.turnId)
        : null;
    if (!cur) {
      this.turnGlow.setVisible(false);
      return;
    }
    const [c0, r0] = BASES[cur.color];
    const col = PLAYER_COLORS[cur.color];
    this.turnGlow
      .setPosition(BX + (c0 + 3) * CELL, BY + (r0 + 3) * CELL)
      .setFillStyle(col, 0.18)
      .setStrokeStyle(5, col)
      .setVisible(true);
  }

  // ---------- Token ----------

  ensureTokens(view) {
    if (view.players.length === this.playerCount) return;
    this.playerCount = view.players.length;
    for (const p of view.players) {
      for (let ti = 0; ti < 4; ti++) {
        const key = `${p.color}-${ti}`;
        if (this.tokens.has(key)) continue;
        const token = this.makeToken(p.color, ti, p.tokens[ti]);
        this.tokens.set(key, token);
        this.lastProgress.set(key, p.tokens[ti]);
      }
    }
  }

  makeToken(color, ti, progress) {
    const pt = tokenRest(color, ti, progress);
    const token = { color, ti, sprite: false };
    if (hasTexture(this, PIN_KEYS[color])) {
      const img = this.add
        .image(pt.x, pt.y, PIN_KEYS[color])
        .setDisplaySize(26, 30)
        .setOrigin(0.5, 0.78)
        .setDepth(10);
      token.obj = img;
      token.sprite = true;
    } else {
      const circle = this.add
        .circle(pt.x, pt.y, TOKEN_R, PLAYER_COLORS[color])
        .setStrokeStyle(2, 0xffffff)
        .setDepth(10);
      token.obj = circle;
    }
    token.obj
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onTokenTap(color, ti));
    return token;
  }

  onTokenTap(color, ti) {
    if (this.isBusy()) return;
    const v = this.committedView;
    if (!v || v.turnId !== v.myId || !v.dicePending) return;
    if (color !== v.myIndex) return;
    if (!v.legalTokens.includes(ti)) return;
    this.deps.controller.requestMove(ti);
  }

  isBusy() {
    return this.animating || this.animQueue.length > 0;
  }

  // Percepat animasi: hanya mode ranking lawan bot, saat kamu (manusia) sudah
  // selesai sehingga yang tersisa di arena hanyalah bot.
  isTurbo(view) {
    if (!view || view.mode !== "ranking" || view.winner) return false;
    if (!this.deps.controller.reset) return false; // hanya berlaku mode lawan bot
    const me = view.players.find((p) => p.id === view.myId);
    return !!me && me.finished;
  }

  // ---------- Antrean animasi ----------

  processQueue() {
    if (this.animating) return;
    const job = this.animQueue.shift();
    if (!job) {
      this.maybeShowWinner();
      return;
    }
    // Penanda commit: terapkan status/giliran SETELAH animasi batch ini selesai.
    if (job.type === "commit") {
      this.applyStatus(job.view);
      this.processQueue();
      return;
    }
    // Turbo dihitung dari state yang sedang TAMPIL (sebelum batch ini), jadi
    // langkah penyelesaian kamu sendiri tetap normal; setelah itu bot dipercepat.
    this.turbo = this.isTurbo(this.committedView);
    this.animating = true;
    const done = () => {
      this.animating = false;
      this.processQueue();
    };

    if (job.type === "dice") this.playDiceRoll(job.dice).then(done);
    else if (job.type === "walk") this.walkToken(job).then(done);
    else if (job.type === "out") this.outToken(job).then(done);
    else this.snapToken(job).then(done); // "yard" (dimakan/reset) atau snap
  }

  playDiceRoll(value) {
    return new Promise((resolve) => {
      if (!value) return resolve();
      if (this.turbo) {
        // Tanpa animasi kocok: langsung tampilkan hasil.
        if (this.diceSprite) this.diceSprite.setFrame(value - 1);
        else this.diceText.setText(String(value));
        return resolve();
      }
      const ticks = Math.floor(DICE_ROLL_MS / 80);
      if (this.diceSprite) {
        this.time.addEvent({
          delay: 80,
          repeat: ticks - 1,
          callback: () => this.diceSprite.setFrame(Phaser.Math.Between(0, 5))
        });
        this.tweens.add({
          targets: this.diceSprite,
          angle: { from: -14, to: 14 },
          duration: 90,
          yoyo: true,
          repeat: Math.floor(DICE_ROLL_MS / 180)
        });
        this.time.delayedCall(DICE_ROLL_MS, () => {
          this.diceSprite.setAngle(0).setFrame(value - 1);
          resolve();
        });
      } else {
        this.time.addEvent({
          delay: 80,
          repeat: ticks - 1,
          callback: () => this.diceText.setText(String(Phaser.Math.Between(1, 6)))
        });
        this.time.delayedCall(DICE_ROLL_MS, () => {
          this.diceText.setText(String(value));
          resolve();
        });
      }
    });
  }

  walkToken(job) {
    return new Promise((resolve) => {
      const token = job.token;
      const [ox, oy] = TOKEN_OFFSET[token.ti];
      if (this.turbo) {
        // Langsung lompat ke kotak tujuan (tanpa langkah per kotak).
        const base = stepPoint(token.color, job.to);
        this.tweens.add({
          targets: token.obj,
          x: base.x + ox,
          y: base.y + oy,
          duration: 90,
          onComplete: resolve
        });
        return;
      }
      const stepTo = (n) => {
        if (n > job.to) return resolve();
        const base = stepPoint(token.color, n);
        this.tweens.add({
          targets: token.obj,
          x: base.x + ox,
          y: base.y + oy,
          duration: STEP_MS,
          ease: "Sine.easeInOut",
          onComplete: () => stepTo(n + 1)
        });
      };
      stepTo(job.from + 1);
    });
  }

  // Keluar kandang: lompatan ke kotak start.
  outToken(job) {
    return new Promise((resolve) => {
      const pt = tokenRest(job.token.color, job.token.ti, job.to);
      this.tweens.add({
        targets: job.token.obj,
        x: pt.x,
        y: pt.y,
        duration: this.turbo ? 90 : 320,
        ease: this.turbo ? "Linear" : "Back.easeOut",
        onComplete: resolve
      });
    });
  }

  // Pindah cepat (dimakan -> balik kandang, atau reset/snap).
  snapToken(job) {
    return new Promise((resolve) => {
      const pt = tokenRest(job.token.color, job.token.ti, job.to);
      this.tweens.add({
        targets: job.token.obj,
        x: pt.x,
        y: pt.y,
        duration: this.turbo ? 90 : 300,
        ease: "Cubic.easeInOut",
        onComplete: resolve
      });
    });
  }

  // ---------- Render state ----------

  renderState(view) {
    this.latestView = view;
    this.ensureTokens(view);

    const diceJobs = [];
    const moveJobs = [];

    for (const p of view.players) {
      for (let ti = 0; ti < 4; ti++) {
        const key = `${p.color}-${ti}`;
        const token = this.tokens.get(key);
        if (!token) continue;
        const next = p.tokens[ti];
        const prev = this.lastProgress.get(key);
        if (prev === next) continue;
        this.lastProgress.set(key, next);

        if (prev === YARD && next >= 0) {
          moveJobs.push({ type: "out", token, to: next });
        } else if (next === YARD) {
          moveJobs.push({ type: "yard", token, to: next }); // dimakan / reset
        } else if (next > prev && prev >= 0) {
          moveJobs.push({ type: "walk", token, from: prev, to: next });
        } else {
          moveJobs.push({ type: "yard", token, to: next }); // snap aman
        }
      }
    }

    // Animasi kocok dadu (di depan langkah). Picu saat nilai/giliran/pending berubah.
    if (
      view.lastDice &&
      (view.lastDice !== this.prevDice ||
        view.turnId !== this.prevTurn ||
        view.dicePending !== this.prevPending)
    ) {
      diceJobs.push({ type: "dice", dice: view.lastDice });
    }
    this.prevDice = view.lastDice;
    this.prevTurn = view.turnId;
    this.prevPending = view.dicePending;

    // Pion bergerak (walk/out) didahulukan, lalu yang dimakan balik kandang.
    moveJobs.sort((a, b) => (a.type === "yard" ? 1 : 0) - (b.type === "yard" ? 1 : 0));

    // Selama pion bergerak: bekukan penanda giliran (jangan berpindah dulu),
    // matikan sorotan & tombol kocok. Penanda "commit" menerapkan status baru
    // setelah seluruh gerakan batch ini selesai.
    if (diceJobs.length || moveJobs.length) {
      this.clearHighlights();
      this.rollBtn.setFillStyle(0xcbbfa6);
    }
    this.animQueue.push(...diceJobs, ...moveJobs, { type: "commit", view });
    this.processQueue();
  }

  // Terapkan tampilan untuk satu state (dipanggil dari penanda commit, yaitu
  // SETELAH animasi gerakan menuju state ini selesai).
  applyStatus(view) {
    this.committedView = view;
    this.updateTurnIndicator(view);

    if (view.phase === "waiting") {
      this.turnText.setText("Menunggu pemain lain...").setColor("#143b30");
      this.infoText.setText("Buka tab/perangkat lain → Main online.");
    } else if (view.winner) {
      this.turnText.setText(`${view.winner} menang!`).setColor("#143b30");
      this.infoText.setText(
        this.deps.controller.reset ? "Ketuk papan untuk main lagi." : "Pertandingan selesai."
      );
    } else {
      const current = view.players.find((p) => p.id === view.turnId);
      const myTurn = view.turnId === view.myId;
      this.turnText
        .setText(myTurn ? "Giliranmu!" : `Giliran ${current?.name ?? "..."}`)
        .setColor(current ? cssColor(PLAYER_COLORS[current.color]) : "#143b30");
      if (myTurn) {
        this.infoText.setText(view.dicePending ? "Pilih pion yang berkedip." : "Ketuk KOCOK DADU.");
      } else {
        this.infoText.setText("Menunggu lawan...");
      }
    }

    this.refreshDiceFace(view);
    const canRoll =
      view.phase === "playing" &&
      !view.winner &&
      view.turnId === view.myId &&
      !view.dicePending &&
      !this.isBusy(); // masih ada gerakan lain mengantre -> tetap nonaktif
    this.rollBtn.setFillStyle(canRoll ? 0xe8a13c : 0xcbbfa6);
    this.rollLabel.setText(view.dicePending && view.turnId === view.myId ? "PILIH PION" : "KOCOK DADU");

    this.updateHighlights(view);

    // Umumkan finisher baru (mode ranking). Saat game selesai, overlay akhir
    // yang menampilkan peringkat lengkap, jadi toast dilewati.
    const ranking = view.ranking || [];
    if (ranking.length < this.shownRanking) this.shownRanking = ranking.length; // main lagi
    while (this.shownRanking < ranking.length) {
      const place = this.shownRanking + 1;
      const name = ranking[this.shownRanking];
      this.shownRanking += 1;
      if (!view.winner) this.showToast(`🏁 ${name} finis di posisi ${place}!`);
    }

    if (view.winner && !this.reported) {
      this.reported = true;
      const me = view.players.find((p) => p.id === view.myId);
      this.deps.onGameOver?.({ iWon: view.winner === me?.name });
    }
  }

  // Notifikasi singkat di atas papan (mis. "X finis di posisi 2!").
  showToast(text) {
    const t = this.add
      .text(280, 96, text, {
        fontSize: "17px",
        color: "#143b30",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold",
        backgroundColor: "#ffffff",
        padding: { x: 12, y: 7 }
      })
      .setOrigin(0.5)
      .setDepth(19)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: 84,
      duration: 220,
      yoyo: true,
      hold: 1100,
      onComplete: () => t.destroy()
    });
  }

  refreshDiceFace(view) {
    const dice = view?.lastDice;
    if (this.diceSprite) {
      if (dice) this.diceSprite.setFrame(dice - 1);
    } else {
      this.diceText.setText(dice ? String(dice) : "-");
    }
  }

  clearHighlights() {
    this.highlights.forEach((h) => h.destroy());
    this.highlights = [];
    this.tokens.forEach((t) => t.obj.setDepth(10)); // kembalikan layer normal
  }

  // Tandai pion yang boleh dipilih (saat giliranku & harus memilih).
  // Pion legal diangkat ke layer atas supaya tetap bisa diklik walau menumpuk.
  updateHighlights(view) {
    this.clearHighlights();
    if (!view || view.turnId !== view.myId || !view.dicePending) return;

    for (const ti of view.legalTokens) {
      const token = this.tokens.get(`${view.myIndex}-${ti}`);
      if (!token) continue;
      token.obj.setDepth(12); // di atas pion lawan yang menumpuk
      const ring = this.add
        .circle(token.obj.x, token.obj.y, TOKEN_R + 7)
        .setStrokeStyle(3, 0xffd43b)
        .setDepth(11)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.onTokenTap(view.myIndex, ti)); // klik glow juga memilih
      this.tweens.add({
        targets: ring,
        scale: { from: 0.85, to: 1.15 },
        alpha: { from: 1, to: 0.4 },
        duration: 600,
        yoyo: true,
        repeat: -1
      });
      this.highlights.push(ring);
    }
  }

  maybeShowWinner() {
    const v = this.committedView;
    if (!v?.winner || this.overlay) return;
    if (this.animating || this.animQueue.length > 0) return;
    this.showWinnerOverlay(v);
  }

  showWinnerOverlay(view) {
    if (this.overlay) return;
    const add = (obj) => {
      this.overlayItems.push(obj.setDepth(21));
      return obj;
    };
    this.overlay = this.add
      .rectangle(280, 340, 560, 680, 0x143b30, 0.6)
      .setDepth(20)
      .setInteractive();

    const ranking = view.ranking || [];
    if (view.mode === "ranking" && ranking.length) {
      // Mode peringkat: tampilkan papan juara 1..N.
      add(
        this.add
          .text(280, 196, "HASIL AKHIR", {
            fontSize: "26px",
            color: "#ffffff",
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "bold"
          })
          .setOrigin(0.5)
      );
      const medals = ["🥇", "🥈", "🥉", "4️⃣"];
      ranking.forEach((name, i) => {
        const mine = name === view.players.find((p) => p.id === view.myId)?.name;
        add(
          this.add
            .text(280, 250 + i * 46, `${medals[i] || `${i + 1}.`}  ${name}`, {
              fontSize: "23px",
              color: mine ? "#ffd43b" : "#ffffff",
              fontFamily: "Fredoka, sans-serif",
              fontStyle: "bold"
            })
            .setOrigin(0.5)
        );
      });
      add(
        this.add
          .text(280, 250 + ranking.length * 46 + 14, this.deps.controller.reset ? "Ketuk untuk main lagi" : "Pertandingan selesai", {
            fontSize: "15px",
            color: "#d8e7df",
            fontFamily: "Fredoka, sans-serif"
          })
          .setOrigin(0.5)
      );
    } else {
      add(
        this.add
          .text(280, 308, `${view.winner} MENANG!`, {
            fontSize: "30px",
            color: "#ffffff",
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "bold"
          })
          .setOrigin(0.5)
      );
      add(
        this.add
          .text(280, 352, this.deps.controller.reset ? "Ketuk untuk main lagi" : "Pertandingan selesai", {
            fontSize: "15px",
            color: "#d8e7df",
            fontFamily: "Fredoka, sans-serif"
          })
          .setOrigin(0.5)
      );
    }

    this.overlay.on("pointerdown", () => {
      if (!this.deps.controller.reset) return;
      this.deps.controller.reset();
      this.reported = false;
      this.shownRanking = 0;
      this.overlayItems.forEach((o) => o.destroy());
      this.overlayItems = [];
      this.overlay.destroy();
      this.overlay = null;
    });
  }
}
