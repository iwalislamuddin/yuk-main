// Logika inti Ular Tangga (sisi client, untuk mode lawan bot offline).
// PENTING: jaga agar identik dengan server/logic/snakesLadders.js.

export const FINISH = 100;

// key = kotak asal, value = kotak tujuan. Naik = tangga, turun = ular.
export const JUMPS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
};

export function rollDice() {
  return 1 + Math.floor(Math.random() * 6);
}

export function applyMove(pos, dice) {
  let next = pos + dice;
  if (next > FINISH) next = pos; // harus pas mendarat di 100
  if (JUMPS[next]) next = JUMPS[next];
  return next;
}
