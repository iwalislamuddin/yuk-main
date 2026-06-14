# Panduan Aset Grafis — Ludo (Arena Papan)

Taruh semua file PNG **langsung di folder ini**
(`client/public/assets/ludo/`). Game otomatis memakainya.

**Semua aset opsional.** Selama file belum ada, game tetap jalan dengan
grafis vektor bawaan, jadi kamu bisa menambahkannya satu per satu.
Warning 404 di console untuk file yang belum ada itu normal.

Papan Ludo berbentuk **salib pada grid 15×15**. Engine menempatkan pion
dan dadu sesuai data posisi (`logic.js`) — **jangan menggambar pion di
papan**, supaya posisi visual selalu cocok dengan logika game.

---

## Daftar file

| Nama file | Isi | Ukuran file (px) | Keterangan |
|---|---|---|---|
| `board.png` | Papan Ludo 15×15 | **1080 × 1080** | Ditampilkan 540×540 (ekspor 2× supaya tajam) |
| `pin-1.png` | Pion pemain 1 (Merah) | **96 × 112** | Tampak atas, satu gambar (bukan spritesheet) |
| `pin-2.png` | Pion pemain 2 (Hijau) | **96 × 112** | idem |
| `pin-3.png` | Pion pemain 3 (Kuning) | **96 × 112** | idem |
| `pin-4.png` | Pion pemain 4 (Biru) | **96 × 112** | idem |
| `dice.png` | Muka dadu | **576 × 96** | Strip 6 frame @ 96×96, urut muka 1–6 |

Penamaan: persis seperti tabel — huruf kecil, tanda hubung, ekstensi `.png`.

> **Dadu boleh dipakai bersama Ular Tangga.** Formatnya identik, jadi cukup
> salin `dice.png` dari `assets/snakes-ladders/` ke folder ini.

---

## Format & teknis umum

- **Format: PNG-24 dengan transparansi (alpha).** Jangan JPG (tidak ada
  transparansi). SVG tidak didukung loader.
- Warna: **sRGB**.
- Kompres sebelum dipakai (TinyPNG / `pngquant`). Target **< 200 KB per
  file** — aplikasi ini PWA dan semua PNG ikut di-cache (batas total
  cache 6 MB).
- Sisakan ±2 px area transparan di tepi supaya tidak terpotong saat render.

---

## 1. Pion / token (`pin-1.png` … `pin-4.png`)

Satu gambar **tampak atas** per warna (bukan spritesheet, tidak ada animasi).

- Ukuran file 96×112 px; **ditampilkan ±26×30 px** di papan (sel papan 36 px).
  Buat siluet jelas, hindari detail halus.
- Pion **berdiri di bagian bawah frame** (titik tumpu yang dipakai engine ada
  di ~78% tinggi gambar) — letakkan "kaki"/dasar pion mendekati tepi bawah.
- Empat warna harus mudah dibedakan dari jauh. Ikuti warna pemain:
  **Merah #DC2626, Hijau #16A34A, Kuning #EAB308, Biru #2563EB.**
- Saat giliranmu dan kamu harus memilih, engine memberi **cincin kuning
  berkedip** di sekeliling pion — jadi pion tak perlu efek sendiri.

> Tanpa file ini, pion tampil sebagai lingkaran berwarna bertepi putih.

## 2. Dadu (`dice.png`)

Strip 6 frame @ 96×96 px (total 576×96), **identik dengan dadu Ular Tangga**:

```
frame:    0    1    2    3    4    5
muka:     1    2    3    4    5    6
```

- Tiap frame = satu muka dadu, urut 1 sampai 6.
- Ditampilkan 48×48 px. Saat dikocok, engine mengacak frame + memutar dadu
  ±14°, lalu berhenti di muka hasilnya.
- Latar frame transparan; mis. dadu putih `#FFFFFF` + pip (titik) `#143B30`.

## 3. Papan (`board.png`)

1080×1080 px, grid **15×15 sel @ 72 px**, tanpa margin — tepi gambar = tepi
papan (engine menempel pas di area papan 540×540). Tata letak (kolom `c`
0–14 kiri→kanan, baris `r` 0–14 atas→bawah):

- **4 basis sudut, blok 6×6** (tempat kandang pion), beri warna pemainnya:
  - Kiri-atas `c0–5, r0–5` = **Merah**
  - Kanan-atas `c9–14, r0–5` = **Hijau**
  - Kanan-bawah `c9–14, r9–14` = **Kuning**
  - Kiri-bawah `c0–5, r9–14` = **Biru**
  Di tiap basis, sertakan 4 "sarang" lingkaran tempat pion menunggu, kira-kira
  di sel `(1,1) (3,1) (1,3) (3,3)` relatif blok.
- **Lintasan salib**: tiga lengan selebar 3 sel keluar dari pusat (atas, bawah,
  kiri, kanan). Sel lintasan berwarna putih dengan garis tipis.
- **Jalur pulang berwarna** (lajur tengah tiap lengan, 5 sel menuju pusat):
  Merah = `r7, c1–5`; Hijau = `c7, r1–5`; Kuning = `r7, c9–13`; Biru = `c7, r9–13`.
- **Kotak start** (beri warna pemainnya): Merah `(1,6)`, Hijau `(8,1)`,
  Kuning `(13,8)`, Biru `(6,13)`.
- **Kotak aman berbintang** (selain start): `(6,2) (12,6) (8,12) (2,8)`.
  Engine juga menggambar bintang di sini; kamu boleh menyelaraskannya.
- **Pusat 3×3** (`c6–8, r6–8`): empat segitiga bertemu di titik tengah,
  warnai per arah — atas Hijau, kanan Kuning, bawah Biru, kiri Merah.

Palet tema: krem `#F7F1E3`, sel terang `#FFFFFF`, garis sel `#D8CCAE`,
aksen hijau tua `#143B30`, aksen oranye `#E8A13C`, bintang `#CBB26A`.
Boleh menyimpang, tapi jaga sel lintasan tetap terang supaya pion (digambar
DI ATAS papan) tetap terbaca.

---

## Alur kerja

1. Ekspor PNG sesuai spesifikasi di atas, taruh di folder ini.
2. Refresh browser (dev server Vite memuat ulang otomatis).
3. Aset rusak/salah ukuran? Cek console. Untuk papan, pastikan grid 15×15
   pas tanpa margin; untuk pion, pastikan "kaki" di bawah agar tidak melayang.
4. Mengubah ukuran tampil pion, durasi jalan/kocok: lihat konstanta di
   `client/src/games/ludo/LudoScene.js` (`STEP_MS`, `DICE_ROLL_MS`,
   `TOKEN_R`) dan `client/src/games/ludo/assets.js`.
