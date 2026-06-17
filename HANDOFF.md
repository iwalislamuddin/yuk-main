# Handoff — Yuk Main

> Catatan serah-terima antar sesi pengembangan. Perbarui file ini di akhir sesi.
> Terakhir diperbarui: 18 Juni 2026 (sesi 5 — deploy SELESAI & LIVE di yukmain.web.id).
> Brand: **Yuk Main** (yukmain.web.id). Nama lama "Arena Papan" hanya tersisa di
> ID/paket internal (mis. `app/package.json` "arena-papan", `/health` server).

## Gambaran proyek

Kumpulan board game online (saat ini: Ular Tangga, Ludo, & Halma; mode online & lawan bot).

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

## Yang sudah dikerjakan (sesi 3 — 15 Juni 2026)

1. **Game Halma bintang (Chinese Checkers) lengkap & bisa dimainkan** (offline:
   kamu vs 1-2 bot; online: 2 pemain):
   - Papan = **bintang 6 sudut (hexagram) 121 lubang**, dimodelkan dgn
     **koordinat kubus hex** (x+y+z=0): hexagon pusat (61) + 6 segitiga sudut
     (6×10). Logika inti: `client/src/games/halma/logic.js` (+ kembarannya
     `server/logic/halma.js`, perilaku WAJIB identik). Aturan: tiap pemain 10
     pion di satu sudut → pindahkan SEMUA ke sudut seberang; langkah = geser ke
     lubang tetangga kosong ATAU **lompati pion (boleh berantai)**; tak ada yg
     dimakan. `destinationsFrom(occupied, from)` (BFS lompatan) jadi sumber
     langkah sah untuk bot, UI highlight, & validasi server.
   - **Sudut** (searah jarum jam dari atas): 0 atas, 1 kanan-atas, 2 kanan-bawah,
     3 bawah, 4 kiri-bawah, 5 kiri-atas; target = (seat+3)%6. 2 pemain=[0,3];
     3 pemain=[0,2,4] (target = 3 sudut kosong, seimbang). Warna per sudut.
   - **Bot 3 tingkat** (`LocalBotController.js`). PENTING: Halma itu BALAPAN &
     rantai lompatan sudah jadi SATU langkah → greedy 1-langkah dgn evaluasi
     bagus sudah kuat; **kedalaman minimax murni MENCUCI beda antar langkah →
     malah lemah** (sudah terbukti & dibuang). Maka tingkat dibedakan lewat
     KUALITAS evaluasi + kebijakan: Mudah=greedy+blunder acak; Normal=evaluasi
     penuh (abaikan laggard); Susah=evaluasi sadar-laggard + **lookahead 2-ply
     sebagai pemecah-seri** (tempo tetap primer). Evaluasi: jarak ke **lubang
     target terdekat yg masih kosong** (dinamis) + bonus pion menetap — kunci
     agar endgame konvergen (tidak mandek/oscillasi). Validasi turnamen di
     `server/logic/halma.bot.cjs`: **hard 24-0 & 26-3, normal 21-1** vs easy,
     ~0 timeout, 0.57 ms/langkah.
   - Scene Phaser `HalmaScene.js`: papan bintang vektor (kisi + lubang ber-tint
     sudut) + **fallback PNG** (board.png + marble.png yg di-tint per warna);
     pilih pion → titik tujuan kuning bisa diklik → animasi geser/lompat (hop);
     penanda giliran (lingkaran berkedip di rumah aktif), toast finisher,
     overlay pemenang/peringkat. Pola sama dgn LudoScene (antrean animasi +
     penanda "commit": giliran/seleksi berpindah SETELAH animasi selesai).
   - **Online**: `OnlineController.js` + `server/rooms/HalmaRoom.js` +
     `halmaSchema.js` (server otoritatif, validasi `move(from,to)`, kirim
     `lastMove`+path utk animasi). 2 pemain, `filterBy(["mode"])`.
   - GamePage: pemilih **kesulitan** (Mudah/Normal/Susah) + **jumlah pemain**
     (2/3); win-mode (single/ranking) muncul saat 3 pemain. Registry
     `available: true`; `gameServer.define("halma", ...)`.
2. **Diverifikasi**: invarian papan (121 lubang, tiap rumah 10, adjacency
   simetris) + ribuan simulasi game acak selesai tanpa loop
   (`server/logic/halma.test.cjs`); turnamen kekuatan bot
   (`server/logic/halma.bot.cjs`); build Vite bersih; **uji visual di browser**:
   papan 2p & 3p, pilih pion → tujuan, gerak + bot auto-main, giliran menunggu
   manusia, deteksi menang + overlay "main lagi". Satu-satunya error console =
   404 aset belum ada (by design).

