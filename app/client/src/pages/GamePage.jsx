import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GAMES } from "../games/registry.js";
import { recordResult } from "../lib/storage.js";
import { postBotResult } from "../lib/hofApi.js";
import AdSlot from "../components/AdSlot.jsx";
import snakesLaddersModule from "../games/snakes-ladders/index.js";
import ludoModule from "../games/ludo/index.js";
import halmaModule from "../games/halma/index.js";

// Peta gameId -> modul game (createGame + controller). Tambah game baru di sini.
const GAME_MODULES = {
  "ular-tangga": snakesLaddersModule,
  ludo: ludoModule,
  halma: halmaModule
};

const DIFFICULTIES = [
  { id: "easy", label: "😌 Mudah", desc: "Sering keliru, bisa dikalahkan" },
  { id: "normal", label: "🙂 Normal", desc: "Main solid, tak meninggalkan pion" },
  { id: "hard", label: "😈 Susah", desc: "Menyusun lompatan, melihat ke depan" }
];

export default function GamePage({ playerName }) {
  const { gameId } = useParams();
  const [mode, setMode] = useState(null); // null | "bot" | "online"
  const [winMode, setWinMode] = useState("single"); // single | ranking
  const [difficulty, setDifficulty] = useState("normal"); // easy | normal | hard (Halma)
  const [playerCount, setPlayerCount] = useState(2); // 2 | 3 (Halma, lawan bot)
  const game = GAMES.find((g) => g.id === gameId);

  if (!game) {
    return (
      <div className="empty">
        Permainan tidak ditemukan. <Link to="/lobi">Kembali ke lobi</Link>
      </div>
    );
  }
  if (!game.available) {
    return (
      <div className="empty">
        {game.name} segera hadir! <Link to="/lobi">Kembali ke lobi</Link>
      </div>
    );
  }

  if (!mode) {
    // Mode kemenangan: Ludo selalu; Halma hanya saat 3 pemain (ranking baru berarti).
    const showWinMode = game.id === "ludo" || (game.id === "halma" && playerCount === 3);
    const rankMax = game.id === "ludo" ? 4 : playerCount;
    return (
      <div className="mode-select">
        <h2>{game.name}</h2>
        <p>{game.desc}</p>

        {game.id === "halma" && (
          <>
            <div className="win-mode">
              <p className="win-mode-label">Tingkat kesulitan bot</p>
              <div className="win-mode-options">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    className={`wm-option${difficulty === d.id ? " active" : ""}`}
                    onClick={() => setDifficulty(d.id)}
                  >
                    <strong>{d.label}</strong>
                    <small>{d.desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="win-mode">
              <p className="win-mode-label">Jumlah pemain (lawan bot)</p>
              <div className="win-mode-options">
                <button
                  className={`wm-option${playerCount === 2 ? " active" : ""}`}
                  onClick={() => setPlayerCount(2)}
                >
                  <strong>2 pemain</strong>
                  <small>Kamu vs 1 bot (atas vs bawah)</small>
                </button>
                <button
                  className={`wm-option${playerCount === 3 ? " active" : ""}`}
                  onClick={() => setPlayerCount(3)}
                >
                  <strong>3 pemain</strong>
                  <small>Kamu vs 2 bot (selang-seling)</small>
                </button>
              </div>
            </div>
          </>
        )}

        {showWinMode && (
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
                <small>Lanjut sampai juara 1–{rankMax}</small>
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
      key={`${mode}-${winMode}-${difficulty}-${playerCount}`}
      mode={mode}
      winMode={winMode}
      difficulty={difficulty}
      playerCount={playerCount}
      playerName={playerName}
      gameId={gameId}
      onExit={() => setMode(null)}
    />
  );
}

function PhaserHost({ mode, winMode, difficulty, playerCount, playerName, gameId, onExit }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const mod = GAME_MODULES[gameId];
    if (!mod) {
      setError("Modul permainan ini belum tersedia.");
      return;
    }
    const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    const opts = { winMode, difficulty, playerCount };
    const controller =
      mode === "bot"
        ? new mod.LocalBotController(playerName, opts)
        : new mod.OnlineController(serverUrl, playerName, opts);

    let phaserGame = null;
    let cancelled = false;

    (async () => {
      try {
        if (controller.connect) await controller.connect();
        if (cancelled) return;
        phaserGame = mod.createGame(hostRef.current, {
          controller,
          onGameOver: ({ iWon }) => {
            recordResult(gameId, { win: iWon }); // rekor lokal perangkat ini
            // Hasil online dicatat OTORITATIF oleh server (room); cukup kirim
            // hasil lawan-bot ke leaderboard global agar tak dobel & tak ditipu.
            if (mode === "bot") postBotResult(gameId, iWon);
          }
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
  }, [mode, winMode, difficulty, playerCount, playerName, gameId]);

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
