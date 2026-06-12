import { GAMES } from "../games/registry.js";
import GameCard from "../components/GameCard.jsx";
import AdSlot from "../components/AdSlot.jsx";

export default function Lobby() {
  return (
    <div className="lobby">
      <h2>Pilih permainan</h2>
      <div className="game-grid">
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      <AdSlot slot="lobby-banner" />
    </div>
  );
}
