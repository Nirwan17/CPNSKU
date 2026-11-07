(function () {
var A = window.App;
A.data = A.data || {};
A.data.subtes = [
  { id: 'twk', nama: 'TWK', penuh: 'Tes Wawasan Kebangsaan',
    topik: [{ id: 'pancasila', nama: 'Pancasila' }, { id: 'bela', nama: 'Nasionalisme dan bela negara' }] },
  { id: 'tiu', nama: 'TIU', penuh: 'Tes Intelegensia Umum',
    topik: [{ id: 'numerik', nama: 'Numerik' }, { id: 'verbal', nama: 'Verbal' }] },
  { id: 'tkp', nama: 'TKP', penuh: 'Tes Karakteristik Pribadi',
    topik: [{ id: 'layanan', nama: 'Pelayanan publik' }, { id: 'profesi', nama: 'Profesionalisme' }] }
];
A.data.bab = [
  { id: 'twk-pancasila', sub: 'twk', topik: 'pancasila', pemula: true, judul: 'Pancasila: lima sila dan nilainya', isi: [
    'Pancasila adalah dasar negara Indonesia. Rumusannya ada di alinea keempat Pembukaan UUD 1945.',
    'Lima sila, lambangnya pada Garuda Pancasila, dan nilai intinya:',
    '- Sila 1, Ketuhanan Yang Maha Esa. Lambang bintang. Nilai: toleransi, saling menghormati antarumat beragama, tidak memaksakan keyakinan.',
    '- Sila 2, Kemanusiaan yang Adil dan Beradab. Lambang rantai. Nilai: menghargai martabat manusia, tidak semena-mena, solidaritas.',
    '- Sila 3, Persatuan Indonesia. Lambang pohon beringin. Nilai: cinta tanah air, mengutamakan kepentingan bangsa di atas golongan.',
    '- Sila 4, Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan. Lambang kepala banteng. Nilai: musyawarah untuk mufakat, menghormati keputusan bersama.',
    '- Sila 5, Keadilan Sosial bagi Seluruh Rakyat Indonesia. Lambang padi dan kapas. Nilai: keadilan, gotong royong, tidak merugikan orang lain.',
    'Cara cepat mengenali soal: cari kata kunci perilaku, lalu cocokkan dengan nilai silanya.'
  ] },
  { id: 'twk-bela', sub: 'twk', topik: 'bela', cek: true, judul: 'Nasionalisme dan bela negara', isi: [
    'Nasionalisme adalah rasa cinta dan bangga terhadap bangsa dan negara, yang diwujudkan dengan menjaga persatuan dan kepentingan bersama.',
    'Bela negara adalah hak sekaligus kewajiban setiap warga negara. Dasarnya Pasal 27 ayat (3) UUD 1945: setiap warga negara berhak dan wajib ikut serta dalam upaya pembelaan negara.',
    'Lima nilai dasar bela negara:',
    '- Cinta tanah air',
    '- Kesadaran berbangsa dan bernegara',
    '- Keyakinan pada Pancasila sebagai ideologi negara',
    '- Rela berkorban untuk bangsa dan negara',
    '- Kemampuan awal bela negara',
    'Bela negara tidak hanya militer. Disiplin, jujur, dan bekerja dengan baik sebagai warga atau pegawai juga bentuk bela negara.'
  ] },
  { id: 'tiu-numerik', sub: 'tiu', topik: 'numerik', pemula: true, judul: 'Hitung dasar: persen, perbandingan, deret', isi: [
    'Soal numerik menguji ketepatan dan kecepatan berhitung. Kuasai tiga hal ini dulu:',
    '- Persen: 15% dari 200.000 sama dengan 15 ÷ 100 × 200.000. Diskon 15% berarti membayar 85%.',
    '- Perbandingan: jumlahkan semua bagian, bagi total dengan jumlah bagian, lalu kalikan. Contoh 2 : 3 dengan total 45: tiap bagian 9, jadi 18 dan 27.',
    '- Deret: cek selisih antarangka (aritmetika), cek pengali (geometri), lalu cek pola selang-seling bila dua cara tadi tidak cocok.',
    'Biasakan menulis selisih di antara angka sebelum menebak pola.'
  ] },
  { id: 'tiu-verbal', sub: 'tiu', topik: 'verbal', judul: 'Verbal: sinonim, antonim, analogi', isi: [
    'Soal verbal mencakup sinonim, antonim, dan analogi.',
    '- Sinonim adalah persamaan arti, antonim adalah lawan arti. Baca semua pilihan sebelum menjawab.',
    '- Analogi: jelaskan hubungan pasangan kata pertama dengan satu kalimat pendek, lalu terapkan ke pasangan kedua.',
    'Hubungan yang sering muncul: profesi dan alat, bagian dan keseluruhan, sebab dan akibat, jenis dan kategori.',
    'Contoh: Tukang kayu : Gergaji. Hubungannya profesi dan alat kerjanya, jadi Penjahit : Jarum.'
  ] },
  { id: 'tkp-layanan', sub: 'tkp', topik: 'layanan', pemula: true, judul: 'Pelayanan publik', isi: [
    'TKP tidak punya satu jawaban benar. Setiap pilihan bernilai 1 sampai 5, dan nilai tertinggi untuk sikap yang paling tepat sebagai pegawai pelayanan publik.',
    'Ciri jawaban bernilai tinggi:',
    '- Ramah dan sabar, mendengarkan lebih dulu.',
    '- Sesuai prosedur, tanpa jalan pintas yang melanggar aturan.',
    '- Membantu sampai tuntas, atau mengarahkan dengan jelas bila bukan wewenangmu.',
    '- Adil, tidak membeda-bedakan pelayanan.',
    'Hindari pilihan yang menolak, mengabaikan, menyalahkan orang lain, atau menyuruh orang lain mengurusnya.'
  ] },
  { id: 'tkp-profesi', sub: 'tkp', topik: 'profesi', judul: 'Profesionalisme', isi: [
    'Pada soal profesionalisme, nilai tinggi biasanya untuk sikap yang bertanggung jawab, berintegritas, dan berkoordinasi.',
    '- Utamakan tugas dan tenggat, atur prioritas dengan berkomunikasi kepada atasan.',
    '- Akui kesalahan sendiri, segera perbaiki, dan laporkan.',
    '- Taat aturan walau ada ajakan dari rekan.',
    '- Mau belajar dan bekerja sama, bukan menghindar atau menyalahkan.',
    'Waspadai pilihan yang tampak baik hati tetapi melanggar aturan, seperti menitip absen.'
  ] }
];
})();
