(function () {
'use strict';
var A = window.App, kv = A.kv, esc = A.esc, D = A.data, B = A.belajar;
var SUBS = ['twk', 'tiu', 'tkp'];
var FULL = { twk: 30, tiu: 35, tkp: 45 }, MINI = { twk: 7, tiu: 8, tkp: 10 };
var PER_SOAL = 100 * 60000 / 110;
var SARAN = {
  'Tidak paham konsep': 'Ulangi materinya dulu sebelum latihan lagi.',
  'Salah hitung': 'Tulis langkah hitung dan cek ulang hasil sebelum memilih.',
  'Terburu-buru': 'Pakai waktu penuh per soal dan baca pertanyaan sampai akhir.',
  'Salah baca': 'Garis bawahi kata kunci seperti “kecuali” dan “bukan”.',
  'Menebak': 'Pelajari konsepnya. Tandai ragu-ragu supaya soal itu ditinjau lagi.'
};
var timerId = null, wl = null, aktif = false;

var css = document.createElement('style');
css.textContent = '.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem;margin:.75rem 0}' +
  '.g{padding:.55rem 0;border-radius:8px;border:1px solid var(--line);background:none;color:var(--fg)}' +
  '.g.a{background:var(--blue);border-color:var(--blue);color:#fff}.g.r{border-color:#f59e0b;box-shadow:inset 0 0 0 2px #f59e0b}.g.c{outline:2px solid var(--fg)}' +
  '.row[data-y]{cursor:pointer}';
document.head.appendChild(css);

/* ---------- Pembantu ---------- */
function subName(id) { return D.subtes.filter(function (s) { return s.id === id; })[0].nama; }
function avail() {
  var a = { twk: 0, tiu: 0, tkp: 0 };
  D.soal.forEach(function (q) { a[B.subOf(q.t).id]++; });
  return a;
}
function mm(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
function rencana(mode, sub, av) {
  var need = {}, out = {};
  if (mode === 'full') need = FULL; else if (mode === 'mini') need = MINI; else need[sub] = FULL[sub];
  SUBS.forEach(function (s) { if (need[s]) out[s] = Math.min(need[s], av[s]); });
  return out;
}
function total(o) { return SUBS.reduce(function (n, s) { return n + (o[s] || 0); }, 0); }
function wake(on) {
  try {
    if (on && navigator.wakeLock && !wl) {
      navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }, function () {});
    }
    if (!on && wl) { wl.release(); wl = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', function () { if (!document.hidden && aktif) wake(true); });

function pick(sub, n) {
  var seen = kv.get('tseen', {}), st = D.subtes.filter(function (s) { return s.id === sub; })[0];
  var pools = st.topik.map(function (t) {
    return B.shuffle(D.soal.filter(function (q) { return q.t === t.id; }))
      .sort(function (x, y) { return (seen[x.id] ? 1 : 0) - (seen[y.id] ? 1 : 0); });
  }), out = [], k = 0;
  while (out.length < n && pools.some(function (p) { return p.length; })) {
    var p = pools[k++ % pools.length];
    if (p.length) out.push(p.shift().id);
  }
  return B.shuffle(out);
}

/* ---------- Mulai dan selesai ---------- */
function mulaiTO(mode, sub) {
  var r = rencana(mode, sub, avail()), n = total(r), ids = [];
  if (!n) { A.toast('Belum ada soal untuk mode ini'); return; }
  SUBS.forEach(function (s) { if (r[s]) ids = ids.concat(pick(s, r[s])); });
  var label = mode === 'full' ? 'Simulasi penuh' : (mode === 'mini' ? 'Mini try out' : 'Per subtes ' + subName(sub)), now = Date.now();
  kv.set('to', { mode: mode, label: label, ids: ids, jw: {}, ragu: {}, tm: {}, cur: 0, qs: now, t0: now, dur: Math.round(n * PER_SOAL), done: false });
  kv.set('resume', { label: 'Try out: ' + label, tab: 'tryout' });
  A.push('to');
}
function finish(T) {
  if (T.done) return;
  var m = B.SO(), cq = T.ids[T.cur], r = { ts: Date.now(), mode: T.mode, label: T.label, sub: {}, rb: 0, ys: 0 };
  T.tm[cq] = (T.tm[cq] || 0) + Date.now() - T.qs;
  SUBS.forEach(function (s) { r.sub[s] = { n: 0, ok: 0, p: 0, mx: 0, ms: 0 }; });
  T.ids.forEach(function (id) {
    var q = m[id], o = r.sub[B.subOf(q.t).id], jw = T.jw[id];
    o.n++; o.mx += 5; o.ms += T.tm[id] || 0;
    if (jw === undefined) return;
    var sk = B.skorSoal(q, jw), bad = B.isBad(q, sk);
    o.p += q.s ? sk : sk * 5;
    if (!q.s && sk) o.ok++;
    if (T.ragu[id] && !bad) r.rb++;
    if (!T.ragu[id] && bad) r.ys++;
    B.catat(q, jw);
  });
  B.weak();
  var seen = kv.get('tseen', {});
  T.ids.forEach(function (id) { seen[id] = 1; });
  kv.set('tseen', Object.keys(seen).length >= D.soal.length ? {} : seen);
  var hist = kv.get('tohist', []); hist.push(r); kv.set('tohist', hist.slice(-30));
  if (T.mode === 'full') kv.set('tryout:last', { twk: r.sub.twk.p, tiu: r.sub.tiu.p, tkp: r.sub.tkp.p });
  T.done = true; T.selesai = Date.now(); T.res = r; kv.set('to', T); kv.set('resume', null);
}
function pindah(T, idx) {
  var id = T.ids[T.cur], n = Date.now();
  T.tm[id] = (T.tm[id] || 0) + n - T.qs; T.qs = n; T.cur = idx; kv.set('to', T); A.render();
}

/* ---------- Layar try out ---------- */
A.screens.to = function () {
  var T = kv.get('to', null);
  if (!T) return { title: 'Try Out', html: '<div class="empty">Tidak ada try out aktif.</div>' };
  if (!T.done && Date.now() >= T.t0 + T.dur) finish(T);
  return T.done ? hasil(T) : tampil(T);
};
function tampil(T) {
  var q = B.SO()[T.ids[T.cur]], jw = T.jw[q.id];
  var h = '<div class="card"><div class="row" style="padding:0"><span class="muted">Soal ' + (T.cur + 1) + ' dari ' + T.ids.length + ', ' + esc(B.topikNama(q.t)) +
    '</span><b id="tt" style="font-size:1.3rem;color:var(--blue)">--:--</b></div><p style="margin-top:.6rem">' + esc(q.q) + '</p>';
  q.o.forEach(function (o, i) {
    h += '<button class="opt' + (i === jw ? ' sel' : '') + '" data-y="ans:' + i + '"><b>' + B.ALFA[i] + '</b><span>' + esc(o) + '</span></button>';
  });
  h += '</div><div class="acts"><button class="btn ghost" data-y="prev"' + (T.cur === 0 ? ' disabled' : '') + '>Sebelumnya</button>' +
    '<button class="btn ghost" data-y="ragu">' + (T.ragu[q.id] ? 'Batal ragu' : 'Ragu-ragu') + '</button>' +
    '<button class="btn" data-y="next"' + (T.cur === T.ids.length - 1 ? ' disabled' : '') + '>Berikutnya</button></div>' +
    '<div class="acts" style="margin-top:.75rem"><button class="btn ghost" data-y="grid">Daftar soal</button><button class="btn danger" data-y="fin">Selesai</button></div>';
  return {
    title: T.label, html: h,
    onBack: function () {
      A.confirmBox('Keluar dari layar try out?', 'Waktu tetap berjalan. Kamu bisa kembali lewat tab Try Out selama waktunya belum habis.', 'Keluar', false, function () { A.goTab('tryout'); });
      return true;
    },
    bind: function () {
      clearInterval(timerId); aktif = true; wake(true);
      var tick = function () {
        var el = document.getElementById('tt');
        if (!el) { clearInterval(timerId); aktif = false; wake(false); return; }
        var left = T.t0 + T.dur - Date.now();
        if (left <= 0) { clearInterval(timerId); finish(T); A.toast('Waktu habis'); A.render(); return; }
        el.textContent = mm(left);
      };
      tick(); timerId = setInterval(tick, 1000);
    }
  };
}
function gridModal(T) {
  var h = '<h2>Daftar soal</h2><div class="muted">Biru sudah dijawab, oranye ragu-ragu.</div><div class="grid">';
  T.ids.forEach(function (id, i) {
    h += '<button class="g' + (T.jw[id] !== undefined ? ' a' : '') + (T.ragu[id] ? ' r' : '') + (i === T.cur ? ' c' : '') + '" data-g="' + i + '">' + (i + 1) + '</button>';
  });
  A.openModal(h + '</div><div class="acts"><button class="btn ghost" data-g="x">Tutup</button></div>', function (el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]');
      if (!b) return;
      A.closeModal();
      if (b.getAttribute('data-g') !== 'x') pindah(T, parseInt(b.getAttribute('data-g'), 10));
    });
  });
}
function hasil(T) {
  var r = T.res, m = B.SO(), pg = A.cfg().pg, tot = 0, mx = 0, tms = [];
  var h = '<div class="card"><h2>' + esc(T.label) + '</h2>';
  SUBS.forEach(function (s) {
    var o = r.sub[s];
    if (!o.n) return;
    tot += o.p; mx += o.mx; tms.push(subName(s) + ' ' + Math.max(1, Math.round(o.ms / 60000)) + ' mnt');
    var txt = s === 'tkp' ? 'nilai ' + o.p + ' dari ' + o.mx : o.ok + ' dari ' + o.n + ' benar, nilai ' + o.p;
    var bt = T.mode === 'full' ? ', batas ' + pg[s] + (o.p >= pg[s] ? ', lulus' : ', belum') : '';
    h += '<div class="row"><span>' + subName(s) + '</span><span><b>' + txt + '</b><span class="muted">' + bt + '</span></span></div>';
  });
  h += '<div class="row"><span>Total</span><b>' + tot + ' dari ' + mx + '</b></div>' +
    '<div class="muted">Waktu terpakai ' + Math.max(1, Math.round((T.selesai - T.t0) / 60000)) + ' menit (' + tms.join(', ') + ')</div></div>';
  h += '<div class="card"><h2>Kepastian jawaban</h2><p>Ragu-ragu tapi benar: <b>' + r.rb + '</b> soal. Yakin tapi salah: <b>' + r.ys +
    '</b> soal.</p><p class="muted">Yang kedua paling berbahaya karena menandakan pemahaman yang keliru. Soal yang salah sudah masuk Buku Kesalahan.</p></div>';
  var lama = T.ids.slice().sort(function (a, b) { return (T.tm[b] || 0) - (T.tm[a] || 0); }).slice(0, 3);
  h += '<div class="card"><h2>Soal paling lama dikerjakan</h2>';
  lama.forEach(function (id) {
    h += '<div class="row" data-y="rt:' + id + '"><span>' + esc(m[id].q.slice(0, 48)) + '...</span><span class="muted">' + Math.round((T.tm[id] || 0) / 1000) + ' dtk</span></div>';
  });
  h += '</div>';
  var tin = T.ids.filter(function (id) { var j = T.jw[id]; return j === undefined || B.isBad(m[id], B.skorSoal(m[id], j)); });
  h += '<div class="card"><h2>Perlu ditinjau (' + tin.length + ')</h2>';
  tin.slice(0, 40).forEach(function (id) {
    var j = T.jw[id];
    h += '<div class="row" data-y="rt:' + id + '"><span>' + esc(B.topikNama(m[id].t)) + ', ' + esc(m[id].q.slice(0, 36)) + '...</span><span class="muted">' + (j === undefined ? 'Kosong' : (m[id].s ? 'Nilai ' + m[id].s[j] : 'Salah')) + '</span></div>';
  });
  if (!tin.length) h += '<p class="muted">Tidak ada. Semua jawabanmu tepat.</p>';
  return { title: 'Hasil', html: h + '</div><button class="btn" data-y="done">Selesai</button>' };
}
function reviewSoal(id, T) {
  var q = B.SO()[id], jw = T ? T.jw[id] : undefined, L = B.ALFA, best = q.s ? q.s.indexOf(5) : q.k;
  var ans = jw === undefined ? 'Kosong' : L[jw] + '. ' + q.o[jw] + (q.s ? ' (nilai ' + q.s[jw] + ')' : '');
  A.openModal('<h2>' + esc(q.q) + '</h2>' + (T ? '<p>Jawabanmu: ' + esc(ans) + '</p>' : '') +
    '<p>' + (q.s ? 'Nilai tertinggi: ' : 'Kunci: ') + esc(L[best] + '. ' + q.o[best]) + '</p><p class="muted">' + esc(q.b) +
    '</p><div class="acts"><button class="btn" data-m="x">Tutup</button></div>',
    function (el) { el.querySelector('[data-m]').addEventListener('click', A.closeModal); });
}

/* ---------- Tab Try Out ---------- */
A.tabViews.tryout = function () {
  var T = kv.get('to', null), av = avail(), h = '', full = rencana('full', null, av), mini = rencana('mini', null, av);
  if (T && !T.done && Date.now() >= T.t0 + T.dur) finish(T);
  if (T && !T.done) {
    h += '<div class="card"><h2>Try out berjalan</h2><p class="muted">' + esc(T.label) + ', sisa waktu ' + mm(T.t0 + T.dur - Date.now()) +
      '</p><button class="btn" data-y="open">Lanjutkan</button></div>';
  } else if (T) {
    h += '<div class="card"><h2>Hasil try out terakhir</h2><p class="muted">' + esc(T.label) + ' belum ditutup.</p><button class="btn" data-y="open">Lihat hasil</button></div>';
  }
  var cukup = total(full) === 110;
  h += '<div class="card"><h2>Simulasi penuh</h2><p>110 soal, 100 menit, tidak bisa dijeda.</p>' +
    (cukup ? '<button class="btn" data-y="start:full">Mulai simulasi</button>'
      : '<p class="muted">Bank soal belum cukup: TWK ' + av.twk + ' dari 30, TIU ' + av.tiu + ' dari 35, TKP ' + av.tkp + ' dari 45. Aktif otomatis saat soalnya cukup.</p><button class="btn" disabled>Mulai simulasi</button>') + '</div>';
  h += '<div class="card"><h2>Per subtes</h2>';
  SUBS.forEach(function (s) {
    var n = rencana('sub', s, av)[s];
    h += '<div class="row" data-y="start:sub:' + s + '"><span>' + subName(s) + '</span><span class="muted">' + n + ' soal, ' + Math.round(n * PER_SOAL / 60000) + ' menit</span></div>';
  });
  h += '</div><div class="card"><h2>Mini try out</h2><p class="muted">Campuran TWK, TIU, TKP. ' + total(mini) + ' soal, ' + Math.round(total(mini) * PER_SOAL / 60000) +
    ' menit.</p><button class="btn" data-y="start:mini">Mulai mini try out</button></div>';
  var hist = kv.get('tohist', []).slice(-5).reverse();
  h += '<div class="card"><h2>Riwayat</h2>';
  hist.forEach(function (x) {
    var p = 0, mx = 0;
    SUBS.forEach(function (s) { p += x.sub[s].p; mx += x.sub[s].mx; });
    h += '<div class="row"><span>' + esc(x.label) + '<span class="tag">' + new Date(x.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + '</span></span><b>' + p + ' dari ' + mx + '</b></div>';
  });
  if (!hist.length) h += '<p class="muted">Belum ada. Hasil try out tampil di sini.</p>';
  return { title: 'Try Out', html: h + '</div><button class="btn ghost" data-y="eval">Evaluasi belajar</button>' };
};

/* ---------- Buku Kesalahan ---------- */
A.screens.buku = function () {
  var sl = kv.get('salah', []), t = A.today(), m = B.SO();
  var due = sl.filter(function (x) { return !x.due || x.due <= t; });
  var h = '<div class="card"><h2>Buku Kesalahan</h2><div><span class="big">' + sl.length + '</span> soal tersimpan</div><p class="muted" style="margin-top:.5rem">' +
    due.length + ' soal jatuh tempo hari ini. Soal salah muncul lagi besok, lalu 3 hari kemudian. Dua kali benar berturut-turut, soal keluar dari buku.</p>' +
    '<div class="acts"><button class="btn" data-x="go:salah"' + (due.length ? '' : ' disabled') + '>Latihan sekarang</button><button class="btn ghost" data-y="eval">Evaluasi</button></div></div>';
  h += '<div class="card"><h2>Daftar soal</h2>';
  sl.slice().sort(function (a, b) { return (a.due || '') < (b.due || '') ? -1 : 1; }).forEach(function (x) {
    var q = m[x.id];
    if (!q) return;
    var d = x.due ? Math.round((new Date(x.due + 'T00:00:00') - new Date(t + 'T00:00:00')) / 864e5) : 0;
    h += '<div class="row" data-y="rv:' + x.id + '"><span>' + esc(B.topikNama(q.t)) + ', ' + esc(q.q.slice(0, 40)) + '...<span class="tag">' + (x.alasan ? esc(x.alasan) + '. ' : '') +
      (d <= 0 ? 'Jatuh tempo' : (d === 1 ? 'Besok' : d + ' hari lagi')) + '</span></span></div>';
  });
  if (!sl.length) h += '<p class="muted">Kosong. Soal yang salah masuk otomatis ke sini.</p>';
  return { title: 'Buku Kesalahan', html: h + '</div>' };
};

/* ---------- Evaluasi ---------- */
A.screens.evaluasi = function () {
  var st = kv.get('stat', {}), hist = kv.get('tohist', []), sl = kv.get('salah', []), h = '';
  if (!Object.keys(st).length && !hist.length) {
    return { title: 'Evaluasi', html: '<div class="empty">Belum ada data. Kerjakan beberapa latihan atau try out, lalu evaluasimu muncul di sini.</div>' };
  }
  h += '<div class="card"><h2>Penguasaan per topik</h2>';
  D.subtes.forEach(function (s) {
    h += '<div class="muted" style="margin-top:.5rem">' + esc(s.nama) + '</div>';
    s.topik.forEach(function (t) {
      var x = st[t.id], pct = x ? Math.round(x.p * 100 / x.n) : 0;
      h += '<div class="row" style="padding-bottom:0"><span>' + esc(t.nama) + '</span><span class="muted">' + (x ? pct + '% dari ' + x.n + ' soal' : 'belum ada data') + '</span></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>';
    });
  });
  h += '</div>';
  var pts = hist.map(function (x) {
    var p = 0, mx = 0;
    SUBS.forEach(function (s) { p += x.sub[s].p; mx += x.sub[s].mx; });
    return mx ? Math.round(p * 100 / mx) : 0;
  }).slice(-10);
  if (pts.length >= 2) {
    var xy = pts.map(function (v, i) { return (10 + i * 280 / (pts.length - 1)).toFixed(1) + ',' + (90 - v * 0.8).toFixed(1); });
    h += '<div class="card"><h2>Perkembangan try out</h2><svg viewBox="0 0 300 100" width="100%" style="stroke:none"><polyline points="' + xy.join(' ') +
      '" style="fill:none;stroke:#3b82f6;stroke-width:2"/>' + xy.map(function (p) { var c = p.split(','); return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="3" fill="#3b82f6"/>'; }).join('') +
      '</svg><div class="muted">Persen nilai, ' + pts.length + ' try out terakhir: ' + pts.join(', ') + '</div></div>';
  }
  var weak = Object.keys(st).filter(function (t) { return st[t].n >= 3 && st[t].p / st[t].n < 0.85; })
    .sort(function (a, b) { return st[a].p / st[a].n - st[b].p / st[b].n; }).slice(0, 3);
  h += '<div class="card"><h2>Perlu diperkuat</h2>';
  weak.forEach(function (t) {
    var bab = D.bab.filter(function (b) { return b.topik === t; })[0];
    h += '<div class="row"><span>' + esc(B.topikNama(t)) + '<span class="tag">' + Math.round(st[t].p * 100 / st[t].n) + '% dari ' + st[t].n + ' soal</span></span><span class="acts">' +
      (bab ? '<button class="btn ghost sm" data-x="bab:' + bab.id + '">Materi</button>' : '') + '<button class="btn sm" data-x="lat:' + t + '">Latihan</button></span></div>';
  });
  if (!weak.length) h += '<p class="muted">Belum ada topik di bawah 85% dengan minimal 3 soal. Terus berlatih.</p>';
  h += '</div>';
  var cnt = {}, ks;
  sl.forEach(function (x) { if (x.alasan) cnt[x.alasan] = (cnt[x.alasan] || 0) + 1; });
  ks = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  if (ks.length) {
    h += '<div class="card"><h2>Penyebab kesalahan</h2>';
    ks.forEach(function (k) { h += '<div class="row"><span>' + esc(k) + '</span><b>' + cnt[k] + '</b></div>'; });
    h += '<p class="muted" style="margin-top:.5rem">' + esc(SARAN[ks[0]] || '') + '</p></div>';
  }
  return { title: 'Evaluasi', html: h };
};

/* ---------- Event ---------- */
document.getElementById('view').addEventListener('click', function (e) {
  var el = e.target.closest('[data-y]');
  if (!el) return;
  var p = el.getAttribute('data-y').split(':'), a = p[0], T = kv.get('to', null), on = T && !T.done;
  if (a === 'start') {
    if (p[1] === 'full') A.confirmBox('Mulai simulasi penuh?', 'Waktu 100 menit langsung berjalan dan tidak bisa dijeda.', 'Mulai', false, function () { mulaiTO('full'); });
    else mulaiTO(p[1], p[2]);
  }
  else if (a === 'open') A.push('to');
  else if (a === 'eval') A.push('evaluasi');
  else if (a === 'rv') reviewSoal(p[1], null);
  else if (a === 'rt' && T) reviewSoal(p[1], T);
  else if (a === 'done') { kv.set('to', null); A.goTab('tryout'); }
  else if (on && a === 'ans') {
    var id = T.ids[T.cur], i = parseInt(p[1], 10);
    if (T.jw[id] === i) delete T.jw[id]; else T.jw[id] = i;
    kv.set('to', T); A.render(true);
  }
  else if (on && a === 'ragu') { var q = T.ids[T.cur]; if (T.ragu[q]) delete T.ragu[q]; else T.ragu[q] = true; kv.set('to', T); A.render(true); }
  else if (on && a === 'prev' && T.cur > 0) pindah(T, T.cur - 1);
  else if (on && a === 'next' && T.cur < T.ids.length - 1) pindah(T, T.cur + 1);
  else if (on && a === 'grid') gridModal(T);
  else if (on && a === 'fin') {
    var kosong = T.ids.filter(function (id) { return T.jw[id] === undefined; }).length;
    A.confirmBox('Akhiri try out?', kosong ? kosong + ' soal belum dijawab. Soal kosong bernilai 0.' : 'Semua soal sudah dijawab.', 'Akhiri', true, function () { finish(T); A.render(); });
  }
});

A.ujian = { mulai: mulaiTO, finish: finish };
})();
