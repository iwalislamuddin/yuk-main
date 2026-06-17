import { useEffect } from "react";

const BASE = "Yuk Main";

// Set <title> + <meta name="description"> per halaman. Untuk SPA, crawler modern
// (termasuk Google/AdSense) menjalankan JS, jadi judul dinamis tetap terbaca.
export function useSeo(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", description);
    }
  }, [title, description]);
}
