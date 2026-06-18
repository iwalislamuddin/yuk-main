// Klien Hall of Fame global. Server Colyseus juga menyediakan endpoint HTTP
// /hof di host yang sama dengan WebSocket-nya.
import { getPlayerName } from "./storage.js";

// VITE_SERVER_URL berupa ws(s)://host untuk Colyseus. Endpoint HTTP ada di host
// yang sama -> cukup ganti skema: ws->http, wss->https.
function apiBase() {
  const ws = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  return ws.replace(/^ws(s?):\/\//, "http$1://");
}

/**
 * Kirim hasil LAWAN-BOT (offline) ke leaderboard global. Fire-and-forget:
 * kegagalan (server tidur / offline) diabaikan supaya tak mengganggu permainan
 * — rekor lokal perangkat tetap tercatat lewat storage.recordResult.
 */
export async function postBotResult(gameId, win) {
  try {
    await fetch(`${apiBase()}/hof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: getPlayerName() || "Anonim",
        gameId,
        win: !!win
      })
    });
  } catch {
    /* diabaikan: best-effort */
  }
}

/**
 * Ambil baris leaderboard global: [{ name, gameId, wins, plays }].
 * Dipakai HallOfFame.jsx lalu diagregasi dgn buildLeaderboard().
 * Melempar error bila server tak terjangkau (pemanggil menyiapkan fallback).
 */
export async function fetchLeaderboard() {
  const res = await fetch(`${apiBase()}/hof`);
  if (!res.ok) throw new Error("gagal memuat leaderboard");
  const data = await res.json();
  return Array.isArray(data.rows) ? data.rows : [];
}
