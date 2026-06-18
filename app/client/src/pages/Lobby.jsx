import { useNavigate } from "react-router-dom";
import { GAMES } from "../games/registry.js";
import GameCard from "../components/GameCard.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { useSeo } from "../lib/seo.js";
import { useLobby } from "../lib/lobbyApi.js";

const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export default function Lobby() {
  useSeo(
    "Main — Pilih Permainan",
    "Pilih board game untuk dimainkan: Ular Tangga, Ludo, atau Halma. Online atau lawan bot."
  );
  const navigate = useNavigate();
  const { data } = useLobby();
  const rooms = data?.rooms || [];
  const waitingByGame = data?.waitingByGame || {};

  // Gabung room menunggu: konfigurasi online dipatok per game (satu antrian),
  // jadi cukup buka halaman game dengan mode online — server mendaratkan pemain
  // di room yang sedang menunggu untuk game itu.
  const join = (room) => {
    navigate(`/play/${room.gameId}?online=1`);
  };

  return (
    <div className="lobby">
      {rooms.length > 0 && (
        <section className="waiting-rooms">
          <h2>Sedang menunggu lawan</h2>
          <ul className="waiting-list">
            {rooms.map((room) => {
              const g = GAME_BY_ID[room.gameId];
              return (
                <li key={room.roomId} className="waiting-item">
                  <span className="game-icon" aria-hidden="true">{g?.icon}</span>
                  <span className="waiting-info">
                    <strong>{g?.name || room.gameId}</strong>
                    <small>
                      {room.host} menunggu · {room.humans}/{room.max} pemain
                      {room.mode === "ranking" ? " · mode peringkat" : ""}
                    </small>
                  </span>
                  <button className="join-btn" onClick={() => join(room)}>
                    Gabung
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <h2>Pilih permainan</h2>
      <div className="game-grid">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} waiting={waitingByGame[g.id] || 0} />
        ))}
      </div>
      <AdSlot slot="lobby-banner" />
    </div>
  );
}
