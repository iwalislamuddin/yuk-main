import { Link } from "react-router-dom";

export default function GameCard({ game }) {
  const body = (
    <>
      <span className="game-icon" aria-hidden="true">{game.icon}</span>
      <h3>{game.name}</h3>
      <p>{game.desc}</p>
      <span className={game.available ? "badge live" : "badge"}>
        {game.available ? `${game.players} pemain` : "Segera hadir"}
      </span>
    </>
  );

  if (!game.available) return <div className="game-card disabled">{body}</div>;
  return <Link to={`/play/${game.id}`} className="game-card">{body}</Link>;
}
