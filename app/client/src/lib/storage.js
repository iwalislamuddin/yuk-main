// Penyimpanan lokal: nama pemain + Hall of Fame perangkat ini.
// Catatan: localStorage = per-perangkat. Untuk leaderboard global,
// pindahkan pencatatan ke server (lihat README, bagian Roadmap).

const NAME_KEY = "arenaPapan.playerName";
const HOF_KEY = "arenaPapan.hallOfFame";

export function getPlayerName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function getHallOfFame() {
  try {
    return JSON.parse(localStorage.getItem(HOF_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Catat hasil satu permainan untuk pemain aktif.
 * Tiap baris tersimpan per (nama, gameId) sehingga otomatis scalable saat
 * game baru ditambah — tidak ada daftar game yang di-hardcode di sini.
 * @param {string} gameId  contoh: "ular-tangga"
 * @param {{win: boolean}} result
 */
export function recordResult(gameId, { win }) {
  const name = getPlayerName() || "Anonim";
  const list = getHallOfFame();
  let entry = list.find((e) => e.name === name && e.gameId === gameId);
  if (!entry) {
    entry = { name, gameId, wins: 0, plays: 0 };
    list.push(entry);
  }
  entry.plays += 1;
  if (win) entry.wins += 1;
  entry.lastPlayed = Date.now();
  localStorage.setItem(HOF_KEY, JSON.stringify(list));
}

/**
 * Bangun baris leaderboard teragregasi per pemain (menggabungkan semua game,
 * atau satu game saja). Rasio = persentase menang/main (bilangan bulat).
 * @param {{ period?: "all", gameId?: string, entries?: Array }} opts
 *   - period: "all" = sepanjang masa (v1.0). "weekly" menyusul di v2.0
 *     (lihat CATATAN v2.0 di bawah). Untuk sekarang nilai apa pun diperlakukan
 *     sebagai "all" karena data mingguan belum dikumpulkan.
 *   - gameId: id game tertentu, atau "all"/kosong untuk gabungan semua game.
 *   - entries: sumber baris [{name, gameId, wins, plays}]. Default = data lokal
 *     perangkat. Halaman HoF mengisinya dengan data GLOBAL dari server.
 * @returns {Array<{name:string, wins:number, plays:number, ratio:number}>}
 *   terurut: menang desc, lalu rasio desc, lalu main asc.
 */
export function buildLeaderboard({ gameId = "all", entries } = {}) {
  const list = (entries || getHallOfFame()).filter(
    (e) => gameId === "all" || e.gameId === gameId
  );
  const byName = new Map();
  for (const e of list) {
    const agg = byName.get(e.name) || { name: e.name, wins: 0, plays: 0 };
    agg.wins += e.wins;
    agg.plays += e.plays;
    byName.set(e.name, agg);
  }
  return [...byName.values()]
    .map((a) => ({
      ...a,
      ratio: a.plays ? Math.round((a.wins / a.plays) * 100) : 0
    }))
    .sort((a, b) => b.wins - a.wins || b.ratio - a.ratio || a.plays - b.plays);
}

// --- CATATAN v2.0: Hall of Fame Mingguan ---
// v1.0 hanya menyimpan akumulasi total (wins/plays sepanjang masa). Untuk
// leaderboard MINGGUAN nanti, rencananya tanpa perlu migrasi data:
//   1. Tambah bucket per-pekan pada tiap entry, mis.
//        entry.weeks = { "2026-W25": { wins, plays }, ... }
//      dengan kunci pekan ISO (buat helper isoWeekKey(date)).
//   2. recordResult() menambah ke total DAN ke bucket pekan berjalan.
//   3. buildLeaderboard({ period, gameId }) memilih sumber: "all" -> total,
//        "weekly" -> ambil bucket pekan ini dari tiap entry sebelum agregasi.
//   4. Di UI, aktifkan periode "weekly" (ready: true) di PERIODS (HallOfFame.jsx).
// Data mingguan mulai terkumpul sejak fitur dirilis (tidak retroaktif).
// Saat naik ke leaderboard global, pola sama dipindah ke server/DB
// (endpoint POST/GET /hof — lihat HANDOFF.md "Hall of Fame global").
