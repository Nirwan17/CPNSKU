(function () {
'use strict';
var A = window.App, kv = A.kv, esc = A.esc, D = A.data;
var ALFA = ['A', 'B', 'C', 'D', 'E'];
var LVN = ['semua', 'mudah', 'sedang', 'sulit'];
var ALASAN = ['Tidak paham konsep', 'Salah hitung', 'Terburu-buru', 'Salah baca', 'Menebak'];
var timerId = null;

var css = document.createElement('style');
css.textContent =
  '.row{flex-wrap:wrap}.row[data-x]{cursor:pointer}ul{padding-left:1.2rem;margin:.25rem 0 .75rem}' +
  '.tag{display:block;color:var(--muted);font-size:.8rem}.btn:disabled{opacity:.4}.btn.sm{padding:.4rem .8rem;font-size:.85rem}' +
  '.opt{display:flex;gap:.6rem;width:100%;text-align:left;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:.7rem;margin:.4rem 0;align-items:flex-start}' +
  '.opt b{min-width:1.2rem;color:var(--muted)}.opt span{flex:1}.opt i{font-style:normal;color:var(--muted);font-size:.85rem}' +
  '.opt.sel{border-color:var(--blue)}.opt.ok{border-color:#22c55e;background:rgba(34,197,94,.12)}.opt.no{border-color:var(--red);background:rgba(220,38,38,.12)}' +
  '.chip{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:.3rem .7rem;margin:.3rem .3rem 0 0;background:none;color:var(--fg);font-size:.85rem}.chip.on{background:var(--blue);border-color:var(--blue)}' +
  '.sheet{max-height:85vh;overflow-y:auto}';
document.head.appendChild(css);

/* ---------- Pembantu ---------- */
function SO() { var m = {}; D.soal.forEach(function (q) { m[q.id] = q; }); return m; }
function subOf(t) { return D.subtes.filter(function (s) { return s.topik.some(function (x) { return x.id === t; }); })[0]; }
function topikNama(t) {
  var s = subOf(t);
  return s ? s.topik.filter(function (x) { return x.id === t; })[0].nama : t;
}
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function getSet() { return Object.assign({ mode: 'belajar', n: 10, lv: 0, timer: false }, kv.get('lat:set', {})); }
function skorSoal(q, i) { return q.s ? q.s[i] : (i === q.k ? 1 : 0); }
function isBad(q, sk) { return q.s ? sk < 4 : sk === 0; }
function isiHtml(a) {
  var h = '', ul = false;
  a.forEach(function (l) {
    var li = l.indexOf('- ') === 0;
    if (li && !ul) { h += '<ul>'; ul = true; }
    if (!li && ul) { h += '</ul>'; ul = false; }
    h += li ? '<li>' + esc(l.slice(2)) + '</li>' : '<p>' + esc(l) + '</p>';
  });
  return h + (ul ? '</ul>' : '');
}
function seg(key, val, opts) {
  return '<div class="seg">' + opts.map(function (o) {
    return '<button data-x="ls:' + key + ':' + o[0] + '"' + (String(val) === String(o[0]) ? ' class="on"' : '') + '>' + o[1] + '</button>';
  }).join('') + '</div>';
}

/* ---------- Materi ---------- */
A.tabViews.materi = function () {
  var read = kv.get('read', {}), h = '';
  D.subtes.forEach(function (s) {
    h += '<div class="card"><h2>' + esc(s.nama) + '</h2><div class="muted">' + esc(s.penuh) + '</div>';
    D.bab.filter(function (b) { return b.sub === s.id; }).forEach(function (b) {
      h += '<div class="row" data-x="bab:' + b.id + '"><span>' + esc(b.judul) +
        (b.pemula ? '<span class="tag">Disarankan mulai dari sini</span>' : '') +
        (b.cek ? '<span class="tag">Cek sumber resmi</span>' : '') +
        '</span><span class="muted">' + (read[b.id] ? 'sudah dibaca' : '') + '</span></div>';
    });
    h += '</div>';
  });
  return { title: 'Materi', html: h };
};
A.screens.bab = function (id) {
  var b = D.bab.filter(function (x) { return x.id === id; })[0], read = kv.get('read', {});
  var h = '<div class="card"><h2>' + esc(b.judul) + '</h2>' + (b.cek ? '<div class="tag" style="margin-bottom:.6rem">Cek sumber resmi untuk bagian yang berkaitan dengan regulasi.</div>' : '') + isiHtml(b.isi) + '</div>' +
    '<div class="acts"><button class="btn" data-x="lat:' + b.topik + '">Latihan bab ini</button>' +
    '<button class="btn ghost" data-x="trik">Trik untuk bab ini</button></div>' +
    '<div class="acts" style="margin-top:.75rem"><button class="btn ghost" data-x="read:' + id + '">' +
    (read[id] ? 'Batalkan tanda sudah dibaca' : 'Tandai sudah dibaca') + '</button></div>';
  return { title: subOf(b.topik).nama, html: h };
};

/* ---------- Latihan: beranda ---------- */
A.tabViews.latihan = function () {
  var s = getSet(), S = kv.get('sesi', null), h = '';
  function n(f) { return D.soal.filter(f).length; }
  if (S && !S.done) {
    h += '<div class="card"><h2>Lanjutkan sesi</h2><p class="muted">' + esc(S.label) + ', soal ' + (S.i + 1) + ' dari ' + S.ids.length +
      '</p><button class="btn" data-x="go:lanjut">Lanjut</button></div>';
  }
  h += '<div class="card"><h2>Pengaturan sesi</h2>' +
    '<div class="row"><span>Mode</span>' + seg('mode', s.mode, [['belajar', 'Belajar'], ['uji', 'Uji']]) + '</div>' +
    '<div class="row"><span>Jumlah soal</span>' + seg('n', s.n, [[10, '10'], [20, '20'], [30, '30']]) + '</div>' +
    '<div class="row"><span>Tingkat</span>' + seg('lv', s.lv, [[0, 'Semua'], [1, 'Mudah'], [2, 'Sedang'], [3, 'Sulit']]) + '</div>' +
    '<div class="row"><span>Timer</span>' + seg('timer', s.timer, [[false, 'Mati'], [true, 'Hidup']]) + '</div></div>';
  h += '<div class="card"><h2>Mulai latihan</h2><div class="row" data-x="go:all"><span>Campur semua subtes</span><span class="muted">' + D.soal.length + ' soal</span></div></div>';
  D.subtes.forEach(function (sb) {
    var ids = {};
    sb.topik.forEach(function (t) { ids[t.id] = 1; });
    h += '<div class="card"><h2>' + esc(sb.nama) + '</h2><div class="row" data-x="go:sub:' + sb.id + '"><span>Campur ' + esc(sb.nama) +
      '</span><span class="muted">' + n(function (q) { return ids[q.t]; }) + ' soal</span></div>';
    sb.topik.forEach(function (t) {
      h += '<div class="row" data-x="go:topik:' + t.id + '"><span>' + esc(t.nama) + '</span><span class="muted">' + n(function (q) { return q.t === t.id; }) + ' soal</span></div>';
    });
    h += '</div>';
  });
  h += '<div class="card">' +
    '<div class="row" data-x="go:flag"><span>Soal ditandai</span><span class="muted">' + Object.keys(kv.get('flag', {})).length + ' soal</span></div>' +
    '<div class="row" data-x="soon:Latihan Buku Kesalahan hadir di tahap 1c"><span>Buku Kesalahan</span><span class="muted">' + kv.get('salah', []).length + ' soal tersimpan</span></div>' +
    '<div class="row" data-x="soon:Soal dari materimu hadir di tahap 3"><span>Dari materiku</span><span class="muted">segera</span></div></div>';
  return { title: 'Latihan', html: h };
};

/* ---------- Sesi ---------- */
function labelOf(kind, arg) {
  if (kind === 'sub') return 'Campur ' + subOf(D.subtes.filter(function (s) { return s.id === arg; })[0].topik[0].id).nama;
  if (kind === 'topik') return topikNama(arg);
  return kind === 'flag' ? 'Soal ditandai' : 'Campur semua subtes';
}
function setResume(S) {
  kv.set('resume', S && !S.done ? { label: 'Latihan ' + S.label + ', soal ' + (S.i + 1) + ' dari ' + S.ids.length, tab: 'latihan' } : null);
}
function mulai(kind, arg) {
  var s = getSet(), flag = kv.get('flag', {});
  var pool = D.soal.filter(function (q) {
    if (kind === 'sub' && subOf(q.t).id !== arg) return false;
    if (kind === 'topik' && q.t !== arg) return false;
    if (kind === 'flag' && !flag[q.id]) return false;
    return !s.lv || q.lv === s.lv;
  });
  if (!pool.length) { A.toast('Belum ada soal untuk pilihan ini'); return; }
  var ids = shuffle(pool).slice(0, s.n).map(function (q) { return q.id; });
  var S = { kind: kind, arg: arg, label: labelOf(kind, arg), mode: s.mode, timer: s.timer, ids: ids, i: 0, jw: {}, mulai: Date.now(), done: false };
  kv.set('sesi', S); setResume(S); A.push('sesi');
}
function catat(q, i) {
  var st = kv.get('stat', {}), t = st[q.t] || { n: 0, p: 0 }, sk = skorSoal(q, i);
  t.n++; t.p += sk / (q.s ? 5 : 1); st[q.t] = t; kv.set('stat', st);
  A.logActivity(1);
  if (isBad(q, sk)) {
    var sl = kv.get('salah', []).filter(function (x) { return x.id !== q.id; });
    sl.push({ id: q.id, ts: Date.now(), alasan: '' }); kv.set('salah', sl);
  }
}
function weak() {
  var st = kv.get('stat', {}), a = [];
  Object.keys(st).forEach(function (t) {
    var r = st[t].p / st[t].n;
    if (st[t].n >= 3 && r < 0.85) a.push({ name: topikNama(t), tab: 'latihan', r: r });
  });
  a.sort(function (x, y) { return x.r - y.r; });
  kv.set('weak', a.slice(0, 3));
}
function jawab(S, q, i) {
  var belajar = S.mode === 'belajar';
  if (belajar && S.jw[q.id] !== undefined) return;
  S.jw[q.id] = i; kv.set('sesi', S);
  if (belajar) { catat(q, i); weak(); }
  A.render(true);
}
function lanjut(S, q) {
  if (S.mode === 'belajar' && S.jw[q.id] === undefined) return;
  if (S.i < S.ids.length - 1) { S.i++; kv.set('sesi', S); setResume(S); A.render(); return; }
  var m = SO();
  if (S.mode === 'uji') S.ids.forEach(function (id) { if (S.jw[id] !== undefined) catat(m[id], S.jw[id]); });
  S.done = true; S.selesai = Date.now(); kv.set('sesi', S); setResume(S); weak(); A.render();
}

A.screens.sesi = function () {
  var S = kv.get('sesi', null);
  if (!S) return { title: 'Latihan', html: '<div class="empty">Tidak ada sesi aktif.</div>' };
  return S.done ? hasilView(S) : soalView(S);
};

function soalView(S) {
  var q = SO()[S.ids[S.i]], jw = S.jw[q.id], tkp = !!q.s, belajar = S.mode === 'belajar';
  var locked = belajar && jw !== undefined, flagged = !!kv.get('flag', {})[q.id], last = S.i === S.ids.length - 1;
  var h = '<div class="card"><div class="muted">' + esc(topikNama(q.t)) + ', tingkat ' + LVN[q.lv] +
    (S.timer ? '. Waktu <span id="tm">0:00</span>' : '') + '</div><p style="margin-top:.5rem">' + esc(q.q) + '</p>';
  q.o.forEach(function (o, i) {
    var c = 'opt', badge = '';
    if (locked && tkp) { badge = ' <i>nilai ' + q.s[i] + '</i>'; if (q.s[i] === 5) c += ' ok'; else if (i === jw) c += ' sel'; }
    else if (locked) { if (i === q.k) c += ' ok'; else if (i === jw) c += ' no'; }
    else if (i === jw) c += ' sel';
    h += '<button class="' + c + '" data-x="jw:' + i + '"><b>' + ALFA[i] + '</b><span>' + esc(o) + badge + '</span></button>';
  });
  h += '</div>';
  if (locked) {
    h += '<div class="card"><h2>Pembahasan</h2><p>' + esc(q.b) + '</p>';
    if (isBad(q, skorSoal(q, jw))) {
      var sl = kv.get('salah', []).filter(function (x) { return x.id === q.id; })[0] || {};
      h += '<div class="muted">Kenapa kurang tepat?</div>' + ALASAN.map(function (a, i) {
        return '<button class="chip' + (sl.alasan === a ? ' on' : '') + '" data-x="alasan:' + i + '">' + a + '</button>';
      }).join('');
    }
    h += '</div>';
  }
  h += '<div class="acts"><button class="btn ghost sm" data-x="flag">' + (flagged ? 'Batal tandai' : 'Tandai') + '</button>' +
    '<button class="btn ghost sm" data-x="note">Catatan</button><button class="btn ghost sm" data-x="trik">Trik topik ini</button>' +
    '<button class="btn ghost sm" data-x="lapor">Laporkan soal</button></div>' +
    '<div class="acts" style="margin-top:1rem"><button class="btn" data-x="next"' + (belajar && jw === undefined ? ' disabled' : '') + '>' +
    (last ? 'Selesai' : 'Berikutnya') + '</button></div>';
  return {
    title: 'Soal ' + (S.i + 1) + ' dari ' + S.ids.length, html: h,
    onBack: function () {
      A.confirmBox('Keluar dari sesi?', 'Progresmu tersimpan. Kamu bisa melanjutkannya dari Beranda atau tab Latihan.', 'Keluar', false, function () { A.goTab('latihan'); });
      return true;
    },
    bind: function () {
      clearInterval(timerId);
      if (!S.timer) return;
      var tick = function () {
        var el = document.getElementById('tm');
        if (!el) { clearInterval(timerId); return; }
        var t = Math.floor((Date.now() - S.mulai) / 1000);
        el.textContent = Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
      };
      tick(); timerId = setInterval(tick, 1000);
    }
  };
}

function hasilView(S) {
  var m = SO(), ok = 0, tot = 0, tp = 0, tm = 0, rows = '';
  S.ids.forEach(function (id, n) {
    var q = m[id], jw = S.jw[id], sk = jw === undefined ? 0 : skorSoal(q, jw), lab;
    if (q.s) { tp += sk; tm += 5; lab = jw === undefined ? 'Kosong' : 'Nilai ' + sk + ' dari 5'; }
    else { tot++; if (sk) ok++; lab = jw === undefined ? 'Kosong' : (sk ? 'Benar' : 'Salah'); }
    rows += '<div class="row" data-x="rev:' + id + '"><span>' + (n + 1) + '. ' + esc(topikNama(q.t)) + '</span><span class="muted">' + lab + '</span></div>';
  });
  var dur = Math.max(1, Math.round(((S.selesai || Date.now()) - S.mulai) / 60000));
  var h = '<div class="card"><h2>Hasil sesi</h2>';
  if (tot) h += '<div><span class="big">' + ok + '</span> dari ' + tot + ' soal benar</div>';
  if (tm) h += '<div>Nilai TKP: <b>' + tp + '</b> dari ' + tm + '</div>';
  h += '<div class="muted">Waktu ' + dur + ' menit</div></div><div class="card"><h2>Tiap soal</h2>' + rows +
    '</div><button class="btn" data-x="fin">Selesai</button>';
  return { title: 'Hasil', html: h };
}

function review(id) {
  var S = kv.get('sesi', null), q = SO()[id], jw = S ? S.jw[id] : undefined;
  var ans = jw === undefined ? 'Kosong' : ALFA[jw] + '. ' + q.o[jw] + (q.s ? ' (nilai ' + q.s[jw] + ')' : '');
  var key = q.s ? 'Nilai tertinggi: ' + ALFA[q.s.indexOf(5)] + '. ' + q.o[q.s.indexOf(5)] : 'Kunci: ' + ALFA[q.k] + '. ' + q.o[q.k];
  A.openModal('<h2>' + esc(q.q) + '</h2><p>Jawabanmu: ' + esc(ans) + '</p><p>' + esc(key) + '</p><p class="muted">' + esc(q.b) +
    '</p><div class="acts"><button class="btn" data-m="x">Tutup</button></div>',
    function (el) { el.querySelector('[data-m]').addEventListener('click', A.closeModal); });
}
function noteModal(q) {
  A.openModal('<h2>Catatan untuk soal ini</h2><textarea id="nt" rows="4" style="width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:.6rem;font:inherit">' +
    esc(kv.get('note:' + q.id, '')) + '</textarea><div class="acts"><button class="btn ghost" data-m="x">Batal</button><button class="btn" data-m="ok">Simpan</button></div>',
    function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        if (b.getAttribute('data-m') === 'ok') { kv.set('note:' + q.id, el.querySelector('#nt').value); A.toast('Catatan tersimpan'); }
        A.closeModal();
      });
    });
}

