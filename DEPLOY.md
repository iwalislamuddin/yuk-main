# Panduan Deploy — Yuk Main (yuk-main.web.id)

Dokumen ini menjelaskan cara merilis **Yuk Main** ke internet. Arsitekturnya
terbagi dua bagian yang di-host terpisah:

| Bagian | Folder | Host | Untuk apa |
|---|---|---|---|
| **Client** (situs + blog + lawan bot) | `app/client` | **Cloudflare Pages** (gratis, statis) | Semua halaman & main lawan bot (jalan di browser) |
| **Server** (multiplayer) | `app/server` | **Render** (Node hidup terus) | Hanya mode **online** (Colyseus WebSocket) |

> Bot lawan main **jalan di browser**, jadi situs + lawan-bot tetap berfungsi
> walau server online belum/ tidak menyala. Server hanya dipakai untuk mode online.

---

## A. Deploy Client ke Cloudflare Pages

> ⚠️ **WAJIB pilih "Pages", BUKAN "Workers".** Kalau project dibuat sebagai
> Worker, Cloudflare menjalankan `npx wrangler deploy` dan **gagal** dengan error
> *"Wrangler application detection ... run in the root of a workspace"* (karena
> repo ini monorepo npm workspaces). Pages hanya meng-upload `client/dist` —
> tidak menjalankan wrangler — jadi tidak kena error itu.

1. Push repo ini ke GitHub (sudah: `github.com/iwalislamuddin/yuk-main`).
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → tab **Pages**
   (bukan Workers) → **Connect to Git** → pilih repo `yuk-main`.
3. Isi **Build settings** (penting karena repo ini monorepo):

   | Kolom | Nilai |
   |---|---|
   | Production branch | `main` |
   | **Root directory** | `app` |
   | **Build command** | `npm install && npm run build` |
   | **Build output directory** | `client/dist` |

4. **Environment variables** (Production) → tambah:

   | Name | Value |
   |---|---|
   | `VITE_SERVER_URL` | `wss://yuk-main-server.onrender.com` *(isi setelah Bagian B)* |
   | `NODE_VERSION` | `22` *(opsional; `app/.nvmrc` sudah pin ke 22)* |

   > `VITE_*` disuntik saat **build**. Kalau diubah, klik **Retry deployment**
   > agar nilai baru ikut ter-build.

5. **Save and Deploy**. Setelah selesai kamu dapat URL sementara
   `https://yuk-main.pages.dev`. Buka — situs, blog, dan lawan-bot harus jalan.

Routing SPA (`/blog/...` saat di-refresh) sudah ditangani file
[`app/client/public/_redirects`](app/client/public/_redirects) — tidak perlu setting tambahan.

---

## B. Deploy Server ke Render

Cara termudah pakai blueprint [`render.yaml`](render.yaml) yang sudah ada:

1. [render.com](https://render.com) → **New** → **Blueprint** → connect repo `yuk-main`.
2. Render membaca `render.yaml` dan membuat service **`yuk-main-server`**
   (rootDir `app/server`, start `npm start`, health check `/health`).
3. **Apply**. Tunggu build selesai → dapat URL `https://yuk-main-server.onrender.com`.
4. Tes: buka `https://yuk-main-server.onrender.com/health` → harus muncul
   `{"ok":true,"name":"arena-papan"}`.

Atau **manual**: New → Web Service → Root Directory `app/server`,
Build `npm install`, Start `npm start`, Health check path `/health`.

> ⚠️ **Free tier tidur.** Service gratis Render mati setelah ~15 menit idle dan
> butuh ~50 detik untuk bangun. Untuk masa cari-traffic ini OK. Saat serius
> (atau online dipromosikan), ubah `plan: free` → `plan: starter` di `render.yaml`
> (≈$7/bln) agar selalu hidup.

---

## C. Sambungkan Client ↔ Server

1. Salin URL Render → ke Cloudflare Pages env `VITE_SERVER_URL`
   (pakai **`wss://`**, bukan `https://`): `wss://yuk-main-server.onrender.com`.
2. Cloudflare Pages → **Retry deployment** agar ter-build ulang.
3. Tes mode **online** di situs: buka satu game di dua tab/perangkat → harus
   saling terhubung.

---

## D. Custom domain `yuk-main.web.id`

Domain **`yuk-main.web.id` sudah dibeli di Domainesia**. (Cloudflare Registrar
tidak menjual `.id`/`.web.id`, jadi opsi itu memang tidak berlaku — pembelian di
Domainesia sudah tepat.) Tinggal sambungkan ke Cloudflare Pages dengan salah satu
cara berikut:

**Cara A — Arahkan nameserver ke Cloudflare (disarankan).** Dapat CDN + DNS gratis Cloudflare.
1. Cloudflare → **Add a site** → `yuk-main.web.id` (plan Free).
2. Cloudflare kasih 2 nameserver (mis. `xxx.ns.cloudflare.com`).
3. Di **panel Domainesia** → kelola domain `yuk-main.web.id` → ganti **Nameserver**
   ke dua nameserver dari Cloudflare. (Propagasi beberapa menit–jam.)
4. Setelah aktif → Pages → **Custom domains** → Add `yuk-main.web.id`. DNS otomatis.

**Cara B — Tetap pakai DNS Domainesia (tanpa pindah nameserver).**
1. Pages → **Custom domains** → Add `yuk-main.web.id` → Cloudflare kasih target CNAME
   (mis. `yuk-main.pages.dev`).
2. Di DNS Domainesia tambah record:
   - `CNAME` `www` → `yuk-main.pages.dev`
   - Untuk root `@`: pakai fitur **CNAME flattening/ALIAS** Domainesia bila ada,
     atau redirect `yuk-main.web.id` → `www.yuk-main.web.id`.
   > Cara A lebih mulus untuk domain root; Cara B kadang ribet di root domain.

> **Server tidak wajib custom domain.** Client cukup memanggil URL `*.onrender.com`.
> Kalau mau rapi, bisa tambah subdomain `ws.yuk-main.web.id` (CNAME ke Render) lalu
> set `VITE_SERVER_URL=wss://ws.yuk-main.web.id`.

Setelah domain aktif, perbarui `VITE_SERVER_URL` bila berubah, dan pastikan
`robots.txt`/`sitemap.xml` (sudah memakai `https://yuk-main.web.id`) terjangkau di
`https://yuk-main.web.id/sitemap.xml`.

---

## E. Checklist sebelum apply AdSense (beberapa bulan lagi)

- [x] Domain sendiri (`yuk-main.web.id`) — bukan subdomain gratis.
- [x] Halaman **Kebijakan Privasi** (sudah ada, menyebut AdSense & cookie).
- [x] Situs publik bisa di-crawl (NameGate tidak memblokir, ada robots & sitemap).
- [ ] Konten asli cukup — terus tambah artikel blog selama masa cari-traffic.
- [ ] **Cookie consent banner** sebelum iklan dinyalakan (wajib untuk trafik Eropa).
- [ ] Isi `VITE_ADSENSE_CLIENT` (`ca-pub-...`) **hanya setelah** AdSense disetujui.
- [ ] Jangan klik iklan sendiri; jangan tempel iklan menempel tombol game.

---

## Ringkasan biaya awal
- Domain `yuk-main.web.id` (Domainesia): biaya tahunan sesuai Domainesia (`.web.id` relatif murah). **Sudah dibeli.**
- Cloudflare Pages: **gratis**.
- Render server: **gratis** (dengan cold-start) saat membangun traffic.
- Jadi pengeluaran wajib untuk mulai = **hanya domain**.
