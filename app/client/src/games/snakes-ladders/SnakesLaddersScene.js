import Phaser from "phaser";
import { JUMPS, FINISH } from "./logic.js";
import {
  loadAssets,
  hasTexture,
  CHAR_KEYS,
  CHAR_FRAME,
  CHAR_ANIMS,
  DICE_KEY
} from "./assets.js";

const CELL = 48;
const COLS = 10;
const BX = 20; // tepi kiri papan
const BY = 70; // tepi atas papan
const TOKEN_COLORS = [0x2563eb, 0xdc2626, 0x16a34a, 0xd97706];
const TOKEN_OFFSETS = [
  [-9, -9],
  [9, -9],
  [-9, 9],
  [9, 9]
];

const TOKEN_HEIGHT = 40; // tinggi tampil sprite karakter (px)
const STEP_MS = 170; // durasi jalan per kotak
const SLIDE_MS = 520; // durasi meluncur di ular/tangga
const DICE_ROLL_MS = 650; // durasi animasi kocok dadu

// Nomor kotak (1-100) -> koordinat tengah kotak (penomoran zig-zag dari kiri bawah).
function cellCenter(n) {
  const idx = n - 1;
  const row = Math.floor(idx / COLS);
  let col = idx % COLS;
  if (row % 2 === 1) col = COLS - 1 - col;
  return {
    x: BX + col * CELL + CELL / 2,
    y: BY + (COLS - 1 - row) * CELL + CELL / 2
  };
}

// Posisi token: pos 0 = area MULAI di bawah papan.
function tokenPoint(pos, index) {
  if (pos <= 0) {
    return { x: 52 + index * 26, y: 600 };
  }
  const c = cellCenter(pos);
  const [dx, dy] = TOKEN_OFFSETS[index % TOKEN_OFFSETS.length];
  return { x: c.x + dx, y: c.y + dy };
}

export default class SnakesLaddersScene extends Phaser.Scene {
  constructor(deps) {
    super("SnakesLadders");
    this.deps = deps;
    this.tokens = new Map();
    this.reported = false;
  }

  preload() {
    // Aset yang belum disediakan hanya memunculkan warning 404 di console;
    // game tetap jalan dengan grafis vektor bawaan.
    loadAssets(this);
  }

  create() {
    this.animQueue = [];
    this.animating = false;
    this.lastPositions = new Map();
    this.jumpVisuals = new Map();
    this.prevDice = null;
    this.prevTurn = null;
    this.latestState = null;

    this.committedState = null; // state yang sedang DITAMPILKAN (mengikuti animasi)

    this.createAnimations();
    this.drawBoard();
    this.drawJumps();
    this.createUI();
    this.deps.controller.onUpdate((state) => this.renderState(state));
  }

  createAnimations() {
    for (const key of CHAR_KEYS) {
      if (!hasTexture(this, key)) continue;
      for (const [name, cfg] of Object.entries(CHAR_ANIMS)) {
        this.anims.create({
          key: `${key}-${name}`,
          frames: this.anims.generateFrameNumbers(key, {
            start: cfg.start,
            end: cfg.end
          }),
          frameRate: cfg.frameRate,
          repeat: cfg.repeat
        });
      }
    }
  }

  drawBoard() {
    if (hasTexture(this, "board")) {
      this.add
        .image(BX, BY, "board")
        .setOrigin(0)
        .setDisplaySize(CELL * COLS, CELL * COLS);
      return;
    }

    const g = this.add.graphics();
    for (let n = 1; n <= 100; n++) {
      const idx = n - 1;
      const row = Math.floor(idx / COLS);
      let col = idx % COLS;
      if (row % 2 === 1) col = COLS - 1 - col;
      const x = BX + col * CELL;
      const y = BY + (COLS - 1 - row) * CELL;
      g.fillStyle((row + col) % 2 === 0 ? 0xfdf6e3 : 0xefe3c8, 1);
      g.fillRect(x, y, CELL, CELL);
      this.add.text(x + 4, y + 3, String(n), {
        fontSize: "10px",
        color: "#9b8a6b"
      });
    }
    g.lineStyle(3, 0x143b30, 1);
    g.strokeRect(BX, BY, CELL * COLS, CELL * COLS);
  }

