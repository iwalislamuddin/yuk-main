// Lapisan tipis di atas Room Colyseus, dipakai SEMUA controller online (Ular
// Tangga, Ludo, Halma). Dua tugas:
//  1. Menyalurkan state server -> controller.mapState() -> callback scene.
//  2. RECONNECT OTOMATIS saat koneksi putus tak sengaja (refresh/sinyal jelek),
//     selaras dgn allowReconnection() di server (masa tenggang ~30 dtk). Selama
//     itu server menahan kursi pemain; di sini kita coba sambung ulang berkala.
//
// Kontrak controller: punya `client`, `mapState(state)`, opsional `cb` (callback
// scene). Setelah join, panggil bindRoom(this, room). Status koneksi dilaporkan
// lewat controller.statusCb (lihat onConnectionChange di tiap controller).

import { Client } from "colyseus.js";

const RECONNECT_WINDOW_MS = 35_000; // sedikit lebih lama dari grace server (30s)
const RETRY_DELAY_MS = 2_000;
const CONSENTED = 4000; // CloseCode.CONSENTED — leave disengaja (room.leave())

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureClient(controller) {
  if (!controller.client) controller.client = new Client(controller.url);
  return controller.client;
}

// --- Tiga cara masuk room (semua memakai bindRoom + reconnect yang sama) ---

// Matchmaking publik: gabung room menunggu untuk game ini, atau buat baru.
export async function joinPublic(controller, roomName, options) {
  const room = await ensureClient(controller).joinOrCreate(roomName, options);
  bindRoom(controller, room);
}

// Room privat (B3): selalu BUAT room baru + setPrivate; roomId jadi KODE undangan.
export async function createPrivate(controller, roomName, options) {
  const room = await ensureClient(controller).create(roomName, { ...options, private: true });
  bindRoom(controller, room);
}

// Gabung room privat lewat KODE (roomId). Lempar error bila kode salah/penuh.
export async function joinByCode(controller, code, options) {
  const room = await ensureClient(controller).joinById(code, options);
  bindRoom(controller, room);
}

// Pasang room ke controller: salurkan state + pantau putus untuk reconnect.
export function bindRoom(controller, room) {
  // Balapan: bila controller sudah di-dispose SEBELUM room sempat terbentuk
  // (pengguna keluar saat masih menyambung), tinggalkan room ini segera supaya
  // tak ada room yatim yang menggantung di server.
  if (controller.disposed) {
    room.leave();
    return;
  }
  controller.room = room;
  controller.reconnectionToken = room.reconnectionToken;
  room.onStateChange((state) => {
    controller.lastState = controller.mapState(state);
    controller.cb?.(controller.lastState);
  });
  room.onLeave((code) => handleLeave(controller, code));
}

async function handleLeave(controller, code) {
  if (controller.disposed) return; // kita sendiri yang menutup
  if (code === CONSENTED) return; // leave disengaja
  const st = controller.lastState;
  if (st && (st.winner || st.phase === "finished")) return; // game sudah usai

  setStatus(controller, "reconnecting");
  const token = controller.reconnectionToken;
  const deadline = Date.now() + RECONNECT_WINDOW_MS;
  while (!controller.disposed && Date.now() < deadline) {
    try {
      const room = await controller.client.reconnect(token);
      bindRoom(controller, room); // re-bind + token baru
      setStatus(controller, "connected");
      return;
    } catch (e) {
      await delay(RETRY_DELAY_MS);
    }
  }
  if (!controller.disposed) setStatus(controller, "lost");
}

function setStatus(controller, status) {
  controller.connStatus = status;
  controller.statusCb?.(status);
}
