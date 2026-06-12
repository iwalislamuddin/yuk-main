// Logika inti Ular Tangga (sisi server - otoritatif).
// PENTING: jaga agar identik dengan client/src/games/snakes-ladders/logic.js.

const FINISH = 100;

const JUMPS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
};

function rollDice() {
  return 1 + Math.floor(Math.random() * 6);
}

function applyMove(pos, dice) {
  let next = pos + dice;
  if (next > FINISH) next = pos; // harus pas mendarat di 100
  if (JUMPS[next]) next = JUMPS[next];
  return next;
}

module.exports = { FINISH, JUMPS, rollDice, applyMove };
