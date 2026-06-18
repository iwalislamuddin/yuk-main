import { Link } from "react-router-dom";
import { GAMES } from "../games/registry.js";
import GameCard from "../components/GameCard.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { getPosts, formatTanggal } from "../lib/blog.js";
import { useSeo } from "../lib/seo.js";
import { useLobby } from "../lib/lobbyApi.js";

export default function Home() {
  useSeo(
    "Board Game Online: Ular Tangga, Ludo, Halma",
    "Mainkan Ular Tangga, Ludo, dan Halma secara online atau melawan bot. Gratis, langsung di browser, tanpa pasang aplikasi."
  );
  const posts = getPosts().slice(0, 3);
  const { data: lobby } = useLobby();
  const online = lobby?.online || 0;
  const waitingByGame = lobby?.waitingByGame || {};

  return (
    <div className="home">
      <section className="hero">
        <h1>Yuk Main</h1>
        <p className="hero-sub">
          Kumpulan board game klasik yang bisa kamu mainkan langsung di browser —
          <strong> online bersama teman</strong> atau <strong>melawan bot</strong>.
          Gratis, tanpa perlu memasang aplikasi.
        </p>
        <div className="hero-cta">
          <Link to="/lobi" className="cta-btn">Mulai bermain</Link>
          <Link to="/tentang" className="cta-link">Pelajari dulu</Link>
        </div>
        {online > 0 && (
          <p className="online-count" title="Pemain yang sedang tersambung & siap bermain online">
            🟢 {online} pemain sedang online
          </p>
        )}
      </section>

      <section className="home-section">
        <h2>Pilih permainan</h2>
        <div className="game-grid">
          {GAMES.map((g) => (
            <GameCard key={g.id} game={g} waiting={waitingByGame[g.id] || 0} />
          ))}
        </div>
      </section>

      <section className="home-section about-blurb">
        <h2>Tentang Yuk Main</h2>
        <p>
          Yuk Main adalah platform permainan papan ringan yang berjalan di
          dalam peramban. Kami menghadirkan permainan keluarga yang familiar —
          Ular Tangga, Ludo, dan Halma — dengan kontrol sederhana dan papan yang
          mudah dibaca, sehingga nyaman dimainkan baik di ponsel maupun komputer.
          Semua permainan bisa dicoba sendiri melawan bot, atau dimainkan bersama
          pemain lain secara daring.
        </p>
        <p>
          Ingin tahu aturan main atau sejarah tiap permainan? Kami juga menulis
          panduan dan artikel ringan di <Link to="/blog">blog</Link>.
        </p>
      </section>

      {posts.length > 0 && (
        <section className="home-section">
          <h2>Dari blog</h2>
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`} className="post-item">
                  <span className="post-title">{p.title}</span>
                  <span className="post-meta">{formatTanggal(p.date)}</span>
                  <span className="post-desc">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot slot="home-banner" />
    </div>
  );
}
