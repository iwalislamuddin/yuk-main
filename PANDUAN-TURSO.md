# Panduan Setup Turso — Hall of Fame Global (Yuk Main)

Hall of Fame global butuh database yang **awet**. Disk server Render (free) bersifat
sementara (terhapus tiap redeploy/restart), jadi kita pakai **Turso** (database
libSQL/SQLite di cloud, ada free tier yang persisten).

Hasil akhir: server membaca dua env var — `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN`.
Selama keduanya **belum** diisi, server tetap jalan normal memakai penyimpanan
in-memory (rekor hilang tiap server restart). Begitu diisi, rekor jadi permanen.

> **Penting:** auth token = rahasia. Jangan pernah commit ke Git / tempel ke kode.
> Hanya dimasukkan di dashboard Render. Kode & repo tidak pernah memuat nilainya.

---

## Langkah 1 — Buat akun & database Turso

Cara termudah lewat **dashboard web** (tanpa instal apa pun):

1. Buka **https://turso.tech** → **Sign up** (bisa pakai akun GitHub).
2. Masuk ke dashboard (**https://app.turso.tech**).
3. **Create Database**:
   - Beri nama, mis. `yuk-main-hof`.
   - Pilih **region** terdekat dengan server Render / pemain (mis. Singapore/`sin`
     bila banyak pemain di Indonesia). Latensi tidak kritis untuk leaderboard,
     jadi bebas.
4. Tunggu beberapa detik sampai database aktif.

## Langkah 2 — Ambil URL & buat token

Di halaman database yang baru dibuat:

1. **Database URL** — salin nilai yang berformat:
   ```
   libsql://yuk-main-hof-namamu.turso.io
   ```
   (Kode kita otomatis mengubah `libsql://` → `https://`, jadi salin apa adanya.)
2. **Create Token** (kadang berlabel *"Generate token"* / tab **Tokens**):
   - Pilih masa berlaku **tanpa kedaluwarsa** (*never expire*) bila ada, supaya
     tak perlu diganti berkala.
   - Salin tokennya **sekarang** — biasanya hanya tampil sekali. Bentuknya string
     panjang (JWT) seperti `eyJhbGciOi...`.

> Alternatif via **Turso CLI** (opsional, jika lebih suka terminal):
> ```bash
> turso db create yuk-main-hof
> turso db show yuk-main-hof --url        # -> TURSO_DATABASE_URL
> turso db tokens create yuk-main-hof     # -> TURSO_AUTH_TOKEN
> ```
> Di Windows, CLI paling mudah lewat WSL/scoop; dashboard web lebih praktis.

## Langkah 3 — Set env var di Render & redeploy

1. Buka **Render Dashboard** → service **`yuk-main-server`** → tab **Environment**.
2. **Add Environment Variable** dua kali:
   | Key | Value |
   |-----|-------|
   | `TURSO_DATABASE_URL` | URL dari Langkah 2 (`libsql://...`) |
   | `TURSO_AUTH_TOKEN`   | token dari Langkah 2 (`eyJ...`) |
3. **Save Changes** → Render otomatis **redeploy** (atau klik *Manual Deploy*).

> `render.yaml` sudah mendeklarasikan kedua key ini dengan `sync: false` —
> artinya Render meminta nilainya di dashboard dan tidak menyimpannya di repo.

## Langkah 4 — Verifikasi

1. Setelah deploy selesai, buka **Logs** service di Render. Cari baris:
   ```
   [hof] store: Turso (persisten)
   ```
   Kalau muncul `in-memory (TIDAK persisten)`, berarti env var belum terbaca —
   cek ejaan key & lakukan redeploy ulang.
2. Mainkan satu permainan **lawan bot** sampai selesai di **https://yukmain.web.id**,
   lalu buka halaman **Hall of Fame** — nama kamu harus muncul.
3. (Opsional) Cek langsung endpoint-nya di browser:
   ```
   https://yuk-main-server.onrender.com/hof
   ```
   Harus mengembalikan JSON `{"rows":[ ... ]}`. (Permintaan pertama setelah server
   tidur butuh ~50 detik untuk bangun — itu normal di free tier.)
4. Untuk membuktikan **persisten**: setelah ada rekor, lakukan **Manual Deploy**
   sekali lagi; rekor harus tetap ada (tidak hilang).

---

## Catatan

- **Free tier Turso** sangat lega untuk kasus ini (jutaan baris dibaca/bulan,
  penyimpanan ratusan MB). Tabel `hof` kita sangat kecil. Cek batas terbaru di
  dashboard bila ragu.
- **Tabel dibuat otomatis** oleh server saat pertama konek (`CREATE TABLE IF NOT
  EXISTS hof ...`) — tidak perlu bikin tabel manual.
- **Ganti/region/rotasi token**: cukup buat token baru di Turso, perbarui
  `TURSO_AUTH_TOKEN` di Render, redeploy. Data tetap.
- **Skema data**: satu baris per (`name`, `game_id`, `source`) dengan kolom
  `wins`, `plays`. `source` = `online` (dicatat server saat match online selesai)
  atau `bot` (dilapor client dari mode lawan-bot). Lihat `app/server/hof/store.js`.
- **v2.0 (Mingguan)**: tinggal tambah kolom/bucket pekan ISO — rencana lengkap
  ada di komentar `app/client/src/lib/storage.js` (CATATAN v2.0).
