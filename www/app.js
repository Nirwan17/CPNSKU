(function () {
'use strict';

var $ = function (s) { return document.querySelector(s); };
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return iso(new Date()); }
function daysTo(s) {
  var t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(s + 'T00:00:00') - t) / 86400000);
}
function fmtDate(s) {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- Penyimpanan: IndexedDB, dibaca sekali saat mulai lalu dipegang di memori ---------- */
var kv = (function () {
  var db = null, cache = {};
  function write(fn) {
    if (!db) return;
    try { fn(db.transaction('kv', 'readwrite').objectStore('kv')); } catch (e) {}
  }
  return {
    init: function () {
      return new Promise(function (resolve) {
        var req;
        try { req = indexedDB.open('cpnsku', 1); } catch (e) { resolve(); return; }
        req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
        req.onerror = function () { resolve(); };
        req.onsuccess = function () {
          db = req.result;
          var cur = db.transaction('kv').objectStore('kv').openCursor();
          cur.onsuccess = function () {
            var c = cur.result;
            if (c) { cache[c.key] = c.value; c['continue'](); } else resolve();
          };
          cur.onerror = function () { resolve(); };
        };
      });
    },
    get: function (k, d) { return k in cache ? cache[k] : d; },
    set: function (k, v) { cache[k] = v; write(function (s) { s.put(v, k); }); },
    clear: function () { cache = {}; write(function (s) { s.clear(); }); }
  };
})();

/* ---------- Pengaturan ---------- */
var DEFAULTS = {
  mode: 'terpandu', font: 'sedang', target: 20,
  examOn: false, examDate: '', streakOn: true,
  pg: { twk: 65, tiu: 80, tkp: 166 }
};
var cfg = Object.assign({}, DEFAULTS);
function loadCfg() { cfg = Object.assign({}, DEFAULTS, kv.get('cfg', {})); }
function saveCfg() { kv.set('cfg', cfg); }
function applyFont() {
  document.documentElement.style.fontSize = ({ kecil: '15px', sedang: '16px', besar: '18px' })[cfg.font] || '16px';
}

/* ---------- Pencatat aktivitas belajar (dipakai Latihan dan Try Out nanti) ---------- */
function logActivity(n) {
  var d = today();
  kv.set('log:' + d, kv.get('log:' + d, 0) + (n || 1));
  var days = kv.get('days', []);
  if (days.indexOf(d) < 0) { days.push(d); kv.set('days', days.slice(-400)); }
}
function streak() {
  var set = {}, n = 0, d = new Date();
  kv.get('days', []).forEach(function (x) { set[x] = 1; });
  if (!set[iso(d)]) d.setDate(d.getDate() - 1);
  while (set[iso(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- Toast dan dialog ---------- */
var tt;
function toast(m) {
  var t = $('#toast');
  t.textContent = m; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2000);
}
var modals = [];
function openModal(inner, bind) {
  var el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = '<div class="sheet" role="dialog">' + inner + '</div>';
  el.addEventListener('click', function (e) { if (e.target === el) closeModal(); });
  document.body.appendChild(el);
  modals.push(el);
  if (bind) bind(el);
  return el;
}
function closeModal() { var el = modals.pop(); if (el) el.remove(); }
function confirmBox(title, text, okLabel, danger, onOk) {
  openModal('<h2>' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p>' +
    '<div class="acts"><button class="btn ghost" data-m="no">Batal</button>' +
    '<button class="btn' + (danger ? ' danger' : '') + '" data-m="ok">' + esc(okLabel) + '</button></div>',
    function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]');
        if (!b) return;
        var ok = b.getAttribute('data-m') === 'ok';
        closeModal();
        if (ok) onOk();
      });
    });
}

