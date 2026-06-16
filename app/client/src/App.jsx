import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import { getPlayerName } from "./lib/storage.js";
import NameGate from "./components/NameGate.jsx";
import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Blog from "./pages/Blog.jsx";
import Article from "./pages/Article.jsx";
import About from "./pages/About.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";
import HallOfFame from "./pages/HallOfFame.jsx";

// Lazy: Phaser + colyseus.js (besar) hanya diunduh saat membuka halaman game.
const GamePage = lazy(() => import("./pages/GamePage.jsx"));

export default function App() {
  // Nama pemain tidak lagi mengunci seluruh situs — halaman publik (beranda,
  // blog, tentang, privasi) bisa dibaca siapa pun (penting untuk SEO & AdSense).
  // Nama hanya diminta saat benar-benar masuk sebuah permainan.
  const [name, setName] = useState(getPlayerName());

  // Gerbang nama khusus area game: kalau belum ada nama, tampilkan NameGate dulu.
  const requireName = (el) => (name ? el : <NameGate onDone={setName} />);

  return (
    <BrowserRouter>
      <header className="topbar">
        <Link to="/" className="brand">Arena Papan</Link>
        <nav>
          <NavLink to="/" end>Beranda</NavLink>
          <NavLink to="/lobi">Main</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/tentang">Tentang</NavLink>
          <NavLink to="/hall-of-fame">Hall of Fame</NavLink>
        </nav>
        {name && (
          <span className="player-chip" title="Nama pemain (tersimpan di perangkat ini)">
            {name}
          </span>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobi" element={<Lobby />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Article />} />
          <Route path="/tentang" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route
            path="/play/:gameId"
            element={requireName(
              <Suspense fallback={<div className="empty">Memuat permainan...</div>}>
                <GamePage playerName={name} />
              </Suspense>
            )}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <nav className="footer-nav">
          <Link to="/tentang">Tentang</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/privacy">Kebijakan Privasi</Link>
        </nav>
        <p>© 2026 Arena Papan · React + Phaser + Colyseus · PWA</p>
      </footer>
    </BrowserRouter>
  );
}
