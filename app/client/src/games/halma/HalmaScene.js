import Phaser from "phaser";
import {
  HOLES,
  STEP,
  HOME_HOLES,
  CORNER_COLORS,
  destinationsFrom
} from "./logic.js";
import { loadAssets, hasTexture, BOARD_KEY, MARBLE_KEY } from "./assets.js";

// ---------- Geometri papan bintang ----------
const SQRT3_2 = Math.sqrt(3) / 2;
const S = 40; // jarak antar lubang bersebelahan (px)
const CX = 280; // pusat papan (x)
const CY = 380; // pusat papan (y)
const HOLE_R = 15; // radius lubang
const MARBLE_R = 13; // radius kelereng vektor
const STEP_MS = 170; // durasi animasi per segmen langkah

// Pixel tiap lubang (q,r aksial -> layar). Dihitung sekali.
const HOLE_PX = HOLES.map((h) => ({
  x: CX + (h.q + h.r / 2) * S,
  y: CY + h.r * SQRT3_2 * S
}));

// Sudut rumah tiap lubang (0..5) atau -1 bila bukan lubang rumah.
const HOLE_HOME = (() => {
  const arr = new Array(HOLES.length).fill(-1);
  HOME_HOLES.forEach((ids, seat) => ids.forEach((id) => (arr[id] = seat)));
  return arr;
})();

// Pusat (centroid) tiap rumah sudut — untuk penanda giliran.
const HOME_CENTER = HOME_HOLES.map((ids) => {
  const x = ids.reduce((a, id) => a + HOLE_PX[id].x, 0) / ids.length;
  const y = ids.reduce((a, id) => a + HOLE_PX[id].y, 0) / ids.length;
  return { x, y };
});

function cssColor(n) {
  return "#" + n.toString(16).padStart(6, "0");
}
// Campur warna ke arah putih (amt 0..1) untuk tint terang.
function lighten(color, amt) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c) => Math.round(c + (255 - c) * amt);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

export default class HalmaScene extends Phaser.Scene {
  constructor(deps) {
    super("Halma");
    this.deps = deps;
    this.marbles = new Map(); // key `${seat}-${slot}` -> { obj, seat, slot }
    this.lastHole = new Map(); // key -> holeId terakhir (untuk deteksi gerak)
    this.reported = false;
  }

  preload() {
    loadAssets(this);
  }

  create() {
    this.animQueue = [];
    this.animating = false;
    this.committedView = null;
    this.selected = null; // { seat, slot, from } pion yg dipilih manusia
    this.destMarkers = []; // penanda tujuan (objek + holeId)
    this.selRing = null;
    this.turbo = false;
    this.shownRanking = 0;
    this.overlay = null;
    this.overlayItems = [];

    this.drawBoard();
    this.createUI();
    this.deps.controller.onUpdate((view) => this.renderState(view));
  }

