import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo.js";

export default function About() {
  useSeo(
    "Tentang Yuk Main",
    "Apa itu Yuk Main, permainan apa saja yang tersedia, dan bagaimana cara memainkannya."
  );

  return (
    <div className="page-text">
      <h2>Tentang Yuk Main</h2>

      <p>
        Yuk Main adalah platform permainan papan (board game) yang berjalan
        langsung di peramban. Tujuan kami sederhana: menghadirkan permainan
        keluarga yang familiar dengan cara yang ringan, gratis, dan mudah diakses
        dari mana saja — tanpa perlu memasang aplikasi.
      </p>

      <h3>Permainan yang tersedia</h3>
      <ul>
        <li>
          <strong>Ular Tangga</strong> — permainan dadu klasik; naiki tangga,
          hindari ular, pertama sampai kotak 100 menang.
        </li>
        <li>
          <strong>Ludo</strong> — balapan empat pion mengelilingi papan salib;
          keluarkan pion dengan dadu 6 dan bawa semuanya pulang.
        </li>
        <li>
          <strong>Halma</strong> — papan bintang enam sudut; pindahkan sepuluh
          pion ke sudut seberang dengan menggeser dan melompat.
        </li>
      </ul>

      <h3>Cara bermain</h3>
      <p>
        Setiap permainan bisa dimainkan dengan dua cara: <strong>melawan bot</strong>{" "}
        di perangkatmu sendiri, atau <strong>online</strong> melawan pemain lain.
        Pilih permainan dari <Link to="/lobi">halaman main</Link>, lalu tentukan
        modenya. Panduan aturan tiap permainan kami tulis lengkap di{" "}
        <Link to="/blog">blog</Link>.
      </p>

      <h3>Bagaimana ini dibiayai</h3>
      <p>
        Yuk Main gratis untuk dimainkan. Agar tetap bisa berjalan, sebagian
        halaman menampilkan iklan dari pihak ketiga. Penjelasan mengenai data dan
        cookie dapat kamu baca di <Link to="/privacy">Kebijakan Privasi</Link>.
      </p>

      <h3>Kontak</h3>
      <p>
        Ada masukan, laporan bug, atau pertanyaan? Hubungi kami di{" "}
        <a href="mailto:iwal@yukmain.web.id">iwal@yukmain.web.id</a>.
      </p>
    </div>
  );
}
