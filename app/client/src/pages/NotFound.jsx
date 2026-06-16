import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo.js";

export default function NotFound() {
  useSeo("Halaman tidak ditemukan");
  return (
    <div className="empty">
      <h2 style={{ color: "var(--felt-dark)" }}>404 — Halaman tidak ditemukan</h2>
      <p>Maaf, halaman yang kamu cari tidak ada.</p>
      <Link to="/">Kembali ke beranda</Link>
    </div>
  );
}