  // ---------- Gambar papan ----------
  drawBoard() {
    const g = this.add.graphics();
    g.fillStyle(0xf7f1e3, 1);
    g.fillRoundedRect(8, 64, 544, 600, 18);

    if (hasTexture(this, BOARD_KEY)) {
      // Papan dari PNG (artis mengikuti tata letak di PANDUAN-ASET.md).
      this.add
        .image(CX, CY, BOARD_KEY)
        .setDisplaySize(13 * S, 15 * S)
        .setDepth(0);
    } else {
      this.drawVectorBoard(g);
    }

    // Penanda giliran: lingkaran berkedip di rumah pemain aktif.
    this.turnGlow = this.add
      .circle(0, 0, 2.4 * S, 0xffffff, 0.12)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(2)
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

  drawVectorBoard(g) {
    // Garis kisi tipis antar lubang bersebelahan. DIRS berpasangan lawan
    // (0/1, 2/3, 4/5), jadi iterasi arah genap saja menggambar tiap garis sekali.
    g.lineStyle(2, 0xe2d8bf, 1);
    for (let id = 0; id < HOLES.length; id++) {
      for (let d = 0; d < 6; d += 2) {
        const nb = STEP[id][d];
        if (nb !== -1) {
          g.lineBetween(HOLE_PX[id].x, HOLE_PX[id].y, HOLE_PX[nb].x, HOLE_PX[nb].y);
        }
      }
    }

    // Lubang: rumah diberi tint warna pemilik, lainnya krem.
    for (let id = 0; id < HOLES.length; id++) {
      const seat = HOLE_HOME[id];
      const fill = seat >= 0 ? lighten(CORNER_COLORS[seat], 0.55) : 0xffffff;
      const line = seat >= 0 ? CORNER_COLORS[seat] : 0xd8ccae;
      g.fillStyle(fill, 1);
      g.fillCircle(HOLE_PX[id].x, HOLE_PX[id].y, HOLE_R);
      g.lineStyle(seat >= 0 ? 2 : 1, line, 1);
      g.strokeCircle(HOLE_PX[id].x, HOLE_PX[id].y, HOLE_R);
    }
  }

  // ---------- UI atas ----------
  createUI() {
    this.turnText = this.add.text(16, 16, "Memuat...", {
      fontSize: "20px",
      color: "#143b30",
      fontFamily: "Fredoka, sans-serif",
      fontStyle: "bold"
    });
    this.infoText = this.add.text(16, 42, "", {
      fontSize: "13px",
      color: "#5c5246",
      fontFamily: "Fredoka, sans-serif"
    });
  }

  // ---------- Kelereng (pion) ----------
  // Inkremental: pemain online bisa bergabung belakangan, jadi tambahkan
  // kelereng untuk slot yg belum ada (bukan sekali jalan).
  ensureMarbles(view) {
    for (const p of view.players) {
      for (let slot = 0; slot < p.pieces.length; slot++) {
        const key = `${p.seat}-${slot}`;
        if (this.marbles.has(key)) continue;
        const hole = p.pieces[slot];
        this.marbles.set(key, this.makeMarble(p.seat, slot, hole));
        this.lastHole.set(key, hole);
      }
    }
  }

  makeMarble(seat, slot, hole) {
    const px = HOLE_PX[hole];
    const color = CORNER_COLORS[seat];
    let obj;
    if (hasTexture(this, MARBLE_KEY)) {
      obj = this.add
        .image(px.x, px.y, MARBLE_KEY)
        .setDisplaySize(2 * MARBLE_R + 4, 2 * MARBLE_R + 4)
        .setTint(color)
        .setDepth(10);
    } else {
      obj = this.add
        .circle(px.x, px.y, MARBLE_R, color)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(10);
      // kilau kecil
      const hi = this.add
        .circle(px.x - 4, px.y - 4, MARBLE_R * 0.32, 0xffffff, 0.6)
        .setDepth(11);
      obj.highlight = hi;
    }
    const marble = { obj, seat, slot };
    // Hit-area default Phaser (terpusat otomatis). Hit-area lingkaran kustom
    // ber-pusat (0,0) salah karena (0,0) = pojok kiri-atas ruang lokal objek,
    // bukan tengahnya (bikin area klik bergeser ke kiri-atas).
    obj
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onMarbleTap(seat, slot));
    return marble;
  }

  moveMarbleObj(marble, px) {
    marble.obj.setPosition(px.x, px.y);
    if (marble.obj.highlight) marble.obj.highlight.setPosition(px.x - 4, px.y - 4);
  }

  // ---------- Interaksi manusia ----------
  onMarbleTap(seat, slot) {
    if (this.isBusy()) return;
    const v = this.committedView;
    if (!v || v.turnId !== v.myId || v.winner) return;
    if (seat !== v.mySeat) return; // hanya pion sendiri

    // Klik pion yg sudah terpilih -> batalkan.
    if (this.selected && this.selected.slot === slot) {
      this.clearSelection();
      return;
    }
    this.selectPiece(v, slot);
  }

