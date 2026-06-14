import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GAMES } from "../games/registry.js";
import { recordResult } from "../lib/storage.js";
import AdSlot from "../components/AdSlot.jsx";
import snakesLaddersModule from "../games/snakes-ladders/index.js";
import ludoModule from "../games/ludo/index.js";

// Peta gameId -> modul game (createGame + controller). Tambah game baru di sini.
const GAME_MODULES = {
  "ular-tangga": snakesLaddersModule,
  ludo: ludoModule
};

export default function GamePage({ playerName }) {
  const { gameId } = useParams();
  const [mode, setMode] = useState(null); // null | "bot" | "online"
  const [winMode, setWinMode] = useState("single"); // single | ranking (khusus Ludo)
  const game = GAMES.find((g) => g.id === gameId);

  if (!game) {
    return (
      <div className="empty">
        Permainan tidak ditemukan. <Link to="/">Kembali ke lobi</Link>
      </div>
    );
  }
  if (!game.available) {
    return (
      <div className="empty">
        {game.name} segera hadir! <Link to="/">Kembali ke lobi</Link>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="mode-select">
        <h2>{game.name}</h2>
        <p>{game.desc}</p>
        {game.id === "ludo" && (
          <div className="win-mode">
            <p className="win-mode-label">Mode kemenangan</p>
            <div className="win-mode-options">
              <button
                className={`wm-option${winMode === "single" ? " active" : ""}`}
                onClick={() => setWinMode("single")}
              >
                <strong>🏆 Pemenang pertama</strong>
                <small>Selesai begitu ada yang menang</small>
              </button>
              <button
                className={`wm-option${winMode === "ranking" ? " active" : ""}`}
                onClick={() => setWinMode("ranking")}
              >
                <strong>🥇 Sampai semua peringkat</strong>
                <small>Lanjut sampai juara 1–4</small>
              </button>
            </div>
          </div>
        )}
        <div className="mode-buttons">
          <button onClick={() => setMode("bot")}>Lawan bot (offline)</button>
          <button onClick={() => setMode("online")}>Main online</button>
        </div>
        <AdSlot slot="pregame-banner" />
      </div>
    );
  }

  return (
    <PhaserHost
      key={`${mode}-${winMode}`}
      mode={mode}
      winMode={winMode}
      playerName={playerName}
      gameId={gameId}
      onExit={() => setMode(null)}
    />
  );
}

function PhaserHost({ mode, winMode, playerName, gameId, onExit }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const mod = GAME_MODULES[gameId];
    if (!mod) {
      setError("Modul permainan ini belum tersedia.");
      return;
    }
    const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    const controller =
      mode === "bot"
        ? new mod.LocalBotController(playerName, { winMode })
        : new mod.OnlineController(serverUrl, playerName, { winMode });

    let phaserGame = null;
    let cancelled = false;

    (async () => {
      try {
        // Mode online: join room dulu sebelum scene dibuat.
        if (controller.connect) await controller.connect();
        if (cancelled) return;
        phaserGame = mod.createGame(hostRef.current, {
          controller,
          onGameOver: ({ iWon }) => recordResult(gameId, { win: iWon })
        });
      } catch {
        setError(
          `Gagal terhubung ke server di ${serverUrl}. ` +
            "Pastikan server jalan (npm run dev di folder server)."
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.dispose?.();
      phaserGame?.destroy(true);
    };
  }, [mode, winMode, playerName, gameId]);

  if (error) {
    return (
      <div className="empty">
        {error} <button onClick={onExit}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="phaser-wrap">
      <button className="back-btn" onClick={onExit}>&larr; Ganti mode</button>
      <div ref={hostRef} className="phaser-host" />
    </div>
  );
}
