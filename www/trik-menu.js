(function () {
'use strict';
var A = window.App, kv = A.kv, esc = A.esc, D = A.data, B = A.belajar;
var filt = 'semua', cari = '';

var css = document.createElement('style');
css.textContent = '.in{width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:.6rem;font:inherit;margin:.25rem 0 .6rem}' +
  '.row[data-w]{cursor:pointer}.sheet label{display:block;font-size:.85rem;color:var(--muted)}';
document.head.appendChild(css);

function semua() { return D.trik.concat(kv.get('trik', [])); }
function label(x) { return x.tipe === 'claude' ? 'Dari Claude, cek dulu' : 'Sumber: ' + x.sumber; }
function cocok(x) {
  if (filt !== 'semua' && x.tipe !== filt) return false;
  var k = cari.toLowerCase();
  return !k || (x.judul + ' ' + x.inti + ' ' + x.sumber).toLowerCase().indexOf(k) >= 0;
}
function daftar() {
  var items = semua().filter(cocok), fv = kv.get('trikfav', {}), h = '', g = [{ nama: 'Umum', f: function (x) { return !x.t; } }];
  if (!items.length) return '<div class="empty">Belum ada trik yang cocok. Ketuk Tambah trik untuk mencatat trik dari seseorang.</div>';
  D.subtes.forEach(function (s) {
    s.topik.forEach(function (t) { g.push({ nama: s.nama + ', ' + t.nama, f: function (x) { return x.t === t.id; } }); });
  });
  g.forEach(function (gr) {
    var a = items.filter(gr.f);
    if (!a.length) return;
    h += '<div class="card"><h2>' + esc(gr.nama) + '</h2>' + a.map(function (x) {
      return '<div class="row" data-w="lihat:' + x.id + '"><span>' + (fv[x.id] ? '★ ' : '') + esc(x.judul) + '<span class="tag">' + esc(label(x)) + '</span></span></div>';
    }).join('') + '</div>';
  });
  return h;
}

A.tabViews.trik = function () {
  var h = '<div class="card"><input id="ts" class="in" type="search" placeholder="Cari trik" value="' + esc(cari) + '">' +
    '<div class="seg">' + [['semua', 'Semua'], ['user', 'Dari saya'], ['claude', 'Dari Claude']].map(function (o) {
      return '<button data-w="f:' + o[0] + '"' + (filt === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>';
    }).join('') + '</div>' +
    '<div class="acts" style="margin-top:.75rem"><button class="btn" data-w="tambah">Tambah trik</button></div>' +
    '<div class="muted" style="margin-top:.75rem">Ringkasan sebelum try out</div><div class="acts" style="margin-top:.4rem">' +
    D.subtes.map(function (s) { return '<button class="btn ghost sm" data-w="rk:' + s.id + '">' + esc(s.nama) + '</button>'; }).join('') +
    '</div></div><div id="tl">' + daftar() + '</div>';
  return {
    title: 'Trik', html: h,
    bind: function (v) {
      v.querySelector('#ts').addEventListener('input', function (e) { cari = e.target.value; v.querySelector('#tl').innerHTML = daftar(); });
    }
  };
};

A.screens.ringkas = function (sid) {
  var s = D.subtes.filter(function (x) { return x.id === sid; })[0], ids = {}, fv = kv.get('trikfav', {});
  s.topik.forEach(function (t) { ids[t.id] = 1; });
  var a = semua().filter(function (x) { return !x.t || ids[x.t]; }), f = a.filter(function (x) { return fv[x.id]; });
  var pakai = f.length ? f : a;
  var h = '<div class="card"><h2>Ringkasan ' + esc(s.nama) + '</h2><div class="muted">' +
    (f.length ? 'Trik berbintang milikmu.' : 'Belum ada yang berbintang, jadi semua trik ditampilkan. Beri bintang pada yang wajib hafal.') + '</div>';
  pakai.forEach(function (x) { h += '<p style="margin-top:.75rem"><b>' + esc(x.judul) + '</b><br>' + esc(x.inti) + '</p>'; });
  if (!pakai.length) h += '<p class="muted">Belum ada trik.</p>';
  return { title: 'Ringkasan ' + s.nama, html: h + '</div>' };
};

function lihat(id) {
  var x = semua().filter(function (y) { return y.id === id; })[0];
  if (!x) return;
  var fv = kv.get('trikfav', {}), st = kv.get('trikstat', {})[id], milik = kv.get('trik', []).some(function (y) { return y.id === id; });
  A.openModal('<h2>' + esc(x.judul) + '</h2><div class="tag">' + esc(label(x)) + (x.t ? ', ' + esc(B.topikNama(x.t)) : '') + '</div>' +
    '<p style="margin-top:.6rem">' + esc(x.inti) + '</p>' + (x.contoh ? '<p class="muted">Contoh: ' + esc(x.contoh) + '</p>' : '') +
    (x.catatan ? '<p class="muted">Catatan: ' + esc(x.catatan) + '</p>' : '') +
    '<p class="muted">' + (st ? 'Dipakai ' + st.n + ' kali, benar ' + st.ok + ' kali.' : 'Belum pernah ditandai dipakai.') + '</p>' +
    '<div class="acts"><button class="btn ghost" data-m="fav">' + (fv[id] ? 'Hapus bintang' : 'Beri bintang') + '</button>' +
    (milik ? '<button class="btn ghost" data-m="ubah">Ubah</button><button class="btn ghost" data-m="hapus">Hapus</button>' : '') +
    '<button class="btn" data-m="x">Tutup</button></div>',
    function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        var m = b.getAttribute('data-m');
        A.closeModal();
        if (m === 'fav') { if (fv[id]) delete fv[id]; else fv[id] = true; kv.set('trikfav', fv); A.render(true); }
        else if (m === 'ubah') form(x);
        else if (m === 'hapus') {
          A.confirmBox('Hapus trik ini?', x.judul, 'Hapus', true, function () {
            kv.set('trik', kv.get('trik', []).filter(function (y) { return y.id !== id; })); A.render(true);
          });
        }
      });
    });
}