  selectPiece(view, slot) {
    this.clearSelection();
    const me = view.players.find((p) => p.id === view.myId);
    const from = me.pieces[slot];
    const occ = new Set();
    view.players.forEach((p) => p.pieces.forEach((h) => occ.add(h)));
    const dests = destinationsFrom(occ, from);
    if (dests.size === 0) return; // pion ini tak bisa jalan

    this.selected = { seat: view.mySeat, slot, from };
    const px = HOLE_PX[from];
    this.selRing = this.add
      .circle(px.x, px.y, MARBLE_R + 6)
      .setStrokeStyle(3, 0xffd43b)
      .setDepth(13);
    this.tweens.add({
      targets: this.selRing,
      scale: { from: 0.85, to: 1.12 },
      alpha: { from: 1, to: 0.5 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    for (const to of dests.keys()) {
      const dp = HOLE_PX[to];
      const marker = this.add
        .circle(dp.x, dp.y, 8, 0xffd43b, 0.9)
        .setStrokeStyle(2, 0xb97a1f)
        .setDepth(13)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.onDestTap(to));
      this.tweens.add({
        targets: marker,
        scale: { from: 0.7, to: 1.1 },
        duration: 550,
        yoyo: true,
        repeat: -1
      });
      this.destMarkers.push(marker);
    }
    // Angkat pion terpilih ke atas agar tak tertutup.
    const m = this.marbles.get(`${view.mySeat}-${slot}`);
    if (m) m.obj.setDepth(14);
  }

  onDestTap(to) {
    if (this.isBusy() || !this.selected) return;
    const from = this.selected.from;
    this.clearSelection();
    this.deps.controller.requestMove(from, to);
  }

  clearSelection() {
    if (this.selected) {
      const m = this.marbles.get(`${this.selected.seat}-${this.selected.slot}`);
      if (m) m.obj.setDepth(10);
    }
    this.selected = null;
    if (this.selRing) {
      this.selRing.destroy();
      this.selRing = null;
    }
    this.destMarkers.forEach((d) => d.destroy());
    this.destMarkers = [];
  }

  isBusy() {
    return this.animating || this.animQueue.length > 0;
  }

  isTurbo(view) {
    if (!view || view.mode !== "ranking" || view.winner) return false;
    if (!this.deps.controller.reset) return false; // hanya mode lawan bot
    const me = view.players.find((p) => p.id === view.myId);
    return !!me && me.finished;
  }

  // ---------- Antrean animasi ----------
  renderState(view) {
    this.ensureMarbles(view);

    const jobs = [];
    let anyReset = false;
    for (const p of view.players) {
      for (let slot = 0; slot < p.pieces.length; slot++) {
        const key = `${p.seat}-${slot}`;
        const next = p.pieces[slot];
        const prev = this.lastHole.get(key);
        if (prev === next) continue;
        this.lastHole.set(key, next);
        // Jalur animasi: pakai lastMove bila cocok (langkah terbaru), else snap.
        let path = null;
        const lm = view.lastMove;
        if (lm && lm.seat === p.seat && lm.from === prev && lm.to === next) path = lm.path;
        if (!path) anyReset = true;
        jobs.push({ key, to: next, path });
      }
    }

    if (jobs.length) {
      this.clearSelection();
    }
    // Reset/main-lagi: banyak pion pindah tanpa jalur -> snap semua.
    this.animQueue.push(...jobs, { type: "commit", view });
    this.processQueue();
  }

  processQueue() {
    if (this.animating) return;
    const job = this.animQueue.shift();
    if (!job) {
      this.maybeShowWinner();
      return;
    }
    if (job.type === "commit") {
      this.applyStatus(job.view);
      this.processQueue();
      return;
    }
    this.turbo = this.isTurbo(this.committedView);
    this.animating = true;
    const done = () => {
      this.animating = false;
      this.processQueue();
    };
    this.animateMarble(job).then(done);
  }

  animateMarble(job) {
    return new Promise((resolve) => {
      const marble = this.marbles.get(job.key);
      if (!marble) return resolve();
      const path = job.path;
      if (!path || path.length < 2) {
        // snap langsung (reset / koreksi)
        this.moveMarbleObj(marble, HOLE_PX[job.to]);
        return resolve();
      }
      if (this.turbo) {
        this.moveMarbleObj(marble, HOLE_PX[job.to]);
        return resolve();
      }
      // Animasi segmen demi segmen; segmen lompat (jarak 2) diberi efek 'hop'.
      const stepSeg = (i) => {
        if (i >= path.length) return resolve();
        const target = HOLE_PX[path[i]];
        const isJump = i >= 1 && this.holeDist(path[i - 1], path[i]) > 1.5;
        if (marble.obj.highlight) {
          this.tweens.add({
            targets: marble.obj.highlight,
            x: target.x - 4,
            y: target.y - 4,
            duration: STEP_MS,
            ease: "Sine.easeInOut"
          });
        }
        this.tweens.add({
          targets: marble.obj,
          x: target.x,
          y: target.y,
          duration: STEP_MS,
          ease: "Sine.easeInOut",
          onComplete: () => stepSeg(i + 1)
        });
        if (isJump) {
          this.tweens.add({
            targets: marble.obj,
            scale: { from: 1, to: 1.22 },
            duration: STEP_MS / 2,
            yoyo: true
          });
        }
      };
      stepSeg(1);
    });
  }

  holeDist(a, b) {
    const A = HOLES[a], B = HOLES[b];
    return (Math.abs(A.x - B.x) + Math.abs(A.y - B.y) + Math.abs(A.z - B.z)) / 2;
  }

  // ---------- Terapkan status (setelah animasi batch) ----------
  applyStatus(view) {
    this.committedView = view;
    this.updateTurnIndicator(view);

    if (view.phase === "waiting") {
      this.turnText.setText("Menunggu lawan...").setColor("#143b30");
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
        .setColor(current ? cssColor(CORNER_COLORS[current.seat]) : "#143b30");
      this.infoText.setText(
        myTurn ? "Ketuk pionmu, lalu ketuk titik tujuan." : "Menunggu lawan..."
      );
    }

    // Umumkan finisher baru (mode ranking).
    const ranking = view.ranking || [];
    if (ranking.length < this.shownRanking) this.shownRanking = ranking.length;
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

  updateTurnIndicator(view) {
    const cur =
      view.phase === "playing" && !view.winner && view.turnId
        ? view.players.find((p) => p.id === view.turnId)
        : null;
    if (!cur) {
      this.turnGlow.setVisible(false);
      return;
    }
    const c = HOME_CENTER[cur.seat];
    const col = CORNER_COLORS[cur.seat];
    this.turnGlow
      .setPosition(c.x, c.y)
      .setFillStyle(col, 0.12)
      .setStrokeStyle(4, col)
      .setVisible(true);
  }

  showToast(text) {
    const t = this.add
      .text(CX, 96, text, {
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

  // ---------- Overlay pemenang ----------
  maybeShowWinner() {
    const v = this.committedView;
    if (!v?.winner || this.overlay) return;
    if (this.isBusy()) return;
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
      add(
        this.add
          .text(280, 210, "HASIL AKHIR", {
            fontSize: "26px",
            color: "#ffffff",
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "bold"
          })
          .setOrigin(0.5)
      );
      const medals = ["🥇", "🥈", "🥉"];
      ranking.forEach((name, i) => {
        const mine = name === view.players.find((p) => p.id === view.myId)?.name;
        add(
          this.add
            .text(280, 262 + i * 46, `${medals[i] || `${i + 1}.`}  ${name}`, {
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
          .text(280, 262 + ranking.length * 46 + 16, this.deps.controller.reset ? "Ketuk untuk main lagi" : "Pertandingan selesai", {
            fontSize: "15px",
            color: "#d8e7df",
            fontFamily: "Fredoka, sans-serif"
          })
          .setOrigin(0.5)
      );
    } else {
      add(
        this.add
          .text(280, 312, `${view.winner} MENANG!`, {
            fontSize: "30px",
            color: "#ffffff",
            fontFamily: "Fredoka, sans-serif",
            fontStyle: "bold"
          })
          .setOrigin(0.5)
      );
      add(
        this.add
          .text(280, 356, this.deps.controller.reset ? "Ketuk untuk main lagi" : "Pertandingan selesai", {
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
