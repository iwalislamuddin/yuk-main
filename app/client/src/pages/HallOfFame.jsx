import { useEffect, useMemo, useState } from "react";
import { buildLeaderboard, getHallOfFame } from "../lib/storage.js";
import { fetchLeaderboard } from "../lib/hofApi.js";
import { GAMES } from "../games/registry.js";

// Periode leaderboard. Scalable: tambah periode = tambah entri di sini.
// v1.0: hanya "Sepanjang Masa" yang aktif. v2.0: aktifkan "Mingguan"
// (ready: true) lalu isi sumber datanya di storage.js (lihat CATATAN v2.0).
const PERIODS = [
  { id: "all", label: "Sepanjang Masa", ready: true },
  { id: "weekly", label: "Mingguan", ready: false }
];

export default function HallOfFame() {
  const [period, setPeriod] = useState("all");
  const [game, setGame] = useState("all");
  const [entries, setEntries] = useState(null); // null = sedang memuat
  const [scope, setScope] = useState("global"); // "global" | "lokal" (fallback)

  // Ambil data GLOBAL dari server. Bila gagal (server tidur/offline), tampilkan
  // rekor lokal perangkat ini sebagai cadangan.
  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((rows) => {
        if (!alive) return;
        setEntries(rows);
        setScope("global");
      })
      .catch(() => {
        if (!alive) return;
        setEntries(getHallOfFame());
        setScope("lokal");
      });
    return () => {
      alive = false;
    };
  }, []);

  const loading = entries === null;

  // Kategori game otomatis ikut bertambah dari registry GAMES (scalable).
  const rows = useMemo(
    () => (loading ? [] : buildLeaderboard({ period, gameId: game, entries })),
    [period, game, entries, loading]
  );

  return (
    <div className="hof">
      <h2>Hall of Fame</h2>
      <p className="muted">
        {scope === "lokal"
          ? "Server sedang tak terjangkau — menampilkan rekor perangkat ini saja."
          : "Papan kemenangan semua pemain, lintas perangkat."}
      </p>

      <span className="filter-label">Periode</span>
      <div className="filter-row">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            disabled={!p.ready}
            className={period === p.id ? "chip active" : "chip"}
            onClick={() => p.ready && setPeriod(p.id)}
            title={p.ready ? undefined : "Hadir di versi berikutnya"}
          >
            {p.label}
            {!p.ready && " (segera)"}
          </button>
        ))}
      </div>

      <span className="filter-label">Permainan</span>
      <div className="filter-row">
        <button
          className={game === "all" ? "chip active" : "chip"}
          onClick={() => setGame("all")}
        >
          Semua
        </button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={game === g.id ? "chip active" : "chip"}
            onClick={() => setGame(g.id)}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Memuat papan kemenangan…</div>
      ) : rows.length === 0 ? (
        <div className="empty">
          Belum ada rekor. Menangkan satu permainan untuk masuk daftar!
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Menang</th>
              <th>Main</th>
              <th>Rasio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.wins}</td>
                <td>{r.plays}</td>
                <td>{r.ratio}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