  drawJumps() {
    for (const [fromStr, to] of Object.entries(JUMPS)) {
      const from = Number(fromStr);
      const isLadder = to > from;
      const texKey = isLadder ? "ladder" : "snake";

      if (hasTexture(this, texKey)) {
        // Aset digambar vertikal (kepala ular / ujung atas tangga di atas),
        // lalu diputar dan direntang mengikuti garis antar kotak.
        const top = cellCenter(isLadder ? to : from);
        const bot = cellCenter(isLadder ? from : to);
        const dist = Phaser.Math.Distance.Between(top.x, top.y, bot.x, bot.y);
        const rot =
          Phaser.Math.Angle.Between(bot.x, bot.y, top.x, top.y) + Math.PI / 2;
        const img = this.add
          .image((top.x + bot.x) / 2, (top.y + bot.y) / 2, texKey)
          .setRotation(rot)
          .setDepth(isLadder ? 2 : 3);
        img.setDisplaySize(isLadder ? 34 : 42, dist + CELL * 0.4);
        this.jumpVisuals.set(from, img);

        if (!isLadder) {
          // Ular "bernapas" pelan supaya papan terasa hidup.
          this.tweens.add({
            targets: img,
            scaleX: img.scaleX * 1.1,
            duration: 900 + Math.random() * 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }
      } else {
        // Fallback: garis berwarna seperti semula.
        const a = cellCenter(from);
        const b = cellCenter(to);
        const lg = this.add.graphics();
        lg.lineStyle(isLadder ? 5 : 4, isLadder ? 0x2f9e44 : 0xc0392b, 0.7);
        lg.lineBetween(a.x, a.y, b.x, b.y);
        lg.fillStyle(isLadder ? 0x2f9e44 : 0xc0392b, 0.95);
        lg.fillCircle(a.x, a.y, isLadder ? 5 : 7); // kepala ular lebih besar
        lg.fillCircle(b.x, b.y, 4);
        this.jumpVisuals.set(from, lg);
      }
    }
  }

  createUI() {
    this.turnText = this.add.text(20, 12, "Memuat...", {
      fontSize: "19px",
      color: "#143b30",
      fontFamily: "Fredoka, sans-serif",
      fontStyle: "bold"
    });
    this.infoText = this.add.text(20, 40, "", {
      fontSize: "13px",
      color: "#5c5246",
      fontFamily: "Fredoka, sans-serif"
    });

    // Area MULAI (token pos 0 berdiri di sini).
    const pad = this.add.graphics();
    pad.fillStyle(0x143b30, 0.08);
    pad.fillRoundedRect(20, 562, 150, 64, 10);
    this.add
      .text(95, 568, "MULAI", {
        fontSize: "11px",
        color: "#143b30",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    // Tombol kocok dadu.
    this.rollBtn = this.add
      .rectangle(290, 594, 200, 56, 0xe8a13c)
      .setStrokeStyle(2, 0xb97a1f)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.isBusy()) return; // jangan kocok saat pin masih bergerak
        this.deps.controller.requestRoll();
      });
    this.add
      .text(290, 594, "KOCOK DADU", {
        fontSize: "17px",
        color: "#3b2a08",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // Kotak tampilan dadu: sprite bila ada asetnya, kalau tidak pakai teks.
    this.add.rectangle(444, 594, 56, 56, 0xffffff).setStrokeStyle(2, 0x143b30);
    if (hasTexture(this, DICE_KEY)) {
      this.diceSprite = this.add
        .sprite(444, 594, DICE_KEY, 0)
        .setDisplaySize(48, 48);
    }
    this.diceText = this.add
      .text(444, 594, "-", {
        fontSize: "26px",
        color: "#143b30",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setVisible(!this.diceSprite);
  }

  // ---------- Token ----------

  makeToken(index, pos) {
    const pt = tokenPoint(pos, index);
    const key = CHAR_KEYS[index % CHAR_KEYS.length];
    if (hasTexture(this, key)) {
      const scale = TOKEN_HEIGHT / CHAR_FRAME.frameHeight;
      const sprite = this.add
        .sprite(pt.x, pt.y, key, 0)
        .setScale(scale)
        .setOrigin(0.5, 0.72) // kaki karakter mendekati titik kotak
        .setDepth(10);
      const token = { obj: sprite, sprite: true, key, baseScale: scale };
      this.playTokenAnim(token, "idle");
      return token;
    }
    const circle = this.add
      .circle(pt.x, pt.y, 10, TOKEN_COLORS[index % TOKEN_COLORS.length])
      .setStrokeStyle(2, 0xffffff)
      .setDepth(10);
    return { obj: circle, sprite: false, baseScale: 1 };
  }

  playTokenAnim(token, name) {
    if (!token.sprite) return;
    const animKey = `${token.key}-${name}`;
    if (this.anims.exists(animKey)) token.obj.play(animKey, true);
  }

  // ---------- Antrean animasi ----------
  // Update state dari server/bot bisa datang saat animasi masih jalan,
  // jadi semua gerakan diantre dan diputar berurutan.

  isBusy() {
    return this.animating || this.animQueue.length > 0;
  }

  processQueue() {
    if (this.animating) return;
    const job = this.animQueue.shift();
    if (!job) {
      this.maybeShowWinner();
      return;
    }
    // Penanda commit: terapkan status/giliran SETELAH animasi batch ini selesai.
    if (job.type === "commit") {
      this.applyStatus(job.state);
      this.processQueue();
      return;
    }
    this.animating = true;
    const done = () => {
      this.animating = false;
      this.processQueue();
    };

    if (job.type === "dice") {
      this.playDiceRoll(job.dice).then(done);
    } else if (job.type === "snap") {
      this.tweenTo(job.token, tokenPoint(job.to, job.index), 380).then(done);
    } else {
      this.playDiceRoll(job.dice)
        .then(() => this.walkToken(job))
        .then(() => (job.raw !== job.to ? this.slideToken(job) : null))
        .then(done);
    }
  }

  tweenTo(token, pt, duration) {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: token.obj,
        x: pt.x,
        y: pt.y,
        duration,
        ease: "Cubic.easeOut",
        onComplete: resolve
      });
    });
  }

  playDiceRoll(value) {
    return new Promise((resolve) => {
      if (!value) return resolve();
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
          callback: () =>
            this.diceText.setText(String(Phaser.Math.Between(1, 6)))
        });
        this.time.delayedCall(DICE_ROLL_MS, () => {
          this.diceText.setText(String(value));
          resolve();
        });
      }
    });
  }

  // Jalan kotak-per-kotak dari from+1 sampai raw (hasil dadu murni).
  walkToken(job) {
    return new Promise((resolve) => {
      const token = job.token;
      this.playTokenAnim(token, "walk");
      const stepTo = (n) => {
        if (n > job.raw) {
          this.playTokenAnim(token, "idle");
          resolve();
          return;
        }
        const pt = tokenPoint(n, job.index);
        if (token.sprite) token.obj.setFlipX(pt.x < token.obj.x);
        this.tweens.add({
          targets: token.obj,
          x: pt.x,
          y: pt.y,
          duration: STEP_MS,
          ease: "Sine.easeInOut",
          onComplete: () => stepTo(n + 1)
        });
      };
      stepTo(job.from + 1);
    });
  }

  // Meluncur mengikuti ular/tangga dari kotak raw ke kotak to.
  slideToken(job) {
    return new Promise((resolve) => {
      const token = job.token;
      const pt = tokenPoint(job.to, job.index);
      const vis = this.jumpVisuals.get(job.raw);
      if (vis) {
        this.tweens.add({
          targets: vis,
          alpha: 0.35,
          duration: 130,
          yoyo: true,
          repeat: 2
        });
      }
      this.tweens.add({
        targets: token.obj,
        scale: token.baseScale * 1.2,
        duration: SLIDE_MS / 2,
        yoyo: true
      });
      this.tweens.add({
        targets: token.obj,
        x: pt.x,
        y: pt.y,
        duration: SLIDE_MS,
        ease: "Cubic.easeInOut",
        onComplete: resolve
      });
    });
  }

  // ---------- Render state ----------

  renderState(state) {
    this.latestState = state;
    const before = this.animQueue.length;
    let moved = false;

    state.players.forEach((p, i) => {
      let token = this.tokens.get(p.id);
      if (!token) {
        token = this.makeToken(i, p.pos);
        this.tokens.set(p.id, token);
        this.lastPositions.set(p.id, p.pos);
        return;
      }
      const prev = this.lastPositions.get(p.id);
      if (prev === p.pos) return;
      this.lastPositions.set(p.id, p.pos);
      moved = true;

      if (p.pos === 0) {
        // Reset/main lagi: langsung pindah ke area MULAI tanpa jalan.
        this.animQueue.push({ type: "snap", token, index: i, to: p.pos });
        return;
      }
      const dice = state.lastDice;
      const raw = prev + (dice || 0);
      const validWalk = dice && raw <= FINISH && raw === p.pos;
      const validJump = dice && raw <= FINISH && JUMPS[raw] === p.pos;
      if (validWalk || validJump) {
        this.animQueue.push({
          type: "move",
          token,
          index: i,
          from: prev,
          raw,
          to: p.pos,
          dice
        });
      } else {
        // Posisi tidak bisa direkonstruksi (mis. join di tengah match).
        this.animQueue.push({ type: "snap", token, index: i, to: p.pos });
      }
    });

    // Dadu dikocok tapi token tidak pindah (mis. lewat dari 100).
    if (
      !moved &&
      state.lastDice &&
      (state.lastDice !== this.prevDice || state.turnId !== this.prevTurn)
    ) {
      this.animQueue.push({ type: "dice", dice: state.lastDice });
    }
    this.prevDice = state.lastDice;
    this.prevTurn = state.turnId;

    // Jika ada animasi yang baru diantre, langsung nonaktifkan tombol kocok &
    // bekukan status sampai penanda "commit" di akhir batch — supaya giliran/
    // tombol tidak berpindah selagi pin lawan masih bergerak.
    if (this.animQueue.length > before) this.rollBtn.setFillStyle(0xcbbfa6);
    this.animQueue.push({ type: "commit", state });
    this.processQueue();
  }

  // Terapkan status (teks giliran, dadu, tombol) untuk satu state. Dipanggil
  // dari penanda commit, yaitu SETELAH animasi gerakan menuju state ini selesai.
  applyStatus(state) {
    this.committedState = state;

    // Teks status.
    if (state.phase === "waiting") {
      this.turnText.setText("Menunggu pemain lain...");
      this.infoText.setText("Buka tab atau perangkat lain, lalu pilih Main online.");
    } else if (state.winner) {
      this.turnText.setText(`${state.winner} menang!`);
      this.infoText.setText(
        this.deps.controller.reset
          ? "Ketuk papan untuk main lagi."
          : "Gunakan tombol Ganti mode untuk kembali."
      );
    } else {
      const current = state.players.find((p) => p.id === state.turnId);
      const myTurn = state.turnId === state.myId;
      this.turnText.setText(myTurn ? "Giliranmu!" : `Giliran ${current?.name ?? "..."}`);
      this.infoText.setText(myTurn ? "Ketuk KOCOK DADU." : "Menunggu lawan...");
    }

    // Dadu + tombol. Tombol tetap nonaktif bila masih ada gerakan mengantre.
    this.refreshDiceFace(state);
    const canRoll =
      state.phase === "playing" &&
      !state.winner &&
      state.turnId === state.myId &&
      !this.isBusy();
    this.rollBtn.setFillStyle(canRoll ? 0xe8a13c : 0xcbbfa6);

    // Lapor hasil sekali untuk Hall of Fame.
    if (state.winner && !this.reported) {
      this.reported = true;
      const me = state.players.find((p) => p.id === state.myId);
      this.deps.onGameOver?.({ iWon: state.winner === me?.name });
    }
  }

  refreshDiceFace(state = this.committedState) {
    const dice = state?.lastDice;
    if (this.diceSprite) {
      if (dice) this.diceSprite.setFrame(dice - 1);
    } else {
      this.diceText.setText(dice ? String(dice) : "-");
    }
  }

  // Overlay menang baru tampil setelah semua animasi gerak selesai.
  maybeShowWinner() {
    const state = this.committedState;
    if (!state?.winner || this.overlay) return;
    if (this.isBusy()) return;
    this.showWinnerOverlay(state);
  }

  showWinnerOverlay(state) {
    if (this.overlay) return;
    this.overlay = this.add
      .rectangle(260, 322, 520, 644, 0x143b30, 0.55)
      .setDepth(20)
      .setInteractive();
    this.overlayText = this.add
      .text(260, 290, `${state.winner} MENANG!`, {
        fontSize: "30px",
        color: "#ffffff",
        fontFamily: "Fredoka, sans-serif",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.overlaySub = this.add
      .text(
        260,
        334,
        this.deps.controller.reset ? "Ketuk untuk main lagi" : "Pertandingan selesai",
        {
          fontSize: "15px",
          color: "#d8e7df",
          fontFamily: "Fredoka, sans-serif"
        }
      )
      .setOrigin(0.5)
      .setDepth(21);

    this.overlay.on("pointerdown", () => {
      if (!this.deps.controller.reset) return;
      this.deps.controller.reset();
      this.reported = false;
      this.overlay.destroy();
      this.overlayText.destroy();
      this.overlaySub.destroy();
      this.overlay = null;
    });
  }
}
