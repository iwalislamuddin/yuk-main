// Sistem blog ringan tanpa backend: artikel = file Markdown di src/content/blog/.
// Dimuat saat build via import.meta.glob (eager) lalu di-parse frontmatter-nya.
// Saat siap (Fase C), ini bisa diganti sumbernya ke API CRUD tanpa mengubah halaman.
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ gfm: true, breaks: false });

// Semua *.md di folder konten, sebagai string mentah.
const files = import.meta.glob("../content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true
});

// Pisahkan blok frontmatter (--- ... ---) dari isi Markdown.
function parse(raw, path) {
  const slug = path.split("/").pop().replace(/\.md$/, "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (match) {
    body = match[2];
    for (const line of match[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    description: meta.description || "",
    tags: meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    body
  };
}

// Daftar artikel, terbaru di atas.
const posts = Object.entries(files)
  .map(([path, raw]) => parse(raw, path))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export function getPosts() {
  return posts;
}

export function getPost(slug) {
  return posts.find((p) => p.slug === slug) || null;
}

// Markdown -> HTML aman (disanitasi). Penting saat nanti isi datang dari admin/CRUD.
export function renderMarkdown(md) {
  return DOMPurify.sanitize(marked.parse(md || ""));
}

// "2026-06-16" -> "16 Juni 2026"
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
export function formatTanggal(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}
