// Manifest aset grafis Ludo.
// Semua file PNG ditaruh di: client/public/assets/ludo/
// Spesifikasi lengkap: lihat PANDUAN-ASET.md di folder tersebut.
//
// Setiap aset bersifat OPSIONAL. Bila file belum ada, scene memakai grafis
// vektor bawaan (fallback), jadi aset bisa ditambah bertahap.

export const ASSET_BASE = "/assets/ludo/";

// Pion (token) — satu gambar per warna pemain (tampak atas). Maks 4.
export const PIN_KEYS = ["pin-1", "pin-2", "pin-3", "pin-4"];

// Spritesheet dadu: 6 frame, frame ke-i = muka dadu (i+1).
// Formatnya SAMA PERSIS dengan dadu Ular Tangga — kamu boleh menyalin
// dice.png dari assets/snakes-ladders/ ke sini.
export const DICE_KEY = "dice";
export const DICE_FRAME = { frameWidth: 96, frameHeight: 96 };

export function loadAssets(scene) {
  const load = scene.load;
  load.setPath(ASSET_BASE);
  load.image("board", "board.png");
  for (const key of PIN_KEYS) load.image(key, `${key}.png`);
  load.spritesheet(DICE_KEY, "dice.png", DICE_FRAME);
  load.setPath();
}

// File yang gagal dimuat (belum disediakan) tidak terdaftar sebagai texture.
export function hasTexture(scene, key) {
  return scene.textures.exists(key);
}