/* ---------- Navigasi ---------- */
var TABS = [
  { id: 'beranda', label: 'Beranda', icon: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'materi', label: 'Materi', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13' },
  { id: 'trik', label: 'Trik', icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z' },
  { id: 'latihan', label: 'Latihan', icon: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3' },
  { id: 'tryout', label: 'Try Out', icon: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' }
];
var nav = { tab: 'beranda', stack: [] };
var tabViews = {}, screens = {}, current = null, P = {};

function render(keep) {
  var top = nav.stack[nav.stack.length - 1];
  var scr = top ? screens[top.id](top.arg) : tabViews[nav.tab]();
  var v = $('#view'), y = v.scrollTop;
  current = scr;
  $('#title').textContent = scr.title;
  $('#back').hidden = !top;
  $('#gear').hidden = !!top || nav.tab !== 'beranda';
  v.innerHTML = scr.html;
  v.scrollTop = keep ? y : 0;
  Array.prototype.forEach.call($('#tabs').children, function (b) {
    b.classList.toggle('on', b.getAttribute('data-tab') === nav.tab);
  });
  if (scr.bind) scr.bind(v);
}
function goTab(id) { nav.tab = id; nav.stack = []; render(); }
function push(id, arg) { nav.stack.push({ id: id, arg: arg }); render(); }

var lastBack = 0;
function exitApp() { if (P.App && P.App.exitApp) P.App.exitApp(); }
function onBack() {
  if (modals.length) { closeModal(); return; }
  if (current && current.onBack && current.onBack()) return;
  if (nav.stack.length) { nav.stack.pop(); render(); return; }
  if (nav.tab !== 'beranda') { goTab('beranda'); return; }
  var now = Date.now();
  if (now - lastBack < 2000) { exitApp(); return; }
  lastBack = now;
  toast('Tekan sekali lagi untuk keluar');
}

/* ---------- Beranda ---------- */
var SARAN = [
  { t: 'Mulai dari satu bab pemula di Materi. Satu bab kecil sudah cukup untuk hari ini.', tab: 'materi', b: 'Buka Materi' },
  { t: 'Coba 10 soal latihan untuk mengenali titik awalmu.', tab: 'latihan', b: 'Buka Latihan' },
  { t: 'Punya trik dari seseorang? Catat sekarang supaya tidak lupa.', tab: 'trik', b: 'Buka Trik' }
];

tabViews.beranda = function () {
  var c = cfg, h = '', hasDate = c.examOn && c.examDate;
  if (hasDate) {
    var n = daysTo(c.examDate);
    h += '<div class="card"><div class="muted">Ujian dalam</div><div class="big">' +
      (n >= 0 ? n + ' hari' : 'sudah lewat') + '</div><div class="muted">' + esc(fmtDate(c.examDate)) + '</div></div>';
  }
  var rs = kv.get('resume', null);
  if (rs) {
    h += '<div class="card"><h2>Lanjutkan</h2><p class="muted">' + esc(rs.label) +
      '</p><button class="btn" data-tab="' + esc(rs.tab) + '">Lanjut</button></div>';
  }
  if (c.mode === 'terpandu') {
    var s = SARAN[kv.get('saran', 0) % SARAN.length];
    h += '<div class="card"><h2>Saran hari ini</h2><p>' + esc(s.t) + '</p><div class="acts">' +
      '<button class="btn" data-tab="' + s.tab + '">' + s.b + '</button>' +
      '<button class="btn ghost" data-act="saran">Ganti saran</button></div></div>';
  }
  var done = kv.get('log:' + today(), 0), pct = Math.min(100, Math.round(done * 100 / c.target));
  h += '<div class="card"><h2>Progres hari ini</h2><div><b>' + done + '</b> dari ' + c.target +
    ' soal</div><div class="bar"><i style="width:' + pct + '%"></i></div>';
  if (c.streakOn) {
    var st = streak();
    h += '<div class="muted">' + (st ? 'Belajar beruntun ' + st + ' hari' : 'Belum ada hari beruntun. Mulai hari ini.') + '</div>';
  }
  h += '</div>';
  var t = kv.get('tryout:last', null);
  h += '<div class="card"><h2>Skor try out terakhir</h2>';
  if (t) {
    [['TWK', 'twk'], ['TIU', 'tiu'], ['TKP', 'tkp']].forEach(function (x) {
      var ok = t[x[1]] >= c.pg[x[1]];
      h += '<div class="row"><span>' + x[0] + '</span><span><b>' + t[x[1]] + '</b> <span class="muted">batas ' +
        c.pg[x[1]] + ', ' + (ok ? 'lulus' : 'belum') + '</span></span></div>';
    });
  } else {
    h += '<p class="muted">Belum ada. Hasil try out pertamamu tampil di sini.</p>';
  }
  h += '</div>';
  var weak = kv.get('weak', []);
  h += '<div class="card"><h2>Topik terlemah</h2>';
  if (weak.length) {
    weak.slice(0, 3).forEach(function (w) {
      h += '<div class="row"><span>' + esc(w.name) + '</span><button class="btn ghost" data-tab="' + esc(w.tab) + '">Buka</button></div>';
    });
  } else {
    h += '<p class="muted">Muncul setelah kamu mengerjakan latihan dan try out.</p>';
  }
  h += '</div>';
  if (!hasDate) h += '<button class="btn ghost" data-go="pengaturan">Atur tanggal ujian</button>';
  return { title: 'Beranda', html: h };
};

function soon(title, note) {
  return function () { return { title: title, html: '<div class="empty">' + esc(note) + '</div>' }; };
}
tabViews.materi = soon('Materi', 'Materi bawaan hadir di tahap 1b. Impor materimu sendiri hadir di tahap 2.');
tabViews.trik = soon('Trik', 'Menu trik hadir di tahap 1d.');
tabViews.latihan = soon('Latihan', 'Latihan soal hadir di tahap 1b.');
tabViews.tryout = soon('Try Out', 'Try out hadir di tahap 1c.');

/* ---------- Pengaturan ---------- */
function seg(k, opts) {
  return '<div class="seg">' + opts.map(function (o) {
    return '<button data-act="set" data-k="' + k + '" data-v="' + o[0] + '"' + (cfg[k] === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>';
  }).join('') + '</div>';
}
screens.pengaturan = function () {
  var c = cfg, b = (document.querySelector('meta[name=build]') || {}).content || '-';
  var h = '<div class="card">' +
    '<div class="row"><span>Mode Beranda</span>' + seg('mode', [['terpandu', 'Terpandu'], ['bebas', 'Bebas']]) + '</div>' +
    '<div class="row"><span>Ukuran huruf</span>' + seg('font', [['kecil', 'Kecil'], ['sedang', 'Sedang'], ['besar', 'Besar']]) + '</div>' +
    '<div class="row"><span>Target harian</span><select data-k="target">' +
      [10, 20, 30, 50, 100].map(function (n) {
        return '<option value="' + n + '"' + (c.target === n ? ' selected' : '') + '>' + n + ' soal</option>';
      }).join('') + '</select></div>' +
    '<div class="row"><span>Belajar beruntun</span><input type="checkbox" data-k="streakOn"' + (c.streakOn ? ' checked' : '') + '></div>' +
    '<div class="row"><span>Hitung mundur ujian</span><input type="checkbox" data-k="examOn"' + (c.examOn ? ' checked' : '') + '></div>' +
    (c.examOn ? '<div class="row"><span>Tanggal ujian</span><input type="date" data-k="examDate" value="' + esc(c.examDate) + '"></div>' : '') +
    '</div>' +
    '<div class="card"><h2>Tentang</h2><div class="muted">CPNSku, versi build ' + esc(b) + '<br>com.ns.cpnsku</div></div>' +
    '<div class="card"><h2>Data</h2><p class="muted">Backup dan restore hadir di tahap 1d.</p>' +
    '<button class="btn danger" data-act="reset">Reset semua data</button></div>';
  return { title: 'Pengaturan', html: h };
};

function resetAll() {
  confirmBox('Reset semua data?', 'Progres, catatan, dan riwayat akan terhapus dan tidak bisa dikembalikan.', 'Lanjut', true, function () {
    confirmBox('Yakin?', 'Ini konfirmasi terakhir. Semua data CPNSku di HP ini akan dihapus.', 'Hapus semua', true, function () {
      kv.clear(); cfg = Object.assign({}, DEFAULTS); applyFont();
      nav.stack = []; nav.tab = 'beranda'; render(); toast('Data dihapus');
    });
  });
}

/* ---------- Event ---------- */
function onViewClick(e) {
  var el = e.target.closest('[data-tab],[data-go],[data-act]');
  if (!el) return;
  if (el.hasAttribute('data-tab')) { goTab(el.getAttribute('data-tab')); return; }
  if (el.hasAttribute('data-go')) { push(el.getAttribute('data-go')); return; }
  var a = el.getAttribute('data-act');
  if (a === 'saran') { kv.set('saran', kv.get('saran', 0) + 1); render(true); }
  else if (a === 'set') { cfg[el.getAttribute('data-k')] = el.getAttribute('data-v'); saveCfg(); applyFont(); render(true); }
  else if (a === 'reset') resetAll();
}
function onViewChange(e) {
  var el = e.target, k = el.getAttribute('data-k');
  if (!k) return;
  var v = el.type === 'checkbox' ? el.checked : el.value;
  if (k === 'target') v = parseInt(v, 10);
  cfg[k] = v; saveCfg(); render(true);
}

function boot() {
  P = (window.Capacitor && window.Capacitor.Plugins) || {};
  kv.init().then(function () {
    loadCfg(); applyFont();
    $('#tabs').innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t.id + '"><svg viewBox="0 0 24 24"><path d="' + t.icon + '"/></svg>' + t.label + '</button>';
    }).join('');
    $('#tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]');
      if (b) goTab(b.getAttribute('data-tab'));
    });
    $('#view').addEventListener('click', onViewClick);
    $('#view').addEventListener('change', onViewChange);
    $('#back').addEventListener('click', onBack);
    $('#gear').addEventListener('click', function () { push('pengaturan'); });
    if (P.App) P.App.addListener('backButton', onBack);
    if (P.StatusBar) {
      try {
        P.StatusBar.setBackgroundColor({ color: '#0a0a0a' });
        P.StatusBar.setStyle({ style: 'DARK' });
      } catch (e) {}
    }
    render();
  });
}
window.addEventListener('load', boot);

/* Pintu untuk modul tahap berikutnya (materi.js, latihan.js, dan seterusnya) */
window.App = {
  kv: kv, esc: esc, today: today, toast: toast, render: render, goTab: goTab, push: push,
  openModal: openModal, closeModal: closeModal, confirmBox: confirmBox, logActivity: logActivity,
  tabViews: tabViews, screens: screens, cfg: function () { return cfg; }
};
})();
