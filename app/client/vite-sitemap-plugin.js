// Generate sitemap.xml otomatis saat build, supaya selalu sinkron dengan
// halaman statis + artikel blog (src/content/blog/*.md). Tidak ada file
// sitemap yang di-commit: ini di-emit langsung ke dist/ saat `vite build`.
//
// Catatan SEO: <lastmod> diambil dari tanggal asli artikel (frontmatter),
// BUKAN waktu build. Jadi lastmod hanya berubah kalau kontennya berubah —
// inilah yang membuat Google mempercayai sinyal lastmod.
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://yukmain.web.id";

// Halaman statis yang layak diindeks. Area permainan (/play/:gameId) sengaja
// tidak dimasukkan: butuh nama pemain dan bukan konten untuk hasil pencarian.
const STATIC_PATHS = ["/", "/lobi", "/blog", "/tentang", "/privacy", "/hall-of-fame"];

const blogDir = () =>
  resolve(dirname(fileURLToPath(import.meta.url)), "src/content/blog");

// Baca slug + tanggal dari tiap file Markdown (parsing frontmatter ringan).
function readPosts() {
  return readdirSync(blogDir())
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(resolve(blogDir(), f), "utf8");
      const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const d = fm && fm[1].match(/^date:\s*(.+)$/m);
      return { slug: f.replace(/\.md$/, ""), date: d ? d[1].trim() : "" };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // terbaru dulu
}

function buildXml() {
  const posts = readPosts();
  const latest = posts.map((p) => p.date).filter(Boolean).sort().pop() || "";

  const urls = STATIC_PATHS.map((p) => ({
    loc: SITE + p,
    // /blog memakai tanggal artikel terbaru sebagai lastmod; halaman statis
    // lain dibiarkan tanpa lastmod (kita tak punya sinyal yang akurat).
    lastmod: p === "/blog" ? latest : ""
  }));
  for (const post of posts) {
    urls.push({ loc: `${SITE}/blog/${post.slug}`, lastmod: post.date });
  }

  const body = urls
    .map(({ loc, lastmod }) =>
      lastmod
        ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${loc}</loc></url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export default function sitemapPlugin() {
  return {
    name: "yukmain-sitemap",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: buildXml() });
    }
  };
}
