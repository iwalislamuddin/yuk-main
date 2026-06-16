import { Link } from "react-router-dom";
import { getPosts, formatTanggal } from "../lib/blog.js";
import { useSeo } from "../lib/seo.js";
import AdSlot from "../components/AdSlot.jsx";

export default function Blog() {
  useSeo(
    "Blog — Panduan & Artikel Board Game",
    "Panduan bermain, sejarah, dan tips untuk Ular Tangga, Ludo, Halma, dan permainan papan lainnya."
  );
  const posts = getPosts();

  return (
    <div className="blog">
      <h2>Blog</h2>
      <p className="blog-intro">
        Panduan, sejarah, dan tips seputar permainan papan yang ada di Arena Papan.
      </p>

      {posts.length === 0 ? (
        <p className="muted">Belum ada artikel.</p>
      ) : (
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
      )}

      <AdSlot slot="blog-banner" />
    </div>
  );
}
