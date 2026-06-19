// Kode room privat (B3). Dulu kode = roomId Colyseus (9 char acak) — susah
// disebarkan lewat lisan/chat. Sekarang kode = ANGKA 4 digit (1000-9999), jauh
// lebih mudah dibagikan. DIGITS bisa dinaikkan (5, 6, ...) kalau ruang kode
// mulai sempit — `findRoomIdByCode` & validasi server tinggal ikut.
const { matchMaker } = require("colyseus");

const DIGITS = 4;

// Kumpulkan kode yang sedang dipakai room privat aktif (per nama game) supaya
// kode baru tak bentrok.
async function existingCodes(roomName) {
  const used = new Set();
  try {
    const rooms = await matchMaker.query({ name: roomName });
    for (const r of rooms) {
      const c = r.metadata && r.metadata.code;
      if (c) used.add(String(c));
    }
  } catch (e) {
    // Gagal query (mis. saat start) -> jatuh ke acak murni; bentrok sangat kecil.
  }
  return used;
}

// Buat kode acak `digits` angka yang belum dipakai room game ini.
async function generatePrivateCode(roomName, digits = DIGITS) {
  const used = await existingCodes(roomName);
  const min = Math.pow(10, digits - 1); // 1000 utk 4 digit (tanpa nol di depan)
  const span = Math.pow(10, digits) - min; // 9000 kemungkinan
  for (let i = 0; i < 50; i++) {
    const code = String(min + Math.floor(Math.random() * span));
    if (!used.has(code)) return code;
  }
  return String(min + Math.floor(Math.random() * span)); // fallback (amat jarang)
}

// Cari roomId room privat yang punya kode ini (untuk joinById di client).
async function findRoomIdByCode(roomName, code) {
  try {
    const rooms = await matchMaker.query({ name: roomName });
    const hit = rooms.find(
      (r) => r.metadata && String(r.metadata.code) === String(code)
    );
    return hit ? hit.roomId : null;
  } catch (e) {
    return null;
  }
}

module.exports = { generatePrivateCode, findRoomIdByCode, DIGITS };