## Yang sudah dikerjakan (sesi 4 — 16 Juni 2026)

**Fase 1 monetisasi: struktur situs publik + blog (untuk syarat AdSense).**
Keputusan strategi: rilis pakai **free host + beli domain**, nanti bisa upgrade
ke host berbayar untuk kapasitas. Agar lolos kebijakan AdSense, situs tidak boleh
"cuma game" — harus ada konten publik yang bisa dibaca crawler tanpa login.

1. **Routing dirombak** (`client/src/App.jsx`): NameGate **tidak lagi mengunci
   seluruh aplikasi**. Halaman publik (beranda, blog, tentang, privasi, hall of
   fame) bisa dibaca siapa pun (penting untuk SEO/AdSense). **Nama hanya diminta
   saat masuk permainan** (`/play/:gameId`) lewat helper `requireName`. Lobi
   (pemilih game) pindah dari `/` ke **`/lobi`**; `/` kini halaman Home publik.
   Nav baru: Beranda · Main · Blog · Tentang · Hall of Fame. Footer dapat tautan
   Tentang/Blog/Kebijakan Privasi. Route `*` → halaman 404.
2. **Halaman baru** (`client/src/pages/`): `Home.jsx` (hero + grid game + blurb
   "Tentang" + 3 artikel terbaru), `Blog.jsx` (daftar artikel), `Article.jsx`
   (render satu artikel), `About.jsx` (Tentang), `Privacy.jsx` (Kebijakan Privasi
   lengkap utk AdSense: data lokal/localStorage, cookie, Google AdSense + link
   opt-out), `NotFound.jsx`.
3. **Sistem blog tanpa backend** (`client/src/lib/blog.js`): artikel = file
   Markdown di `client/src/content/blog/*.md` dengan frontmatter (title/date/
   description/tags), dimuat via `import.meta.glob(..., { query:'?raw', eager })`,
   di-render dgn **marked + dompurify** (disanitasi — penting saat nanti isi dari
   CRUD). Helper `getPosts`/`getPost`/`renderMarkdown`/`formatTanggal`. 4 artikel
   awal: cara-main-ludo, sejarah-halma, tips-ular-tangga, panduan-main-online.
   **Pola tumbuh: tambah artikel = drop file .md baru** (auto muncul, terurut tgl).
4. **SEO**: `client/src/lib/seo.js` (`useSeo(title, desc)` set `<title>`+meta per
   halaman); `public/robots.txt` + `public/sitemap.xml` (berisi semua rute +
   artikel); `public/_redirects` (fallback SPA Cloudflare Pages/Netlify);
   `vite.config.js` dapat `navigateFallbackDenylist` utk robots/sitemap.
5. **Dependency baru** di `client`: `marked`, `dompurify`.
6. **Diverifikasi di browser** (dev 5173): beranda tampil tanpa gerbang nama,
   artikel render Markdown (heading/bold/list), deep-link `/blog/<slug>` jalan,
   Privasi memuat semua bagian + link opt-out Google/aboutads — nol error konsol;
   `vite build` bersih (140 modul).

> **(SELESAI di sesi 5):** placeholder `NAMADOMAINMU` → `yukmain.web.id` dan email
> `kontak@NAMADOMAINMU` → `kontak@yukmain.web.id` sudah diganti di robots/sitemap/
> About/Privacy. Sebelum ajukan AdSense (Fase 3): situs sudah live di domain +
> ada sedikit trafik.

## Yang sudah dikerjakan (sesi 5 — 17 Juni 2026)

**Persiapan Fase A (deploy) + rebrand ke "Yuk Main".**

1. **Rebrand penuh** "Arena Papan" → **"Yuk Main"** di semua teks yang terlihat
   user: `index.html`, `App.jsx` (header/footer), `NameGate.jsx`, `lib/seo.js`
   (BASE judul), `pages/` (Home/About/Blog/Privacy), `vite.config.js` manifest
   PWA (`name`/`short_name`), dan 4 artikel blog `.md`. ID/paket internal
   (`arena-papan`) sengaja dibiarkan agar tidak ada yang rusak.
2. **Domain diisi**: `NAMADOMAINMU` → `yukmain.web.id`, email → `kontak@yukmain.web.id`.
   `robots.txt` & `sitemap.xml` ditulis ulang bersih (komentar placeholder dibuang).
