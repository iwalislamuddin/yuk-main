# Panduan Aset Grafis — Halma bintang (Arena Papan)

Taruh semua file PNG **langsung di folder ini**
(`client/public/assets/halma/`). Game otomatis memakainya.

**Semua aset opsional.** Selama file belum ada, game tetap jalan dengan
grafis vektor bawaan, jadi kamu bisa menambahkannya satu per satu.
Warning 404 di console untuk file yang belum ada itu normal.

Papan Halma berbentuk **bintang enam sudut (hexagram)** berisi **121 lubang**.
Engine menempatkan kelereng (pion) sesuai data posisi (`logic.js`) — **jangan
menggambar kelereng di papan**, supaya posisi visual selalu cocok dengan logika.

---

## Daftar file

| Nama file | Isi | Ukuran file (px) | Keterangan |
|---|---|---|---|
| `board.png` | Papan bintang 6 sudut | **1040 × 1200** | Ditampilkan 520×600 (ekspor 2× supaya tajam) |
| `marble.png` | Satu kelereng (tampak atas) | **64 × 64** | **Putih/abu** — engine mewarnai per pemain dgn tint |

Penamaan: persis seperti tabel — huruf kecil, ekstensi `.png`.

---

## Format & teknis umum

- **Format: PNG-24 dengan transparansi (alpha).** Jangan JPG (tak ada
  transparansi). SVG tidak didukung loader.
- Warna: **sRGB**.
- Kompres sebelum dipakai (TinyPNG / `pngquant`). Target **< 200 KB per file**
  — aplikasi ini PWA dan semua PNG ikut di-cache (batas total cache 6 MB).
- Sisakan ±2 px area transparan di tepi supaya tidak terpotong saat render.

---

## 1. Kelereng (`marble.png`)

Satu gambar **kelereng tampak atas** berwarna **putih/abu netral**. Engine
memberi warna tiap pemain memakai **tint**, jadi cukup SATU file untuk semua
warna. Buat bentuk bulat dengan sedikit kilau/highlight agar terlihat seperti
kelereng kaca.

- Ukuran file 64×64 px; **ditampilkan ±30 px** di papan (lubang berjarak 40 px).
- Karena diwarnai dengan tint, gunakan **abu terang** (mis. `#E8E8E8`) sebagai
  warna dasar + highlight putih kecil; hindari warna pekat (tint jadi gelap).
- Latar transparan; isi kelereng menyentuh ±90% bingkai.

Warna pemain per sudut (0–5, searah jarum jam dari atas):
**Merah `#DC2626`, Oranye `#EA580C`, Hijau `#16A34A`, Sian `#0891B2`,
Biru `#2563EB`, Ungu `#9333EA`.**

> Tanpa file ini, kelereng tampil sebagai lingkaran berwarna bertepi putih
> (dengan kilau kecil).

## 2. Papan (`board.png`)

Bintang enam sudut. **Ditampilkan 520×600 px**, dipusatkan di tengah kanvas
(pusat papan pada titik `x=280, y=380` dari kanvas 560×680).

Tata letak lubang: **121 lubang** pada kisi segitiga, jarak antar lubang
bersebelahan **40 px** (pada ukuran tampil). Susunan = hexagon pusat (sisi 5
lubang) + 6 segitiga sudut (tiap sudut 10 lubang, baris 1-2-3-4).

- **6 sudut diberi warna pemiliknya** (warna di atas), pasangan seberang
  `(0,3) (1,4) (2,5)` adalah lawan main.
- Sudut **0 = ATAS**, lalu searah jarum jam: 1 kanan-atas, 2 kanan-bawah,
  3 bawah, 4 kiri-bawah, 5 kiri-atas.
- Beri lingkaran/lekukan kecil di tiap lubang agar kelereng terlihat "duduk".

> **Cara termudah menyelaraskan:** jalankan game tanpa `board.png` dulu untuk
> melihat posisi lubang persisnya (grafis vektor), lalu gambar papan PNG
> menimpa tata letak itu. Atau cukup sediakan latar bintang dekoratif — engine
> tetap menaruh kelereng di titik yang benar.

Palet tema: krem `#F7F1E3`, lubang krem `#FFFFFF`, garis kisi `#E2D8BF`,
aksen hijau tua `#143B30`, sorot kuning `#FFD43B`.

---

## Alur kerja

1. Ekspor PNG sesuai spesifikasi, taruh di folder ini.
2. Refresh browser (dev server Vite memuat ulang otomatis).
3. Aset rusak/salah ukuran? Cek console. Pastikan kelereng `marble.png`
   berwarna terang (karena di-tint), dan papan selaras dengan posisi lubang.
4. Mengubah ukuran tampil/jeda animasi: lihat konstanta di
   `client/src/games/halma/HalmaScene.js` (`S`, `HOLE_R`, `MARBLE_R`,
   `STEP_MS`) dan `client/src/games/halma/assets.js`.
