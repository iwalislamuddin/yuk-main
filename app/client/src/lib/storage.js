// Penyimpanan lokal: nama pemain + Hall of Fame perangkat ini.
// Catatan: localStorage = per-perangkat. Untuk leaderboard global,
// pindahkan pencatatan ke server (lihat README, bagian Roadmap).

const NAME_KEY = "arenaPapan.playerName";
const HOF_KEY = "arenaPapan.hallOfFame";

export function getPlayerName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function getHallOfFame() {
  try {
    return JSON.parse(localStorage.getItem(HOF_KEY)) || [];
  } catch {
    return [];
  }
}

/**
 * Catat hasil satu permainan untuk pemain aktif.
 * @param {string} gameId  contoh: "ular-tangga"
 * @param {{win: boolean}} result
 */
export function recordResult(gameId, { win }) {
  const name = getPlayerName() || "Anonim";
  const list = getHallOfFame();
  let entry = list.find((e) => e.name === name && e.gameId === gameId);
  if (!entry) {
    entry = { name, gameId, wins: 0, plays: 0 };
    list.push(entry);
  }
  entry.plays += 1;
  if (win) entry.wins += 1;
  entry.lastPlayed = Date.now();
  localStorage.setItem(HOF_KEY, JSON.stringify(list));
}