3. **Konfigurasi deploy dibuat**:
   - `DEPLOY.md` (root): panduan lengkap CF Pages + Render + custom domain
     (jalur Cloudflare Registrar vs Domainesia) + checklist AdSense.
   - `render.yaml` (root): blueprint server Colyseus (rootDir `app/server`,
     health `/health`, free tier — catatan cold-start ~50 dtk).
   - `app/.nvmrc` = 22; `app/client/.env.example` diperbarui (hint wss:// produksi).
4. **Diverifikasi (kode)**: `vite build` bersih (140 modul); preview live brand
   "Yuk Main" benar.
5. **Deploy DIEKSEKUSI & LIVE** (lanjutan sesi 5):
   - **Client → Cloudflare Pages**: preset None, root dir `app`, build
     `npm install && npm run build`, output `client/dist`. Node Cloudflare = **22**.
   - **Server → Render** (blueprint `render.yaml`) → `wss://yuk-main-server.onrender.com`
     (free tier — cold-start ~50 dtk pada koneksi pertama setelah idle).
   - **Custom domain `yukmain.web.id`** tersambung (nameserver Domainesia → Cloudflare).
   - `VITE_SERVER_URL = wss://yuk-main-server.onrender.com` di-set di env Pages,
     lalu **Retry deployment** (WAJIB: Vite suntik `VITE_*` saat build).
   - **Diuji end-to-end: online Ular Tangga 2 pemain tuntas sampai selesai.**
     Situs + server dua-duanya hidup. 🎉 **Fase A selesai.**

   > **Dua jebakan deploy (catat agar tak terulang):**
   > 1. Project Cloudflare WAJIB **Pages**, BUKAN Workers — Workers jalankan
   >    `npx wrangler deploy` lalu gagal *"Wrangler application detection ... root
   >    of a workspace"* (repo monorepo npm workspaces).
   > 2. *"This project is disconnected from your Git account"* + URL tak terbuka →
   >    **grant akses repo di GitHub App** (github.com/settings/installations →
   >    Cloudflare Pages → Configure → centang repo `yuk-main`).

**Host final:** client = Cloudflare Pages di `yukmain.web.id`; server = Render di
`yuk-main-server.onrender.com`. Domain dibeli di Domainesia; `.web.id` tak dijual
CF Registrar → jalur nameserver Domainesia → Cloudflare (`DEPLOY.md` bagian D, Cara A).

## Peta fase rilis (monetisasi + online)

- [x] **Fase 1 — Struktur situs publik + blog** (sesi 4, selesai). Konten siap
      untuk syarat AdSense; NameGate tak lagi memblokir crawler.
- [x] **Fase A — Deploy** (sesi 5, **SELESAI & LIVE**): client di Cloudflare Pages
      + custom domain `yukmain.web.id`; server Colyseus di Render
      (`wss://yuk-main-server.onrender.com`); `VITE_SERVER_URL` di-set. Online
      Ular Tangga 2 pemain teruji end-to-end. Detail + jebakan: `DEPLOY.md` & sesi 5.
- [ ] **Fase 3 — Ajukan AdSense**: setelah live di domain + ada sedikit trafik;
      isi `VITE_ADSENSE_CLIENT`. (Game minim teks bisa ditolak — konten blog +
      Privacy + Tentang dibuat justru untuk ini.)
- [ ] **Fase C — CRUD + admin panel** artikel (perlu DB + auth; sengaja ditunda).
      Sekarang artikel = file `.md` di repo. Saat naik ke CRUD, cukup ganti
      sumber data di `client/src/lib/blog.js` tanpa ubah halaman.

## Kebijakan grafis (KEPUTUSAN — 15 Juni 2026)

> **Mulai sekarang: dukungan grafis untuk SEMUA game (Ular Tangga, Ludo, Halma)
> ditunda ke POST-PRODUCTION (versi 2.0 ke atas).** Sampai 2.0, ketiga game jalan
> dengan fallback vektor — itu memang kondisi rilis yang diharapkan, bukan
> kekurangan. Jangan jadikan grafis sebagai blocker untuk fitur lain (mis. online
> multiplayer). Manifest aset + PANDUAN-ASET.md + fallback sudah siap menanti file
> grafis nanti; tidak perlu disentuh sampai fase 2.0.

## Langkah berikutnya (belum dikerjakan)

### Prioritas sesi 6 (ditetapkan user di akhir sesi 5)
1. **Polish UI** — rapikan tampilan secara umum.
2. **Perbaikan gameflow Ular Tangga** — ada alur kecil yang mau dibetulkan
   (detail spesifik akan diberikan user saat sesi 6).
3. **Hall of Fame** — kembangkan (kini baru lokal per-perangkat di
   `pages/HallOfFame.jsx`; lihat item "Hall of Fame global" di bawah).
4. **Online >2 pemain** — Ludo (4) & Halma (3); lihat item di bawah.
5. **Dukungan grafis — MULAI dari DADU.** User akan menyediakan `dice.png` lebih
   dulu → ini melonggarkan kebijakan "grafis ditunda v2.0": grafis dimulai
   bertahap, dadu duluan. Taruh di `app/client/public/assets/snakes-ladders/dice.png`
   (format di `PANDUAN-ASET.md`); engine sudah punya fallback, jadi tinggal pasang
   file + cek visual. Format dadu sama bisa dipakai ulang untuk Ludo.

- [ ] **[v2.0+ / post-production]** File grafis untuk KETIGA game (DITUNDA, kecuali
      **dadu** yang dimulai sesi 6):
      - Ular Tangga: `app/client/public/assets/snakes-ladders/` (PANDUAN-ASET.md)
        — `board.png`, `char-1..4.png`, `dice.png`, `snake.png`, `ladder.png`.
      - Ludo: `app/client/public/assets/ludo/` (PANDUAN-ASET.md)
        — `board.png`, `pin-1..4.png`, `dice.png` (dadu sama formatnya).
      - Halma: `app/client/public/assets/halma/` (PANDUAN-ASET.md)
        — `board.png` (papan bintang) + `marble.png` (satu kelereng putih,
        di-tint per warna oleh engine).
      Setelah ada (nanti di 2.0), refresh & cek visual (titik tumpu pion, ukuran papan).

### Online multiplayer (LIVE 2 pemain lintas internet; lanjutan: skala & ketahanan)

> Status: ketiga game online 2 pemain, **sudah LIVE lintas internet** (server
> Render, Ular Tangga 2 pemain teruji end-to-end). Lanjutan pengembangan:

- [x] **Deploy server publik + TLS — SELESAI (sesi 5).** Server di Render
      (`wss://yuk-main-server.onrender.com`), `VITE_SERVER_URL` di-set di Pages,
      client HTTPS → `wss://`. Online lintas internet jalan.
- [ ] Reconnect: kini pemain putus = lawan otomatis menang (`onLeave`). Pakai
      `allowReconnection()` Colyseus + jeda grace agar refresh/sinyal jelek tak
      langsung kalah.
- [ ] Room privat / kode-undang teman: kini auto-matchmaking (`joinOrCreate`).
      Tambah opsi buat-room berkode supaya bisa main dgn teman tertentu.
- [ ] Online >2 pemain: Ludo (4) & Halma (3) — naikkan `maxClients`
      (`LudoRoom`/`HalmaRoom`, default 2) + tangani pemain keluar di tengah main
      (kini `onLeave` hanya benar untuk 2 pemain).
- [ ] Uji visual Halma online (2 tab + server jalan); offline lengkap teruji,
      pola identik Ludo (yg sudah jalan).
- [ ] Hall of Fame global: endpoint `POST/GET /hof` di `app/server/index.js`
      (TODO sudah ada), simpan di SQLite/Postgres, leaderboard lintas perangkat.

- [ ] Game berikutnya di roadmap: setelah online matang, game papan baru.

## Hal yang perlu diketahui

- Logika game ada dua salinan yang HARUS identik tiap game:
  - Ular Tangga: `client/src/games/snakes-ladders/logic.js` &
    `server/logic/snakesLadders.js`.
  - Ludo: `client/src/games/ludo/logic.js` & `server/logic/ludo.js`.
  - Halma: `client/src/games/halma/logic.js` & `server/logic/halma.js`.
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
- Halma: geometri papan (121 lubang) DIBANGKITKAN di `logic.js` dari koordinat
  kubus (bukan tabel posisi). `HalmaScene.js` memetakan q,r → pixel
  (S=40, pusat 280,380). Bot pakai jarak ke lubang target terdekat-kosong;
  jangan ganti ke "jarak ke apex tetap" (bikin endgame mandek — sudah dicoba).
- PWA meng-cache semua PNG; batas total 6 MB (`vite.config.js`).
- Warning 404 di console untuk aset yang belum ada itu normal (by design).
- User berkomunikasi dalam Bahasa Indonesia; jika port 5173/2567 sudah
  terpakai, kemungkinan dev server lama masih jalan.