function form(x) {
  var opt = '<option value="">Umum</option>' + D.subtes.map(function (s) {
    return s.topik.map(function (t) {
      return '<option value="' + t.id + '"' + (x && x.t === t.id ? ' selected' : '') + '>' + esc(s.nama + ', ' + t.nama) + '</option>';
    }).join('');
  }).join('');
  function v(k) { return x ? esc(x[k] || '') : ''; }
  A.openModal('<h2>' + (x ? 'Ubah trik' : 'Tambah trik') + '</h2>' +
    '<label>Topik</label><select id="f-t" class="in">' + opt + '</select>' +
    '<label>Judul</label><input id="f-j" class="in" value="' + v('judul') + '">' +
    '<label>Inti trik</label><textarea id="f-i" class="in" rows="3">' + v('inti') + '</textarea>' +
    '<label>Contoh soal dan cara pakai (opsional)</label><textarea id="f-c" class="in" rows="2">' + v('contoh') + '</textarea>' +
    '<label>Kapan berlaku atau tidak (opsional)</label><textarea id="f-n" class="in" rows="2">' + v('catatan') + '</textarea>' +
    '<label>Sumber</label><input id="f-s" class="in" value="' + (x ? v('sumber') : 'Saya') + '">' +
    '<div class="acts"><button class="btn ghost" data-m="x">Batal</button><button class="btn" data-m="ok">Simpan</button></div>',
    function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        if (b.getAttribute('data-m') === 'ok') {
          var j = el.querySelector('#f-j').value.trim(), it = el.querySelector('#f-i').value.trim();
          if (!j || !it) { A.toast('Judul dan inti trik wajib diisi'); return; }
          var d = { id: x ? x.id : 'u-' + Date.now().toString(36), t: el.querySelector('#f-t').value, judul: j, inti: it,
            contoh: el.querySelector('#f-c').value.trim(), catatan: el.querySelector('#f-n').value.trim(),
            sumber: el.querySelector('#f-s').value.trim() || 'Saya', tipe: 'user' };
          var l = kv.get('trik', []).filter(function (y) { return !x || y.id !== x.id; });
          l.push(d); kv.set('trik', l); A.toast('Trik tersimpan'); A.render(true);
        }
        A.closeModal();
      });
    });
}

/* Dipakai dari soal latihan dan dari bab materi */
function catatPakai(tid, ctx) {
  var uses = kv.get('trikuse', {}), key = ctx.id + ':' + tid;
  if (uses[key]) return;
  uses[key] = 1; kv.set('trikuse', uses);
  var st = kv.get('trikstat', {}), t = st[tid] || { n: 0, ok: 0 };
  t.n++; if (ctx.ok) t.ok++; st[tid] = t; kv.set('trikstat', st);
}
function buka(t, ctx) {
  var a = semua().filter(function (x) { return x.t === t || !x.t; });
  var h = '<h2>Trik: ' + esc(B.topikNama(t)) + '</h2>';
  if (!a.length) h += '<p class="muted">Belum ada trik untuk topik ini. Tambahkan lewat tab Trik.</p>';
  a.forEach(function (x) {
    h += '<div class="card" style="background:var(--bg)"><b>' + esc(x.judul) + '</b><div class="tag">' + esc(label(x)) + '</div><p style="margin-top:.4rem">' + esc(x.inti) + '</p>' +
      (x.catatan ? '<p class="muted">' + esc(x.catatan) + '</p>' : '') +
      (ctx && ctx.ok !== null ? '<button class="btn ghost sm" data-u="' + x.id + '">Saya pakai trik ini (hasil ' + (ctx.ok ? 'benar' : 'salah') + ')</button>' : '') + '</div>';
  });
  if (ctx && ctx.ok === null) h += '<p class="muted">Jawab dulu di mode Belajar, lalu tandai trik yang kamu pakai.</p>';
  A.openModal(h + '<div class="acts"><button class="btn" data-m="x">Tutup</button></div>', function (el) {
    el.addEventListener('click', function (e) {
      var u = e.target.closest('[data-u]');
      if (u) { catatPakai(u.getAttribute('data-u'), ctx); u.disabled = true; u.textContent = 'Tercatat'; return; }
      if (e.target.closest('[data-m]')) A.closeModal();
    });
  });
}

document.getElementById('view').addEventListener('click', function (e) {
  var el = e.target.closest('[data-w]');
  if (!el) return;
  var p = el.getAttribute('data-w').split(':'), a = p[0];
  if (a === 'f') { filt = p[1]; A.render(true); }
  else if (a === 'tambah') form(null);
  else if (a === 'lihat') lihat(p[1]);
  else if (a === 'rk') A.push('ringkas', p[1]);
});

A.trik = { buka: buka };
})();