/* ---------- Event ---------- */
document.getElementById('view').addEventListener('click', function (e) {
  var el = e.target.closest('[data-x]');
  if (!el) return;
  var p = el.getAttribute('data-x').split(':'), a = p[0], S = kv.get('sesi', null);
  var q = S && !S.done ? SO()[S.ids[S.i]] : null;
  if (a === 'bab') A.push('bab', p[1]);
  else if (a === 'read') { var r = kv.get('read', {}); if (r[p[1]]) delete r[p[1]]; else r[p[1]] = true; kv.set('read', r); A.render(true); }
  else if (a === 'trik') A.toast('Menu Trik hadir di tahap 1d');
  else if (a === 'lat') { A.goTab('latihan'); mulai('topik', p[1]); }
  else if (a === 'ls') {
    var s = getSet();
    s[p[1]] = p[1] === 'mode' ? p[2] : (p[1] === 'timer' ? p[2] === 'true' : parseInt(p[2], 10));
    kv.set('lat:set', s); A.render(true);
  }
  else if (a === 'go') { if (p[1] === 'lanjut') A.push('sesi'); else mulai(p[1], p[2]); }
  else if (a === 'soon') A.toast(p.slice(1).join(':'));
  else if (a === 'jw' && q) jawab(S, q, parseInt(p[1], 10));
  else if (a === 'next' && q) lanjut(S, q);
  else if (a === 'flag' && q) { var f = kv.get('flag', {}); if (f[q.id]) delete f[q.id]; else f[q.id] = true; kv.set('flag', f); A.render(true); }
  else if (a === 'note' && q) noteModal(q);
  else if (a === 'lapor' && q) {
    A.confirmBox('Laporkan soal ini?', 'Soal ditandai untuk diperiksa ulang.', 'Laporkan', false, function () {
      var l = kv.get('lapor', []); l.push({ id: q.id, ts: Date.now() }); kv.set('lapor', l); A.toast('Soal dilaporkan');
    });
  }
  else if (a === 'alasan' && q) {
    var sl = kv.get('salah', []);
    sl.forEach(function (x) { if (x.id === q.id) x.alasan = ALASAN[parseInt(p[1], 10)]; });
    kv.set('salah', sl); A.render(true);
  }
  else if (a === 'rev') review(p[1]);
  else if (a === 'fin') { kv.set('sesi', null); setResume(null); A.goTab('latihan'); }
});
})();
