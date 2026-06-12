// Daftar game di platform. Menambah game baru = tambah entri di sini
// + buat folder modulnya di src/games/<id>/ + room-nya di server.
export const GAMES = [
  {
    id: "ular-tangga",
    name: "Ular Tangga",
    icon: "🐍",
    desc: "Lempar dadu, naiki tangga, hindari ular. Pertama sampai 100 menang.",
    players: "2",
    available: true
  },
  {
    id: "ludo",
    name: "Ludo",
    icon: "🎲",
    desc: "Bawa keempat pionmu pulang ke rumah sebelum lawan.",
    players: "2-4",
    available: false
  },
  {
    id: "halma",
    name: "Halma",
    icon: "⭐",
    desc: "Lompati pion dan kuasai sudut seberang papan.",
    players: "2-3",
    available: false
  }
];
