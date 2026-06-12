import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GAMES } from "../games/registry.js";
import { recordResult } from "../lib/storage.js";
import AdSlot from "../components/AdSlot.jsx";
import { createSnakesLaddersGame } from "../games/snakes-ladders/createGame.js";
import { LocalBotController } from "../games/snakes-ladders/LocalBotController.js";
import { OnlineController } from "../games/snakes-ladders/OnlineController.js";

export default function GamePage({ playerName }) {
  const { gameId } = useParams();
  const [mode, setMode] = useState(null); // null | "bot" | "online"
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
      key={mode}
      mode={mode}
      playerName={playerName}
      gameId={gameId}
      onExit={() => setMode(null)}
    />
  );
}

function PhaserHost({ mode, playerName, gameId, onExit }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    const controller =
      mode === "bot"
        ? new LocalBotController(playerName)
        : new OnlineController(serverUrl, playerName);

    let phaserGame = null;
    let cancelled = false;

    (async () => {
      try {
        // Mode online: join room dulu sebelum scene dibuat.
        if (controller.connect) await controller.connect();
        if (cancelled) return;
        phaserGame = createSnakesLaddersGame(hostRef.current, {
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
  }, [mode, playerName, gameId]);

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
