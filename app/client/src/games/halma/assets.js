// Manifest aset grafis Halma bintang.
// Semua file PNG ditaruh di: client/public/assets/halma/
// Spesifikasi lengkap: lihat PANDUAN-ASET.md di folder tersebut.
//
// Setiap aset OPSIONAL. Bila file belum ada, scene memakai grafis vektor bawaan
// (fallback), jadi aset bisa ditambah bertahap. Warning 404 di console itu normal.

export const ASSET_BASE = "/assets/halma/";

export const BOARD_KEY = "board";

// Satu gambar kelereng PUTIH/abu (tampak atas). Engine mewarnainya per pemain
// dengan tint, jadi cukup satu file untuk semua warna.
export const MARBLE_KEY = "marble";

export function loadAssets(scene) {
  const load = scene.load;
  load.setPath(ASSET_BASE);
  load.image(BOARD_KEY, "board.png");
  load.image(MARBLE_KEY, "marble.png");
  load.setPath();
}

export function hasTexture(scene, key) {
  return scene.textures.exists(key);
}
