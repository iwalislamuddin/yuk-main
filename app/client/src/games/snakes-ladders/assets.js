// Manifest aset grafis Ular Tangga.
// Semua file PNG ditaruh di: client/public/assets/snakes-ladders/
// Spesifikasi lengkap: lihat PANDUAN-ASET.md di folder tersebut.
//
// Setiap aset bersifat OPSIONAL. Bila file belum ada, scene memakai
// grafis vektor bawaan (fallback), jadi aset bisa ditambah bertahap.

export const ASSET_BASE = "/assets/snakes-ladders/";

// Spritesheet karakter pemain, satu file per pemain (maks 4).
export const CHAR_KEYS = ["char-1", "char-2", "char-3", "char-4"];

// Ukuran 1 frame di dalam strip spritesheet karakter.
export const CHAR_FRAME = { frameWidth: 64, frameHeight: 64 };

// Tata letak frame di strip: 0-3 idle (diam), 4-9 walk (jalan).
// Kalau grafismu punya jumlah frame berbeda, cukup ubah angka di sini.
export const CHAR_ANIMS = {
  idle: { start: 0, end: 3, frameRate: 6, repeat: -1 },
  walk: { start: 4, end: 9, frameRate: 14, repeat: -1 }
};

// Spritesheet dadu: 6 frame, frame ke-i = muka dadu (i+1).
export const DICE_KEY = "dice";
export const DICE_FRAME = { frameWidth: 96, frameHeight: 96 };

export function loadAssets(scene) {
  const load = scene.load;
  load.setPath(ASSET_BASE);
  load.image("board", "board.png");
  load.image("snake", "snake.png");
  load.image("ladder", "ladder.png");
  for (const key of CHAR_KEYS) load.spritesheet(key, `${key}.png`, CHAR_FRAME);
  load.spritesheet(DICE_KEY, "dice.png", DICE_FRAME);
  load.setPath();
}

// File yang gagal dimuat (belum disediakan) tidak terdaftar sebagai texture.
export function hasTexture(scene, key) {
  return scene.textures.exists(key);
}
