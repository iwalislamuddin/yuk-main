// Klien lobi online (presence + discovery). Server Colyseus menyediakan
// endpoint HTTP /lobby di host yang sama dengan WebSocket-nya.
import { useEffect, useState } from "react";

// VITE_SERVER_URL berupa ws(s)://host untuk Colyseus. Endpoint HTTP ada di host
// yang sama -> cukup ganti skema: ws->http, wss->https.
function apiBase() {
  const ws = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  return ws.replace(/^ws(s?):\/\//, "http$1://");
}

/**
 * Ambil keadaan lobi global:
 *   { online, rooms: [{ roomId, gameId, host, mode, humans, max }], waitingByGame }
 * Melempar error bila server tak terjangkau (pemanggil menyiapkan fallback).
 */
export async function fetchLobby() {
  const res = await fetch(`${apiBase()}/lobby`);
  if (!res.ok) throw new Error("gagal memuat lobi");
  return res.json();
}

/**
 * Hook: poll /lobby tiap `intervalMs`. Mengembalikan { data, error }.
 * Saat server tidur/offline, `error` true & `data` tetap nilai terakhir (atau null).
 * Best-effort: kegagalan tidak mengganggu halaman (presence cuma pemanis).
 */
export function useLobby(intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const d = await fetchLobby();
        if (!alive) return;
        setData(d);
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) timer = setTimeout(tick, intervalMs);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return { data, error };
}
