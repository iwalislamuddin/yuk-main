# Arena Papan 🎲

Platform web PWA berisi kumpulan board game — main **online** atau **lawan bot**, dengan **Hall of Fame** dan slot iklan **AdSense**.

| Game | Status |
|---|---|
| Ular Tangga | ✅ Bisa dimainkan (vs bot offline & online 1v1) |
| Ludo | 🔜 Segera (kartunya sudah ada di lobi) |
| Halma | 🔜 Segera |

## Stack

- **Client**: React 18 + Vite + `vite-plugin-pwa` (PWA), **Phaser 3** untuk rendering game
- **Server**: Node.js + **Colyseus** (room multiplayer, server otoritatif)
- **Penyimpanan lokal**: nama pemain & Hall of Fame di `localStorage`

## Menjalankan

```bash
npm install        # install semua workspace (client + server)
npm run dev        # jalankan client (port 5173) + server (port 2567) sekaligus
```

Buka `http://localhost:5173`:

1. Masukkan nama → tersimpan di perangkat (localStorage).
2. Pilih **Ular Tangga** → **Lawan bot (offline)** langsung bisa dimainkan.
3. Untuk **Main online**: buka tab/browser kedua, masukkan nama berbeda, pilih Main online di keduanya — room otomatis dipasangkan.

Build produksi: `npm run build` → hasil di `client/dist/` (termasuk service worker & manifest PWA).

## Struktur

```
arena-papan/
├── client/
│   ├── vite.config.js              # konfigurasi PWA (manifest, service worker)
│   └── src/
│       ├── App.jsx                 # router + gerbang nama
│       ├── lib/storage.js          # nama pemain + Hall of Fame (localStorage)
│       ├── components/
│       │   ├── NameGate.jsx        # form nama di awal
│       │   └── AdSlot.jsx          # slot AdSense (placeholder saat dev)
│       ├── pages/                  # Lobby, HallOfFame, GamePage
│       └── games/
│           ├── registry.js         # daftar game di platform
│           └── snakes-ladders/
│               ├── logic.js               # aturan inti (duplikat di server!)
│               ├── SnakesLaddersScene.js  # rendering Phaser (papan, token, dadu)
│               ├── LocalBotController.js  # mode offline vs bot
│               └── OnlineController.js    # mode online via Colyseus
└── server/
    ├── index.js                    # Express + Colyseus, endpoint /health
    ├── logic/snakesLadders.js      # aturan inti sisi server (otoritatif)
    └── rooms/
        ├── schema.js               # state tersinkron (players, giliran, dadu)
        └── SnakesLaddersRoom.js    # room 1v1: join, roll, validasi giliran
```

**Pola arsitektur kunci**: scene Phaser hanya *merender state* dan tidak tahu sedang offline atau online. Keduanya lewat antarmuka controller yang sama (`onUpdate`, `requestRoll`, `dispose`). Menambah game baru = scene baru + 2 controller + 1 room di server.

## Hall of Fame

- Saat ini **per perangkat**: setiap kemenangan dicatat ke `localStorage` (`recordResult` di `lib/storage.js`), ditampilkan di halaman Hall of Fame dengan filter per game.
- **Upgrade ke global** (roadmap): catat hasil match dari dalam room di server (bukan dari client, agar tidak bisa dipalsukan) ke Postgres/SQLite, lalu buka endpoint `GET /hof`. Stub TODO-nya sudah ada di `server/index.js`.

## AdSense

1. Daftar AdSense, lalu isi `client/.env`:
   ```
   VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   ```
   Script AdSense disuntik otomatis dari `main.jsx`. Tanpa env ini, slot tampil sebagai placeholder.
2. Slot tersedia di **lobi** dan **halaman pra-game** lewat komponen `<AdSlot slot="..." />`. Ganti `slot` dengan ID ad unit dari dashboard AdSense.
3. **Patuh kebijakan**: jangan menaruh iklan menutupi/menempel area gameplay (risiko klik tak sengaja → banned). Untuk interstitial/rewarded antar match, gunakan **Ad Placement API (H5 Games Ads)** milik Google.
4. Approval situs murni game kadang sulit — bantu dengan konten tekstual (halaman cara bermain tiap game, blog, kebijakan privasi).

## Deploy

- **Client**: `client/dist` bisa di-hosting statis (Vercel/Netlify/Cloudflare Pages). Set `VITE_SERVER_URL=wss://domain-servermu` saat build (wajib `wss://` di HTTPS).
- **Server**: butuh proses yang hidup terus untuk WebSocket — VPS, Railway, atau Fly.io. **Bukan** serverless seperti Vercel Functions.

## Roadmap berikutnya

1. **Bot di server** untuk mode online (bot join room sebagai pemain jika lawan tak kunjung datang).
2. **Ular Tangga 3–4 pemain**: naikkan `maxClients` di `SnakesLaddersRoom` + opsi jumlah pemain di UI.
3. **Ludo**: room baru + scene baru; logikanya paling rumit di aturan keluar kandang & menendang pion lawan.
4. **Halma**: butuh AI lompatan (greedy/minimax) untuk botnya.
5. **Hall of Fame global** di server + reconnect handling (`allowReconnection` di Colyseus).
6. **Ad Placement API** untuk interstitial antar match.
