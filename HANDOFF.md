# Handoff — Arena Papan

> Catatan serah-terima antar sesi pengembangan. Perbarui file ini di akhir sesi.
> Terakhir diperbarui: 13 Juni 2026 (sesi 2).

## Gambaran proyek

Kumpulan board game online (saat ini: Ular Tangga & Ludo, mode online & lawan bot).

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

## Yang sudah dikerjakan (sesi 2 — 13 Juni 2026)

1. **Game Ludo lengkap & bisa dimainkan** (offline: kamu vs 3 bot; online: 2 pemain):
   - Logika inti: `app/client/src/games/ludo/logic.js` (+ kembarannya
     `app/server/logic/ludo.js`). Aturan: keluar kandang wajib dadu 6,
     makan pion lawan, kotak aman (start + bintang), bonus giliran
     (6/makan/sampai rumah), tiga-6-beruntun hangus, menang kalau 4 pion pulang.
   - Scene Phaser: `app/client/src/games/ludo/LudoScene.js` — papan salib
     15×15, pion bisa diklik (highlight cincin emas saat harus memilih),
     animasi jalan/keluar-kandang/dimakan + kocok dadu. **Fallback vektor penuh.**
   - Penanda giliran: bingkai berkedip (glow) di basis pemain aktif + teks
     "Giliran ..." berwarna sesuai pemain.
   - UX: (a) pion legal diangkat ke layer atas + cincin glow bisa diklik supaya
     pion yang tertutup pion lawan tetap bisa dipilih; (b) penanda "commit" di
     akhir batch animasi → giliran/glow/dadu baru berpindah SETELAH pion selesai
     bergerak (tombol kocok nonaktif & input diabaikan selama animasi).
   - **Mode kemenangan** (dipilih sebelum mulai, di GamePage, khusus Ludo):
     `single` (pemenang pertama → game selesai) atau `ranking` (lanjut sampai
     juara 1..N). Logika di `logic.js`: `state.mode` + `state.ranking`
     (index urut finis); `advanceTurn` melewati yang sudah finis. Mode ranking
     lawan bot: setelah kamu (manusia) selesai & tinggal bot, animasi & langkah
     bot DIPERCEPAT (turbo) — di `LocalBotController.scheduleBot` (jeda pendek)
     dan `LudoScene` (turbo: dadu/jalan instan). Online: room di-`filterBy(["mode"])`
     supaya pemain dipasangkan sesuai mode (schema `mode`+`ranking` ditambahkan).
     Scene menampilkan toast saat ada yang finis + papan peringkat akhir di overlay.
   - Controller `LocalBotController.js` (heuristik bot sederhana) &
     `OnlineController.js`; room server `LudoRoom.js` + `ludoSchema.js`.
2. **GamePage dibuat sadar-banyak-game**: tiap game punya `index.js`
   (createGame + 2 controller), dipetakan di `app/client/src/pages/GamePage.jsx`
   (`GAME_MODULES`). Ular Tangga juga dapat `index.js` baru.
3. **Panduan aset Ludo**: `app/client/public/assets/ludo/PANDUAN-ASET.md`
   (board.png, pin-1..4.png, dice.png — dadu boleh disalin dari Ular Tangga).
4. Registry: Ludo `available: true`; server `gameServer.define("ludo", ...)`.
5. **Diverifikasi**: 9000 simulasi game acak (2/3/4 pemain) tuntas tanpa
   error/loop; tes terarah (makan, kotak aman, overshoot) lolos; build Vite
   bersih; **uji visual mode bot di browser** (papan, pion, dadu, pilih-pion,
   bot main — semua jalan; satu-satunya error console = 404 aset belum ada).

## Langkah berikutnya (belum dikerjakan)

- [ ] **User akan menyediakan file grafis** untuk KEDUA game:
      - Ular Tangga: `app/client/public/assets/snakes-ladders/` (PANDUAN-ASET.md)
        — `board.png`, `char-1..4.png`, `dice.png`, `snake.png`, `ladder.png`.
      - Ludo: `app/client/public/assets/ludo/` (PANDUAN-ASET.md)
        — `board.png`, `pin-1..4.png`, `dice.png` (dadu sama formatnya).
      Setelah ada, refresh & cek visual (titik tumpu pion, ukuran papan).
- [ ] Aset kedua game **belum diuji dengan grafis sungguhan** (baru fallback).
- [ ] TODO di `app/server/index.js`: endpoint Hall of Fame global
      (POST/GET `/hof`, simpan di SQLite/Postgres).
- [ ] Ludo online >2 pemain: naikkan `maxClients` di `LudoRoom` (default 2)
      & tangani pemain keluar di tengah main (kini hanya benar untuk 2 pemain).
- [ ] Game berikutnya di roadmap: Halma.

## Hal yang perlu diketahui

- Logika game ada dua salinan yang HARUS identik tiap game:
  - Ular Tangga: `client/src/games/snakes-ladders/logic.js` &
    `server/logic/snakesLadders.js`.
  - Ludo: `client/src/games/ludo/logic.js` & `server/logic/ludo.js`.
  (Bot offline pakai logika client; online pakai logika server — keduanya
  harus berperilaku sama.)
- **Pola tambah game baru**: folder `games/<id>/` berisi `logic.js`,
  `<Game>Scene.js`, `createGame.js`, `LocalBotController.js`,
  `OnlineController.js`, `index.js`; daftarkan di `GAME_MODULES`
  (GamePage.jsx) + `registry.js`; di server tambah `logic/`, `rooms/` +
  `gameServer.define`.
- Ludo: koordinat papan (RING_COORDS, home column, kandang) hanya ada di
  `LudoScene.js`; `logic.js` murni angka (progress 0–56). Kotak start tiap
  warna berjarak 13 di ring 52 kotak.
- PWA meng-cache semua PNG; batas total 6 MB (`vite.config.js`).
- Warning 404 di console untuk aset yang belum ada itu normal (by design).
- User berkomunikasi dalam Bahasa Indonesia; jika port 5173/2567 sudah
  terpakai, kemungkinan dev server lama masih jalan.
