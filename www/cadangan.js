(function () {
'use strict';
var A = window.App, kv = A.kv, esc = A.esc, D = A.data, B = A.belajar;
function plug() { return (window.Capacitor && window.Capacitor.Plugins) || {}; }

/* Soal hasil impor digabung ke bank saat aplikasi siap */
A.onReady.push(function () { kv.get('soalx', []).forEach(function (q) { D.soal.push(q); }); });

function bagikan(nama, teks, judul) {
  var pl = plug();
  if (pl.Filesystem && pl.Share) {
    return pl.Filesystem.writeFile({ path: nama, data: teks, directory: 'CACHE', encoding: 'utf8' })
      .then(function (r) { return pl.Share.share({ title: judul, url: r.uri, dialogTitle: judul }); })
      .catch(function (e) { if (!/cancel/i.test(String(e && e.message))) A.toast('Gagal membagikan berkas'); });
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([teks], { type: 'application/json' })); a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
  return Promise.resolve();
}
function pilih(cb) {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json,text/plain'; inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = function () {
    var f = inp.files[0];
    inp.remove();
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { cb(String(r.result)); };
    r.readAsText(f);
  };
  inp.click();
}

/* ---------- Backup dan restore ---------- */
function backup() {
  var d = kv.all(); delete d.to;
  bagikan('cpnsku-backup-' + A.today() + '.json', JSON.stringify({ app: 'cpnsku', versi: 1, waktu: new Date().toISOString(), data: d }), 'Backup CPNSku');
}
function restore() {
  pilih(function (t) {
    var o; try { o = JSON.parse(t); } catch (e) { o = null; }
    if (!o || o.app !== 'cpnsku' || !o.data) { A.toast('Berkas bukan backup CPNSku'); return; }
    A.confirmBox('Restore backup?', 'Data sekarang akan diganti isi backup (' + Object.keys(o.data).length + ' item).', 'Restore', true, function () {
      kv.load(o.data).then(function () { location.reload(); });
    });
  });
}

/* ---------- Impor dan ekspor soal dan trik ---------- */
function cek(q, topik) {
  if (!q || typeof q !== 'object') return 'bukan objek soal';
  if (!topik[q.t]) return 'topik “' + q.t + '” tidak dikenal';
  if (!q.q || !q.b) return 'pertanyaan atau pembahasan kosong';
  if (!Array.isArray(q.o) || q.o.length !== 5 || q.o.some(function (x) { return !x; })) return 'harus ada 5 pilihan';
  if ((B.subOf(q.t).id === 'tkp') !== !!q.s) return 'format tidak cocok dengan subtes (TKP memakai s, TWK dan TIU memakai k)';
  if (q.s) {
    if (!Array.isArray(q.s) || q.s.length !== 5 || q.s.some(function (x) { return !(x >= 1 && x <= 5); }) || q.s.filter(function (x) { return x === 5; }).length !== 1) {
      return 'nilai TKP harus 5 angka (1 sampai 5) dan tepat satu bernilai 5';
    }
  } else if (!(q.k >= 0 && q.k <= 4)) return 'kunci k harus 0 sampai 4';
  return '';
}
function gabung(o) {
  var topik = {}, ids = {}, tids = {}, r = { ok: 0, okT: 0, dup: 0, tolak: [] }, sx = kv.get('soalx', []), tk = kv.get('trik', []);
  D.subtes.forEach(function (s) { s.topik.forEach(function (t) { topik[t.id] = 1; }); });
  D.soal.forEach(function (q) { ids[q.id] = 1; });
  D.trik.concat(tk).forEach(function (x) { tids[x.id] = 1; });
  (o.soal || []).forEach(function (q, i) {
    var e = cek(q, topik);
    if (e) { r.tolak.push('Soal ' + (i + 1) + ': ' + e); return; }
    var id = q.id || 'x-' + Date.now().toString(36) + '-' + i;
    if (ids[id]) { r.dup++; return; }
    ids[id] = 1;
    var c = { id: id, t: q.t, lv: Math.min(3, Math.max(1, parseInt(q.lv, 10) || 1)), q: q.q, o: q.o, b: q.b };
    if (q.s) c.s = q.s; else c.k = q.k;
    sx.push(c); D.soal.push(c); r.ok++;
  });
  (o.trik || []).forEach(function (x, i) {
    if (!x || !x.judul || !x.inti) { r.tolak.push('Trik ' + (i + 1) + ': judul dan inti wajib ada'); return; }
    if (x.t && !topik[x.t]) { r.tolak.push('Trik ' + (i + 1) + ': topik tidak dikenal'); return; }
    var id = x.id || 'u-' + Date.now().toString(36) + '-' + i;
    if (tids[id]) { r.dup++; return; }
    tids[id] = 1;
    tk.push({ id: id, t: x.t || '', judul: x.judul, inti: x.inti, contoh: x.contoh || '', catatan: x.catatan || '', sumber: x.sumber || 'Impor', tipe: 'user' });
    r.okT++;
  });
  kv.set('soalx', sx); kv.set('trik', tk);
  return r;
}
function impor() {
  pilih(function (t) {
    var o; try { o = JSON.parse(t); } catch (e) { A.toast('Berkas bukan JSON yang valid'); return; }
    if (Array.isArray(o)) o = { soal: o };
    var r = gabung(o || {});
    A.openModal('<h2>Hasil impor</h2><p>Soal masuk: <b>' + r.ok + '</b>. Trik masuk: <b>' + r.okT + '</b>.' +
      (r.dup ? ' Dilewati karena sudah ada: ' + r.dup + '.' : '') + '</p>' +
      (r.tolak.length ? '<p class="muted">Ditolak ' + r.tolak.length + ':<br>' + r.tolak.slice(0, 6).map(esc).join('<br>') + '</p>' : '') +
      '<div class="acts"><button class="btn" data-m="x">Tutup</button></div>',
      function (el) { el.querySelector('[data-m]').addEventListener('click', A.closeModal); });
  });
}
function ekspor() {
  var s = kv.get('soalx', []), t = kv.get('trik', []);
  if (!s.length && !t.length) { A.toast('Belum ada soal atau trik tambahan'); return; }
  bagikan('cpnsku-soal-trik-' + A.today() + '.json', JSON.stringify({ soal: s, trik: t }, null, 1), 'Soal dan trik CPNSku');
}
function promptAI() {
  var ids = D.subtes.map(function (s) { return s.nama + ': ' + s.topik.map(function (t) { return t.id + ' (' + t.nama + ')'; }).join(', '); }).join('; ');
  var teks = [
    'Kamu membuat soal latihan SKD CPNS. Buat [JUMLAH] soal orisinal dari materi di bawah, dengan tingkat kesulitan campuran.',
    'Keluarkan HANYA JSON array yang valid, tanpa teks lain dan tanpa blok kode.',
    'Setiap soal punya tepat 5 pilihan. Format per subtes:',
    '- TWK dan TIU: {"t":"<id topik>","lv":1,"q":"pertanyaan","o":["A","B","C","D","E"],"k":0,"b":"pembahasan yang menjelaskan jawaban benar dan alasan pilihan lain salah"}. k adalah nomor pilihan yang benar, dimulai dari 0.',
    '- TKP: {"t":"<id topik>","lv":1,"q":"situasi","o":["A","B","C","D","E"],"s":[1,3,5,4,2],"b":"pembahasan"}. s berisi nilai tiap pilihan (1 sampai 5), dan tepat satu pilihan bernilai 5.',
    'lv: 1 mudah, 2 sedang, 3 sulit.',
    'Id topik yang boleh dipakai: ' + ids + '.',
    'Materi:',
    '[TEMPEL MATERI DI SINI]'
  ].join('\n');
  A.openModal('<h2>Prompt untuk AI</h2><p class="muted">Salin, ganti bagian dalam kurung siku, kirim ke AI pilihanmu, lalu simpan jawabannya sebagai berkas .json dan impor. Periksa hasilnya, terutama kunci dan nilai TKP.</p>' +
    '<textarea id="pr" class="in" rows="9" readonly>' + esc(teks) + '</textarea>' +
    '<div class="acts"><button class="btn ghost" data-m="x">Tutup</button><button class="btn" data-m="salin">Salin</button></div>',
    function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        if (b.getAttribute('data-m') === 'salin') {
          var ta = el.querySelector('#pr');
          try { navigator.clipboard.writeText(teks).then(function () { A.toast('Prompt disalin'); }, function () { ta.select(); A.toast('Blok teks lalu salin manual'); }); }
          catch (er) { ta.select(); A.toast('Blok teks lalu salin manual'); }
        } else A.closeModal();
      });
    });
}

document.getElementById('view').addEventListener('click', function (e) {
  var el = e.target.closest('[data-z]');
  if (!el) return;
  var a = el.getAttribute('data-z');
  if (a === 'backup') backup(); else if (a === 'restore') restore(); else if (a === 'impor') impor();
  else if (a === 'ekspor') ekspor(); else if (a === 'prompt') promptAI();
});

A.cadangan = { gabung: gabung, cek: cek };
})();
