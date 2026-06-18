import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
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

// Konfigurasi ONLINE dipatok per game (server juga memaksa ini — lihat
// rooms/*Room.js). Satu antrian per game: pemain online tak perlu memilih ukuran
// 2/3/4, semua mendarat di room yang sama lalu sisanya diisi bot. Pilihan ukuran
// hanya berlaku untuk mode lawan bot (offline).
const ONLINE_CONFIG = {
  "ular-tangga": { target: 2, winMode: "single", label: "2 pemain" },
  ludo: { target: 4, winMode: "ranking", label: "4 pemain · mode peringkat" },
  halma: { target: 3, winMode: "ranking", label: "3 pemain · mode peringkat" }
};

export default function GamePage({ playerName }) {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  // Datang dari tombol "Gabung" di lobi: ?online=1 -> langsung online (konfigurasi
  // online dipatok, jadi tak perlu parameter ukuran/mode lagi).
  const autoOnline = searchParams.get("online") === "1";
  const [mode, setMode] = useState(autoOnline ? "online" : null); // null | "bot" | "online"
  const [onlineKind, setOnlineKind] = useState("public"); // public | create | join (B3)
  const [joinCode, setJoinCode] = useState(""); // kode room privat yg digabung
  const [codeInput, setCodeInput] = useState(""); // isian field "gabung lewat kode"
  const [winMode, setWinMode] = useState("single"); // single | ranking (mode lawan bot)
  const [difficulty, setDifficulty] = useState("normal"); // easy | normal | hard (Halma)
  const [playerCount, setPlayerCount] = useState(2); // 2 | 3 (Halma lawan bot)
  const game = GAMES.find((g) => g.id === gameId);

  // Masuk mode online dengan jenis tertentu (publik / buat privat / gabung kode).
  const goOnline = (kind, code = "") => {
    setOnlineKind(kind);
    setJoinCode(code);
    setMode("online");
  };

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

        {(game.id === "halma" || showWinMode) && (
          <p className="settings-note">
            ⚙️ Setelan di bawah untuk mode <strong>Lawan bot</strong>. Main online
            dipatok otomatis (lihat di bawah).
          </p>
        )}

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
              <p className="win-mode-label">Jumlah pemain</p>
              <div className="win-mode-options">
                <button
                  className={`wm-option${playerCount === 2 ? " active" : ""}`}
                  onClick={() => setPlayerCount(2)}
                >
                  <strong>2 pemain</strong>
                  <small>Kamu vs 1 bot</small>
                </button>
                <button
                  className={`wm-option${playerCount === 3 ? " active" : ""}`}
                  onClick={() => setPlayerCount(3)}
                >
                  <strong>3 pemain</strong>
                  <small>Kamu vs 2 bot</small>
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
          <button onClick={() => goOnline("public")}>Main online</button>
        </div>
        <p className="online-hint">
          🌐 Online: {ONLINE_CONFIG[game.id]?.label}
          {game.id !== "ular-tangga" ? " · sisa kursi diisi bot setelah 30 detik" : ""}
        </p>

        <div className="private-room">
          <p className="private-label">🔒 Main dengan teman (room privat berkode)</p>
          <div className="private-actions">
            <button className="private-btn" onClick={() => goOnline("create")}>
              Buat room privat
            </button>
            <form
              className="code-form"
              onSubmit={(e) => {
                e.preventDefault();
                const c = codeInput.trim();
                if (c) goOnline("join", c);
              }}
            >
              <input
                type="text"
                aria-label="Kode room"
                placeholder="Punya kode? Tempel di sini"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
              />
              <button type="submit" className="private-btn" disabled={!codeInput.trim()}>
                Gabung
              </button>
            </form>
          </div>
        </div>

        <AdSlot slot="pregame-banner" />
      </div>
    );
  }

  return (
    <PhaserHost
      key={`${mode}-${onlineKind}-${joinCode}-${winMode}-${difficulty}-${playerCount}`}
      mode={mode}
      onlineKind={onlineKind}
      joinCode={joinCode}
      winMode={winMode}
      difficulty={difficulty}
      playerCount={playerCount}
      playerName={playerName}
      gameId={gameId}
      onExit={() => setMode(null)}
    />
  );
}

function PhaserHost({ mode, onlineKind, joinCode, winMode, difficulty, playerCount, playerName, gameId, onExit }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");
  const [conn, setConn] = useState("connected"); // connected | reconnecting | lost
  const [roomCode, setRoomCode] = useState(""); // kode room privat (saat jadi host)

  useEffect(() => {
    const mod = GAME_MODULES[gameId];
    if (!mod) {
      setError("Modul permainan ini belum tersedia.");
      return;
    }
    const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
    // Mode lawan bot pakai setelan picker (winMode/difficulty/playerCount).
    // Mode online DIPATOK per game (ONLINE_CONFIG) — server juga memaksanya, jadi
    // semua pemain online satu game masuk satu antrian/room.
    const oc = ONLINE_CONFIG[gameId] || { target: 2, winMode: "single" };
    const opts =
      mode === "online"
        ? { winMode: oc.winMode, target: oc.target }
        : { winMode, difficulty, playerCount };
    const controller =
      mode === "bot"
        ? new mod.LocalBotController(playerName, opts)
        : new mod.OnlineController(serverUrl, playerName, opts);

    // Banner status koneksi online (reconnect saat sinyal jelek — Fase B3).
    controller.onConnectionChange?.((s) => setConn(s));

    let phaserGame = null;
    let cancelled = false;

    (async () => {
      try {
        if (mode === "online") {
          // Tiga jenis koneksi online (B3): publik / buat room privat / gabung kode.
          if (onlineKind === "create") await controller.connectPrivate();
          else if (onlineKind === "join") await controller.connectByCode(joinCode);
          else await controller.connect();
          if (cancelled) return;
          if (onlineKind === "create") setRoomCode(controller.getCode?.() || "");
        }
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
        if (mode === "online" && onlineKind === "join") {
          setError("Kode room tidak ditemukan, sudah penuh, atau permainan sudah dimulai.");
        } else {
          setError(
            `Gagal terhubung ke server di ${serverUrl}. ` +
              "Pastikan server jalan (npm run dev di folder server)."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.dispose?.();
      phaserGame?.destroy(true);
    };
  }, [mode, onlineKind, joinCode, winMode, difficulty, playerCount, playerName, gameId]);

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
      {roomCode && (
        <div className="code-banner">
          <span>
            🔒 Kode room: <strong>{roomCode}</strong>
          </span>
          <button onClick={() => navigator.clipboard?.writeText(roomCode)}>Salin</button>
          <small>Bagikan kode ini ke temanmu agar bisa bergabung.</small>
        </div>
      )}
      {conn === "reconnecting" && (
        <div className="conn-banner conn-reconnecting">
          ⏳ Koneksi terputus — menyambung ulang…
        </div>
      )}
      {conn === "lost" && (
        <div className="conn-banner conn-lost">
          ⚠️ Koneksi hilang. <button onClick={onExit}>Kembali</button>
        </div>
      )}
      <div ref={hostRef} className="phaser-host" />
    </div>
  );
}
