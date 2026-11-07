(function () {
var A = window.App;
A.data = A.data || {};
A.data.trik = [
  { id: 'b-001', t: 'pancasila', judul: 'Dua hubungan pada soal sila',
    inti: 'Baca soal sila lewat dua hubungan: manusia dengan Tuhan, dan manusia dengan manusia. Untuk hubungan manusia dengan manusia, kuncinya saling menghormati dan tidak memaksa.',
    contoh: '', catatan: 'Sesuaikan dengan isi pilihan jawabannya.', sumber: 'Al Faiz', tipe: 'user' },
  { id: 'c-001', t: 'pancasila', judul: 'Kata kunci perilaku ke sila',
    inti: 'Ibadah dan toleransi beragama: sila 1. Martabat manusia dan tidak semena-mena: sila 2. Persatuan dan cinta tanah air: sila 3. Musyawarah: sila 4. Keadilan sosial: sila 5.',
    contoh: 'Menghormati teman yang beribadah berbeda: sila 1.', catatan: 'Gotong royong kadang dikaitkan ke sila 3 atau 5, lihat konteks soal.', sumber: 'Claude', tipe: 'claude' },
  { id: 'c-002', t: 'numerik', judul: 'Deret: tulis selisihnya dulu',
    inti: 'Tulis selisih antarangka. Kalau tetap, itu deret aritmetika. Kalau tidak, cek pengali. Kalau masih tidak cocok, cek pola selang-seling.',
    contoh: '3, 6, 12, 24: pengali 2, jadi berikutnya 48.', catatan: 'Pada deret panjang, coba pisahkan angka urutan ganjil dan genap.', sumber: 'Claude', tipe: 'claude' },
  { id: 'c-003', t: 'numerik', judul: 'Diskon dan persen',
    inti: 'Diskon x persen berarti membayar (100 dikurangi x) persen dari harga awal. Hitung langsung bagian yang dibayar.',
    contoh: 'Diskon 15% dari 200.000: bayar 85% × 200.000 = 170.000.', catatan: '', sumber: 'Claude', tipe: 'claude' },
  { id: 'c-004', t: 'verbal', judul: 'Analogi: ubah jadi kalimat',
    inti: 'Ubah pasangan kata pertama menjadi satu kalimat hubungan, lalu pakai kalimat yang sama untuk pasangan kedua.',
    contoh: 'Dokter : Stetoskop berarti profesi dan alat kerjanya.', catatan: 'Kalau dua pilihan sama-sama cocok, perketat kalimat hubungannya.', sumber: 'Claude', tipe: 'claude' },
  { id: 'c-005', t: 'layanan', judul: 'Pola jawaban TKP pelayanan',
    inti: 'Nilai tinggi biasanya untuk pilihan yang ramah, sesuai aturan, dan membantu sampai tuntas. Nilai rendah untuk menolak, mengabaikan, menyalahkan, atau melempar ke orang lain.',
    contoh: '', catatan: 'Tidak selalu berlaku bila semua pilihan mirip. Bandingkan mana yang paling lengkap.', sumber: 'Claude', tipe: 'claude' },
  { id: 'c-006', t: '', judul: 'Atur waktu SKD',
    inti: 'Rata-rata waktunya sekitar 55 detik per soal (100 menit untuk 110 soal). Kerjakan yang pasti dulu, tandai ragu-ragu, lalu kembali di akhir.',
    contoh: '', catatan: 'Soal hitungan panjang sebaiknya dilewati dulu.', sumber: 'Claude', tipe: 'claude' }
];
})();
