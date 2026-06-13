# Handoff — Arena Papan

> Catatan serah-terima antar sesi pengembangan. Perbarui file ini di akhir sesi.
> Terakhir diperbarui: 13 Juni 2026.

## Gambaran proyek

Kumpulan board game online (saat ini: Ular Tangga, mode online & lawan bot).

- Lokasi kode: folder `app/` (npm workspaces: `client` + `server`)
- **Client**: Vite + React + Phaser 3 + PWA → http://localhost:5173
- **Server**: Node + Express + Colyseus (WebSocket) → port 2567
  (hanya WebSocket + `/health`; tidak punya halaman `/` — itu normal)
- Jalankan keduanya: `cd app` lalu `npm run dev`
- GitHub: https://github.com/iwalislamuddin/yuk-main (branch `main`)

## Yang sudah dikerjakan (sesi 13 Juni 2026)

1. **Sistem aset grafis + animasi Ular Tangga** (siap pakai, menunggu file grafis):
   - Manifest: `app/client/src/games/snakes-ladders/assets.js`
     (daftar file, ukuran frame, konfigurasi animasi idle/walk)
   - Scene dirombak: `app/client/src/games/snakes-ladders/SnakesLaddersScene.js`
     - karakter pemain ber-sprite (idle + jalan, flip arah otomatis)
     - jalan kotak-per-kotak sesuai dadu, lalu meluncur di ular/tangga
     - animasi kocok dadu (frame acak + goyang) sebelum jalan
     - ular/tangga dari PNG (diputar + direntang otomatis), ular "bernapas"
     - antrean animasi (update server saat animasi jalan tidak tabrakan)
     - **fallback penuh**: tanpa file grafis, tampil vektor lama — aset bisa
       ditambah satu per satu
2. **Panduan aset untuk pembuat grafis**:
   `app/client/public/assets/snakes-ladders/PANDUAN-ASET.md`
   (format PNG, ukuran, layout spritesheet, penamaan, palet warna)
3. **Git + GitHub**: repo di-init di root, initial commit di-push ke `main`.

## Langkah berikutnya (belum dikerjakan)

- [ ] **User akan menyediakan file grafis** — taruh di
      `app/client/public/assets/snakes-ladders/` sesuai PANDUAN-ASET.md
      (`board.png`, `char-1..4.png`, `dice.png`, `snake.png`, `ladder.png`).
      Setelah ada, uji animasinya di mode lawan bot.
- [ ] Sistem aset & animasi **belum diuji visual** dengan aset sungguhan
      (baru lolos compile Vite + fallback). Cek terutama: arah putaran
      ular/tangga, titik tumpu kaki karakter, ukuran frame.
- [ ] TODO di `app/server/index.js`: endpoint Hall of Fame global
      (POST/GET `/hof`, simpan di SQLite/Postgres).
- [ ] Game berikutnya di roadmap: Ludo, Halma (lihat `registry.js` dan
      `gameServer.define` di server).

## Hal yang perlu diketahui

- Logika game ada dua salinan yang HARUS identik:
  `app/client/src/games/snakes-ladders/logic.js` (mode bot) dan
  `app/server/logic/snakesLadders.js` (mode online).
- PWA meng-cache semua PNG; batas total 6 MB (`vite.config.js`).
- Warning 404 di console untuk aset yang belum ada itu normal (by design).
- User berkomunikasi dalam Bahasa Indonesia; jika port 5173/2567 sudah
  terpakai, kemungkinan dev server lama masih jalan.
