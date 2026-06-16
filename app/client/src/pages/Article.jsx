import { useParams, Link } from "react-router-dom";
import { getPost, renderMarkdown, formatTanggal } from "../lib/blog.js";
import { useSeo } from "../lib/seo.js";
import AdSlot from "../components/AdSlot.jsx";

export default function Article() {
  const { slug } = useParams();
  const post = getPost(slug);
  useSeo(post ? post.title : "Artikel tidak ditemukan", post?.description);

  if (!post) {
    return (
      <div className="empty">
        Artikel tidak ditemukan. <Link to="/blog">Kembali ke blog</Link>
      </div>
    );
  }

  return (
    <article className="article">
      <Link to="/blog" className="back-link">&larr; Semua artikel</Link>
      <h1>{post.title}</h1>
      <p className="article-meta">{formatTanggal(post.date)}</p>
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
      />
      <AdSlot slot="article-banner" />
    </article>
  );
}
