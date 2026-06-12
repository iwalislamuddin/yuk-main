# Panduan Aset Grafis — Ular Tangga (Arena Papan)

Taruh semua file PNG **langsung di folder ini**
(`client/public/assets/snakes-ladders/`). Game otomatis memakainya.

**Semua aset opsional.** Selama file belum ada, game tetap jalan dengan
grafis vektor bawaan, jadi kamu bisa menambahkannya satu per satu.
Warning 404 di console untuk file yang belum ada itu normal.

---

## Daftar file

| Nama file | Isi | Ukuran file (px) | Keterangan |
|---|---|---|---|
| `board.png` | Papan 10×10 | **960 × 960** | Ditampilkan 480×480 (ekspor 2× supaya tajam) |
| `char-1.png` | Karakter pemain 1 | **640 × 64** | Strip 10 frame @ 64×64 |
| `char-2.png` | Karakter pemain 2 | **640 × 64** | idem |
| `char-3.png` | Karakter pemain 3 | **640 × 64** | idem |
| `char-4.png` | Karakter pemain 4 | **640 × 64** | idem |
| `dice.png` | Muka dadu | **576 × 96** | Strip 6 frame @ 96×96, urut muka 1–6 |
| `snake.png` | Ular | **128 × 512** | Vertikal, kepala di ATAS |
| `ladder.png` | Tangga | **96 × 512** | Vertikal |

Penamaan: persis seperti tabel — huruf kecil, tanda hubung, ekstensi `.png`.

---

## Format & teknis umum

- **Format: PNG-24 dengan transparansi (alpha).** Jangan JPG (tidak ada
  transparansi). SVG tidak didukung loader.
- Warna: **sRGB**.
- Spritesheet: **strip horizontal satu baris**, frame berukuran PERSIS
  sama, **tanpa padding/margin/jarak antar frame**. Frame pertama di
  paling kiri.
- Kompres sebelum dipakai (TinyPNG / `pngquant`). Target **< 200 KB per
  file** — aplikasi ini PWA dan semua PNG ikut di-cache (batas total
  cache 6 MB).
- Sisakan ±2 px area transparan di tepi frame supaya tidak terpotong
  saat di-render.

---

## 1. Karakter pemain (`char-1.png` … `char-4.png`)

Strip 10 frame @ 64×64 px (total 640×64):

```
frame:   0   1   2   3   4   5   6   7   8   9
        [ idle (diam)  ] [ walk (jalan)         ]
```

- **Frame 0–3 = idle** (animasi diam: napas/kedip), diputar 6 fps, loop.
- **Frame 4–9 = walk** (siklus jalan lengkap), diputar 14 fps, loop.
- Karakter **menghadap KANAN**. Saat berjalan ke kiri, engine membalik
  otomatis (flip horizontal) — jadi desainnya jangan asimetris yang aneh
  kalau dibalik (mis. tulisan di baju).
- Karakter berdiri di **bagian bawah frame** (kaki ±5 px dari tepi
  bawah); titik tumpu yang dipakai engine ada di ~72% tinggi frame.
- Ditampilkan setinggi ±40 px di papan (sel papan 48 px) — buat siluet
  yang jelas, hindari detail halus.
- Keempat karakter harus mudah dibedakan dari jauh. Boleh ikut warna
  token lama biar konsisten: **biru #2563EB, merah #DC2626, hijau
  #16A34A, oranye #D97706**.

> Jumlah frame berbeda? (mis. idle 2 frame, walk 8 frame) — boleh,
> asal lebar frame tetap 64 px. Lalu sesuaikan `CHAR_ANIMS` dan
> `CHAR_FRAME` di `client/src/games/snakes-ladders/assets.js`.

## 2. Dadu (`dice.png`)

Strip 6 frame @ 96×96 px (total 576×96):

```
frame:    0    1    2    3    4    5
muka:     1    2    3    4    5    6
```

- Tiap frame = satu muka dadu, urut 1 sampai 6.
- Ditampilkan 48×48 px. Saat dikocok, engine mengacak frame + memutar
  dadu ±14°, lalu berhenti di muka hasilnya.
- Latar frame transparan; bentuk dadu boleh kotak membulat putih dengan
  pip (titik) gelap, mis. putih `#FFFFFF` + pip `#143B30`.

## 3. Ular (`snake.png`)

- Digambar **vertikal**: **kepala di ATAS**, ekor di bawah, memenuhi
  hampir seluruh tinggi canvas (128×512, rasio 1:4).
- Engine akan **memutar dan merentang** gambar ini mengikuti garis dari
  kotak kepala ke kotak ekor — panjang ular di papan berbeda-beda, jadi
  desainlah tubuh yang tetap bagus saat ditarik memanjang/memendek
  (lekukan S sederhana lebih aman daripada lilitan rumit).
- Lebar tampil di papan ±42 px.
- Warna kontras dengan papan krem: merah `#C0392B` / ungu / hijau tua.
  Hindari warna krem-kuning pucat.
- Satu desain dipakai untuk semua ular. Ular diberi animasi "bernapas"
  (melebar-menyempit halus) otomatis oleh engine.

## 4. Tangga (`ladder.png`)

- Digambar **vertikal** (96×512, rasio ~1:5), dua rel + anak tangga
  dengan jarak merata.
- Juga diputar + direntang oleh engine; jarak anak tangga akan ikut
  melar — itu wajar, buat minimal 8–10 anak tangga supaya tetap terlihat
  rapat.
- Lebar tampil di papan ±34 px.
- Warna kayu/oranye tua cocok dengan tema: `#B97A1F` / `#8A5A2B`,
  kontras dari ular.

## 5. Papan (`board.png`)

- 960×960 px, grid **10×10 sel @ 96 px**, tanpa margin — tepi gambar =
  tepi papan (engine menempel pas di area papan 480×480).
- **Sertakan nomor 1–100** di tiap sel (saat board.png dipakai, engine
  tidak menggambar nomor lagi). Penomoran **zig-zag mulai kiri-bawah**:
  baris terbawah 1→10 (kiri ke kanan), baris di atasnya 20→11 (jadi 11
  ada di kanan), dst. Kotak 100 di kiri-atas.
- **JANGAN gambar ular/tangga di papan** — keduanya ditempatkan engine
  sesuai data posisi (`logic.js`), supaya posisi visual selalu cocok
  dengan logika game.
- Palet tema aplikasi: krem `#F7F1E3`, sel terang `#FDF6E3`, sel gelap
  `#EFE3C8`, garis/aksen hijau tua `#143B30`, aksen oranye `#E8A13C`.
  Boleh menyimpang, tapi jaga selnya tetap terang supaya karakter, ular,
  dan tangga (yang digambar DI ATAS papan) tetap terbaca.

---

## Alur kerja

1. Ekspor PNG sesuai spesifikasi di atas, taruh di folder ini.
2. Refresh browser (dev server Vite memuat ulang otomatis).
3. Aset rusak/salah ukuran? Cek console: ukuran frame yang tidak pas
   membuat animasi tampak "tergeser". Pastikan dimensi file persis.
4. Mengubah jumlah frame, kecepatan animasi, durasi jalan/kocok:
   semua di `client/src/games/snakes-ladders/assets.js` dan konstanta
   `STEP_MS` / `SLIDE_MS` / `DICE_ROLL_MS` di `SnakesLaddersScene.js`.
