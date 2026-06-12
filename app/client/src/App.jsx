import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import { getPlayerName } from "./lib/storage.js";
import NameGate from "./components/NameGate.jsx";
import Lobby from "./pages/Lobby.jsx";
import HallOfFame from "./pages/HallOfFame.jsx";

// Lazy: Phaser + colyseus.js (besar) hanya diunduh saat membuka halaman game.
const GamePage = lazy(() => import("./pages/GamePage.jsx"));

export default function App() {
  const [name, setName] = useState(getPlayerName());

  // Gerbang nama: wajib isi nama dulu sebelum masuk platform.
  if (!name) return <NameGate onDone={setName} />;

  return (
    <BrowserRouter>
      <header className="topbar">
        <Link to="/" className="brand">Arena Papan</Link>
        <nav>
          <NavLink to="/" end>Lobi</NavLink>
          <NavLink to="/hall-of-fame">Hall of Fame</NavLink>
        </nav>
        <span className="player-chip" title="Nama pemain (tersimpan di perangkat ini)">{name}</span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route
            path="/play/:gameId"
            element={
              <Suspense fallback={<div className="empty">Memuat permainan...</div>}>
                <GamePage playerName={name} />
              </Suspense>
            }
          />
        </Routes>
      </main>
      <footer className="footer">React + Phaser + Colyseus · PWA</footer>
    </BrowserRouter>
  );
}
