import { GAMES } from "../games/registry.js";
import GameCard from "../components/GameCard.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { useSeo } from "../lib/seo.js";

export default function Lobby() {
  useSeo(
    "Main — Pilih Permainan",
    "Pilih board game untuk dimainkan: Ular Tangga, Ludo, atau Halma. Online atau lawan bot."
  );
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
