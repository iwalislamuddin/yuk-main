import { useMemo, useState } from "react";
import { getHallOfFame } from "../lib/storage.js";
import { GAMES } from "../games/registry.js";

export default function HallOfFame() {
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    const list = getHallOfFame().filter(
      (e) => filter === "all" || e.gameId === filter
    );
    const byName = new Map();
    for (const e of list) {
      const agg = byName.get(e.name) || { name: e.name, wins: 0, plays: 0 };
      agg.wins += e.wins;
      agg.plays += e.plays;
      byName.set(e.name, agg);
    }
    return [...byName.values()].sort(
      (a, b) => b.wins - a.wins || a.plays - b.plays
    );
  }, [filter]);

  return (
    <div className="hof">
      <h2>Hall of Fame</h2>
      <p className="muted">
        Rekor kemenangan di perangkat ini. Leaderboard global akan menyusul
        lewat server.
      </p>
      <div className="filter-row">
        <button
          className={filter === "all" ? "chip active" : "chip"}
          onClick={() => setFilter("all")}
        >
          Semua
        </button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={filter === g.id ? "chip active" : "chip"}
            onClick={() => setFilter(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.wins}</td>
                <td>{r.plays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
