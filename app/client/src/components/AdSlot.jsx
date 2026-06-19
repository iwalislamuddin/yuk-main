import { useEffect, useRef } from "react";

/**
 * Slot iklan AdSense.
 * - Tanpa VITE_ADSENSE_CLIENT: tampil sebagai placeholder (mode development).
 * - Dengan VITE_ADSENSE_CLIENT: render unit <ins> dan push ke adsbygoogle.
 *
 * Aturan penting kebijakan AdSense untuk situs game:
 * - Jangan menaruh iklan menutupi atau menempel area gameplay.
 * - Posisi aman: lobi, halaman pra-game, dan transisi antar match.
 */
export default function AdSlot({ slot, format = "auto", style }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const insRef = useRef(null);

  useEffect(() => {
    if (!client || !insRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle belum siap; abaikan di development
    }
  }, [client]);

  // Internal note: AdSense belum diaktifkan (VITE_ADSENSE_CLIENT belum diisi).
  // Sementara slot dipakai untuk promosi mandiri (Edifisia). Begitu env diisi,
  // unit AdSense di bawah akan dirender menggantikan promo ini.
  if (!client) {
    return (
      <aside className="promo-slot">
        <span className="promo-eyebrow">Promosi mitra</span>
        <p className="promo-text">
          Edifisia: rumahnya library, spreadsheet, dan ebook teknik sipil —
          praktis, rapi, siap pakai.
        </p>
        <a
          className="promo-link"
          href="https://lynk.id/edifisia"
          target="_blank"
          rel="noopener noreferrer"
        >
          Lihat Edifisia di sini
        </a>
      </aside>
    );
  }

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: "block", minHeight: 90, ...style }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
