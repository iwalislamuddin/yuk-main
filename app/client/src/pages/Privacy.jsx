import { Link } from "react-router-dom";
import { useSeo } from "../lib/seo.js";

export default function Privacy() {
  useSeo(
    "Kebijakan Privasi",
    "Kebijakan privasi Yuk Main: data yang kami simpan, penggunaan cookie, dan iklan pihak ketiga."
  );

  return (
    <div className="page-text">
      <h2>Kebijakan Privasi</h2>
      <p className="muted-ink">Terakhir diperbarui: 16 Juni 2026</p>

      <p>
        Halaman ini menjelaskan bagaimana Yuk Main ("kami") memperlakukan
        informasi saat kamu menggunakan situs ini. Dengan menggunakan Arena
        Papan, kamu menyetujui praktik yang dijelaskan di bawah ini.
      </p>

      <h3>Data yang kami simpan</h3>
      <p>
        Yuk Main tidak meminta pendaftaran akun dan tidak mengumpulkan data
        pribadi seperti nama asli, alamat, atau nomor telepon. Nama pemain yang
        kamu masukkan dan riwayat kemenangan untuk papan "Hall of Fame" disimpan
        secara <strong>lokal di perangkatmu</strong> (melalui <em>localStorage</em>{" "}
        peramban) dan tidak dikirim ke server kami untuk identifikasi pribadi.
      </p>

      <h3>Cookie dan teknologi serupa</h3>
      <p>
        Kami dapat menggunakan cookie dan penyimpanan lokal untuk menjaga
        preferensi serta menjalankan fitur situs. Selain itu, mitra periklanan
        pihak ketiga juga dapat menggunakan cookie sebagaimana dijelaskan di
        bawah.
      </p>

      <h3>Iklan pihak ketiga</h3>
      <ul>
        <li>
          Kami dapat menampilkan iklan dari <strong>Google AdSense</strong>.
          Sebagai vendor pihak ketiga, Google menggunakan cookie untuk
          menayangkan iklan berdasarkan kunjungan kamu ke situs ini dan situs
          lain di internet.
        </li>
        <li>
          Google menggunakan cookie iklan untuk memungkinkan penayangan iklan
          yang lebih relevan kepada pengguna.
        </li>
        <li>
          Kamu dapat menonaktifkan iklan yang dipersonalisasi melalui{" "}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Setelan Iklan Google
          </a>
          , atau mempelajari opsi opt-out vendor pihak ketiga di{" "}
          <a
            href="https://www.aboutads.info/choices/"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.aboutads.info
          </a>
          .
        </li>
      </ul>

      <h3>Tautan ke situs lain</h3>
      <p>
        Situs kami dapat memuat tautan ke situs pihak ketiga. Kami tidak
        bertanggung jawab atas praktik privasi situs-situs tersebut, dan
        menganjurkan kamu membaca kebijakan privasi mereka masing-masing.
      </p>

      <h3>Privasi anak</h3>
      <p>
        Yuk Main ditujukan untuk khalayak umum dan tidak secara sengaja
        mengumpulkan data pribadi dari anak-anak.
      </p>

      <h3>Perubahan kebijakan</h3>
      <p>
        Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan akan ditampilkan
        di halaman ini beserta tanggal pembaruannya.
      </p>

      <h3>Kontak</h3>
      <p>
        Jika ada pertanyaan tentang kebijakan privasi ini, hubungi kami di{" "}
        <a href="mailto:iwal@yukmain.web.id">iwal@yukmain.web.id</a>.
      </p>

      <p>
        <Link to="/">Kembali ke beranda</Link>
      </p>
    </div>
  );
}
