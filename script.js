/* ==========================================================================
   STEPASHKA — сценарий страницы.

   Читает data.js (SITE / CATEGORIES / BOOKMAKERS), подставляет тексты плакатов,
   рисует рейтинг, собирает QR-код, подгоняет гигантские слова по ширине и
   запускает сдержанную анимацию. При ?draft в адресе берёт черновик из
   панели (localStorage 'stepashka_admin_draft:file').
   Без JS остаются статические тексты из index.html; рейтинг без JS не виден.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ─────────────────────────────── данные ─────────────────────────────── */

  /* Объявления const из data.js в window не попадают — читаем по имени. */
  var DATA = {
    SITE: typeof SITE !== 'undefined' ? SITE : {},
    CATEGORIES: typeof CATEGORIES !== 'undefined' ? CATEGORIES : [],
    BOOKMAKERS: typeof BOOKMAKERS !== 'undefined' ? BOOKMAKERS : []
  };

  if (/[?&]draft/.test(location.search)) {
    try {
      var draftFile = localStorage.getItem('stepashka_admin_draft:file');
      if (draftFile) {
        DATA = new Function(draftFile + '\n;return { SITE: SITE, CATEGORIES: CATEGORIES, BOOKMAKERS: BOOKMAKERS };')();
      }
    } catch (e) { /* битый черновик — показываем боевую версию */ }
  }

  var S = DATA.SITE || {};
  var CTA = (DATA.CATEGORIES && DATA.CATEGORIES[0] && DATA.CATEGORIES[0].cta) || 'Перейти на сайт';
  var LIST = (DATA.BOOKMAKERS || []).filter(function (b) { return b && b.name && !b.hidden; });

  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ─────────────────────────────── тексты ─────────────────────────────── */

  $$('[data-site]').forEach(function (n) {
    var v = S[n.getAttribute('data-site')];
    if (typeof v === 'string' && v.trim()) n.textContent = v.trim();
  });
  /* Стрелка в конце подсказки — украшение: не читается вслух; у панели B
     рейтинг выше по странице, поэтому стрелка смотрит вверх. */
  $$('.promo').forEach(function (n) {
    var m = /^(.*?)\s*[↓↑]\s*$/.exec(n.textContent);
    if (!m) return;
    n.textContent = m[1] + ' ';
    var a = doc.createElement('span');
    a.setAttribute('aria-hidden', 'true');
    a.textContent = n.classList.contains('promo--b') ? '↑' : '↓';
    n.appendChild(a);
  });
  $$('[data-site-sr]').forEach(function (n) {
    var v = S[n.getAttribute('data-site-sr')];
    if (typeof v === 'string' && v.trim()) n.textContent = ' ' + v.trim();
  });

  /* Дата «ДД.ММ.ГГГГ» → пары цифр, как на плакате: 01 · 10 · 20 · 26. */
  (function () {
    var m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(S.updated || '');
    if (!m) return;
    var d = pad2(+m[1]), mo = pad2(+m[2]), y = m[3];
    var map = { d: d, m: mo, dm: d + '.' + mo, y1: y.slice(0, 2), y2: y.slice(2), full: d + '.' + mo + '.' + y };
    $$('[data-upd]').forEach(function (n) {
      var v = map[n.getAttribute('data-upd')];
      if (v) n.textContent = v;
      if (n.tagName === 'TIME') n.setAttribute('datetime', y + '-' + mo + '-' + d);
    });
  })();

  $$('[data-count]').forEach(function (n) { n.textContent = LIST.length || 4; });

  /* ─────────────────────────────── рейтинг ─────────────────────────────── */

  var arrow = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M1.5 10.5 10.5 1.5M3.5 1.5h7v7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  function newTabNote(name) {
    var s = el('span', 'sr-only', ' ' + name + ' (откроется в новой вкладке)');
    return s;
  }

  var rankList = $('[data-rank]');
  if (rankList && !LIST.length) {
    rankList.textContent = '';
    rankList.appendChild(el('li', 'rank__empty micro', 'Рейтинг скоро появится'));
  }
  if (rankList && LIST.length) {
    rankList.textContent = '';
    LIST.forEach(function (b, i) {
      try {
      var url = safeUrl(b.url);
      var li = el('li', 'row');

      var n = el('span', 'micro row__n', pad2(i + 1));
      n.setAttribute('aria-hidden', 'true');
      li.appendChild(n);

      var h3 = el('h3', 'row__name');
      var nm = el('span', 'word__t', b.name);
      nm.setAttribute('data-fit', 'max');
      h3.appendChild(nm);
      li.appendChild(h3);

      var bonus = el('div', 'row__bonus');
      if (b.bonus) bonus.appendChild(el('p', 'micro', b.bonus));
      if (b.note) bonus.appendChild(el('p', 'row__note', b.note));
      var tags = (b.tags || []).filter(Boolean);
      if (tags.length) bonus.appendChild(el('p', 'micro row__tags', tags.join(' · ')));
      bonus.appendChild(el('p', 'row__ad', 'Реклама. 18+' + (b.ad ? ' ' + b.ad : '')));
      li.appendChild(bonus);


      if (url) {
        var a = el('a', 'row__cta');
        a.href = url;
        a.target = '_blank';
        a.rel = 'sponsored noopener';
        a.appendChild(el('span', null, CTA));
        a.insertAdjacentHTML('beforeend', arrow);
        a.appendChild(newTabNote(b.name));
        li.appendChild(a);
      } else {
        li.appendChild(el('span', 'row__soon', 'Скоро'));
      }
      rankList.appendChild(li);
      } catch (e) { /* битая запись не должна ронять остальную страницу */ }
    });
  }

  /* Быстрые ссылки в левом нижнем углу первой панели: первые четыре. */
  var quick = $('[data-quick]');
  if (quick) {
    quick.textContent = '';
    LIST.slice(0, 4).forEach(function (b, i) {
      var url = safeUrl(b.url);
      var li = el('li');
      var num = el('span', 'n', pad2(i + 1));
      num.setAttribute('aria-hidden', 'true');
      if (url) {
        var a = el('a', null, b.name);
        a.href = url;
        a.target = '_blank';
        a.rel = 'sponsored noopener';
        a.appendChild(newTabNote(''));
        a.lastChild.textContent = ' (откроется в новой вкладке)';
        li.appendChild(a);
      } else {
        li.appendChild(el('span', 't', b.name));
      }
      li.appendChild(num);
      quick.appendChild(li);
    });
  }

  /* ───────────────────────────────── QR ───────────────────────────────── */

  (function () {
    var holders = $$('[data-qr]');
    if (!holders.length || typeof qrcode !== 'function') return;
    var domain = String(S.domain || 'stepashka1.ru').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    try {
      var qr = qrcode(0, 'M');
      qr.addData('https://' + domain + '/');
      qr.make();
      var n = qr.getModuleCount();
      var d = '';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) d += 'M' + (c + 1) + ' ' + (r + 1) + 'h1v1h-1z';
        }
      }
      var size = n + 2; /* поле в один модуль */
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size +
        '" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="#000" d="' + d + '"/></svg>';
      holders.forEach(function (h) { h.innerHTML = svg; });
    } catch (e) { /* QR — украшение: без него страница остаётся целой */ }
  })();

  /* ──────────────────── гигантские слова: подгон по ширине ──────────────────── */

  function fitWords() {
    $$('.word__t[data-fit]').forEach(function (t) {
      var host = t.parentElement;
      if (!host) return;
      t.style.setProperty('--sx', 1);
      var natural = t.offsetWidth;
      var target = host.clientWidth;
      if (!natural || !target) return;
      var sx = target / natural;
      if (t.getAttribute('data-fit') === 'max') sx = Math.min(1, sx);
      sx = Math.max(t.getAttribute('data-fit') === 'max' ? 0.2 : 0.45, Math.min(1.6, sx));
      t.style.setProperty('--sx', sx.toFixed(4));
    });
  }

  var fitTimer;
  function scheduleFit() { clearTimeout(fitTimer); fitTimer = setTimeout(fitWords, 120); }
  fitWords();
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitWords);
  if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', fitWords);
  /* Пользовательский интервал между буквами (WCAG 1.4.12) меняет ширину слова
     без resize окна — подгоняем заново. transform размер не меняет, цикла нет. */
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleFit);
    $$('.word__t[data-fit]').forEach(function (t) { ro.observe(t); });
  }

  /* ──────────────────────────────── движение ──────────────────────────────── */

  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var wide = window.matchMedia ? window.matchMedia('(min-width: 45em)') : { matches: true };
  var panels = $$('.panel');

  /* Анимация входа — один раз на панель, когда она показалась хотя бы на четверть.
     Панели B и C прячем только здесь, в скрипте: без JS они остаются видимыми. */
  if (root.classList.contains('anim') && 'IntersectionObserver' in window) {
    panels.forEach(function (p) { if (!p.matches('.panel--a')) p.classList.add('anim-pre'); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('anim-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.22 });
    panels.forEach(function (p) { io.observe(p); });
  } else {
    panels.forEach(function (p) { p.classList.add('anim-in'); });
  }

  /* Параллакс кольца и фото: привязан к положению прокрутки, а не к времени —
     автоматически ничего не движется. Выключен при reduced-motion и на телефоне. */
  var mov = panels.filter(function (p) { return $('.ring', p) || $('.photo img', p); });
  var ticking = false, onScreen = new Set();

  function update() {
    ticking = false;
    var on = !motion.matches && wide.matches;
    var vh = window.innerHeight || 800;
    mov.forEach(function (p) {
      if (!on) { p.style.removeProperty('--py'); p.style.removeProperty('--pr'); return; }
      if (!onScreen.has(p)) return;
      var r = p.getBoundingClientRect();
      var k = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2); /* −1…1 */
      k = Math.max(-1, Math.min(1, k));
      p.style.setProperty('--py', (k * -26).toFixed(1));
      p.style.setProperty('--pr', (k * 1.6).toFixed(2));
    });
  }
  function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }

  if (mov.length && 'IntersectionObserver' in window) {
    var vis = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target); });
      request();
    }, { rootMargin: '20% 0px' });
    mov.forEach(function (p) { vis.observe(p); });
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    if (motion.addEventListener) motion.addEventListener('change', function () {
      if (motion.matches) root.classList.remove('anim'); request();
    });
    if (wide.addEventListener) wide.addEventListener('change', request);
  }

  /* Переход по якорю: фокус на заголовок раздела, чтобы клавиатура и
     скринридер продолжили чтение оттуда, а не с начала страницы. */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && doc.getElementById(id);
    if (!target) return;
    var h = id === 'top' ? $('#h1') : $('h2', target) || target;
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      window.setTimeout(function () { h.focus({ preventScroll: true }); }, 0);
    }
  });
})();
