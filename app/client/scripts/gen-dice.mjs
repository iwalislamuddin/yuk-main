// Generator aset dadu (dice.png) — TANPA dependensi (pakai zlib bawaan Node).
// Menggambar strip 6 muka dadu 96×96 (total 576×96), dadu putih membulat
// dengan pip hijau tua, latar transparan. Anti-alias via supersampling 4×4.
//
// Jalankan:  node scripts/gen-dice.mjs
// Output  :  public/assets/snakes-ladders/dice.png  (+ salin ke ludo/)
//
// Spesifikasi mengikuti PANDUAN-ASET.md: 576×96, frame ke-i = muka (i+1),
// pip #143B30, dadu putih. Ditampilkan 48×48 di papan.
import { deflateSync } from "node:zlib";
import { writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAME = 96;
const FACES = 6;
const W = FRAME * FACES;
const H = FRAME;
const SS = 4; // faktor supersampling per sumbu (4×4 = 16 sampel/piksel)

// --- Warna (RGB) ---
const PIP = [20, 59, 48]; // #143B30
const BORDER = [38, 78, 64]; // hijau tua sedikit lebih terang untuk tepi
const TOP = [255, 255, 255]; // gradien atas
const BOT = [244, 239, 228]; // gradien bawah (#F4EFE4) — sedikit hangat

// Geometri muka dadu (koordinat lokal 0..96)
const C = FRAME / 2; // pusat 48
const HALF = 34; // setengah sisi dadu (sisi 68px)
const RAD = 14; // radius sudut membulat
const BORDER_W = 2.0; // tebal tepi
const PIP_R = 7.6; // radius pip
const D = 17; // jarak grid pip dari pusat

// Tata letak pip per muka, memakai sel grid 3×3 (kolom,baris) ∈ {-1,0,1}.
const G = {
  TL: [-1, -1], TC: [0, -1], TR: [1, -1],
  ML: [-1, 0], C: [0, 0], MR: [1, 0],
  BL: [-1, 1], BC: [0, 1], BR: [1, 1]
};
const FACE_PIPS = [
  ["C"], // 1
  ["TL", "BR"], // 2
  ["TL", "C", "BR"], // 3
  ["TL", "TR", "BL", "BR"], // 4
  ["TL", "TR", "C", "BL", "BR"], // 5
  ["TL", "TR", "ML", "MR", "BL", "BR"] // 6
];

// Signed distance ke kotak membulat berpusat di (C,C). <=0 berarti di dalam.
function roundedBoxSDF(x, y) {
  const px = Math.abs(x - C) - (HALF - RAD);
  const py = Math.abs(y - C) - (HALF - RAD);
  const qx = Math.max(px, 0);
  const qy = Math.max(py, 0);
  const outside = Math.hypot(qx, qy);
  const inside = Math.min(Math.max(px, py), 0);
  return outside + inside - RAD;
}

function lerp(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

// Warna+alpha satu sampel (koordinat lokal frame). Mengembalikan [r,g,b,a 0..1].
function sample(x, y, pips) {
  const d = roundedBoxSDF(x, y);
  if (d > 0) return [0, 0, 0, 0]; // di luar dadu → transparan

  // Pip?
  for (const name of pips) {
    const [gx, gy] = G[name];
    const dist = Math.hypot(x - (C + gx * D), y - (C + gy * D));
    if (dist <= PIP_R) return [PIP[0], PIP[1], PIP[2], 1];
  }

  // Tepi (border) atau badan dadu (gradien vertikal halus).
  if (d > -BORDER_W) return [BORDER[0], BORDER[1], BORDER[2], 1];
  const t = (y - (C - HALF)) / (2 * HALF); // 0 atas → 1 bawah
  const c = lerp(TOP, BOT, Math.min(Math.max(t, 0), 1));
  return [c[0], c[1], c[2], 1];
}

// --- Render ke buffer RGBA ---
const rgba = Buffer.alloc(W * H * 4);
for (let py = 0; py < H; py++) {
  for (let px = 0; px < W; px++) {
    const face = Math.floor(px / FRAME);
    const lx0 = px - face * FRAME; // x lokal dalam frame
    const pips = FACE_PIPS[face];
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const X = lx0 + (sx + 0.5) / SS;
        const Y = py + (sy + 0.5) / SS;
        const s = sample(X, Y, pips);
        // pra-kalikan alpha agar tepi anti-alias tidak berhalo gelap
        r += s[0] * s[3];
        g += s[1] * s[3];
        b += s[2] * s[3];
        a += s[3];
      }
    }
    const n = SS * SS;
    const A = a / n;
    const o = (py * W + px) * 4;
    // un-premultiply untuk simpan straight-alpha
    rgba[o] = A > 0 ? Math.round(r / a) : 0;
    rgba[o + 1] = A > 0 ? Math.round(g / a) : 0;
    rgba[o + 2] = A > 0 ? Math.round(b / a) : 0;
    rgba[o + 3] = Math.round(A * 255);
  }
}

// --- Encode PNG (RGBA, tanpa dependensi) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// 10,11,12 = compression/filter/interlace = 0
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filter type 0 (None)
  rgba.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

// --- Tulis ke kedua game (format dadu identik) ---
const targets = [
  resolve(HERE, "../public/assets/snakes-ladders/dice.png"),
  resolve(HERE, "../public/assets/ludo/dice.png")
];
mkdirSync(dirname(targets[0]), { recursive: true });
writeFileSync(targets[0], png);
mkdirSync(dirname(targets[1]), { recursive: true });
copyFileSync(targets[0], targets[1]);

console.log(`dice.png ${W}×${H} (${png.length} bytes) ditulis ke:`);
for (const t of targets) console.log("  " + t);
