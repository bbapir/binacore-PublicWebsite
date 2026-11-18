/* Binacore website: menu, scroll stories, forms.
   Without this script, or when the reader asks for reduced motion, every story is a plain run of sections
   with a still picture each. With it, the picture is pinned and answers the scroll. */
(function () {
  'use strict';

  // every page opens at its top: the browser is told not to bring back an old scroll position
  // (also on reload and on Back; the scroll library would otherwise put the old position back)
  function manual() { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (window.ScrollTrigger && window.ScrollTrigger.clearScrollMemory) window.ScrollTrigger.clearScrollMemory('manual'); }
  function toTop() { manual(); if (!location.hash) window.scrollTo(0, 0); }
  toTop(); window.addEventListener('load', toTop); window.addEventListener('pageshow', toTop); window.addEventListener('pagehide', manual);
  var doc = document.documentElement, M = window.BinaMoments || {};
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var forceStill = /[?&]still\b/.test(location.search);
  var live = !reduced && !forceStill && !!window.Bina;
  doc.classList.add('js'); if (live) doc.classList.add('live');

  // ---- menu ----
  var toggle = document.querySelector('.menu-toggle'), header = document.querySelector('.site-header');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      Array.prototype.forEach.call(document.querySelectorAll('.nav-item.is-open'), function (it) { it.classList.remove('is-open'); });
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && header.classList.contains('is-open')) { header.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); } });
  }
  // the menu panels: hover and keyboard focus open them in CSS; here a tap opens one on touch screens, Escape closes
  // them, and a panel shuts as soon as one of its links is followed
  var items = Array.prototype.slice.call(document.querySelectorAll('.nav-item')), wideMenu = window.matchMedia('(min-width: 901px)'), noHover = window.matchMedia('(hover: none)');
  function shut(except) { items.forEach(function (it) { if (it !== except) it.classList.remove('is-open'); }); }
  items.forEach(function (it) {
    var top = it.querySelector('.nav-top');
    top.addEventListener('click', function (ev) {
      // phone and tablet: the menu is a list; a tap on an entry opens or closes its own short list
      if (!wideMenu.matches) { ev.preventDefault(); var on = !it.classList.contains('is-open'); shut(); it.classList.toggle('is-open', on); top.setAttribute('aria-expanded', on ? 'true' : 'false'); return; }
      if (noHover.matches && !it.classList.contains('is-open')) { ev.preventDefault(); shut(it); it.classList.add('is-open'); }
    });
    Array.prototype.forEach.call(it.querySelectorAll('.nav-panel a'), function (a) { a.addEventListener('click', function () {
      shut(); if (header) { header.classList.remove('is-open'); header.classList.add('is-shut'); if (toggle) toggle.setAttribute('aria-expanded', 'false'); }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }); });
    it.addEventListener('mouseleave', function () { if (header) header.classList.remove('is-shut'); });
    it.addEventListener('mouseenter', function () { if (header) header.classList.remove('is-shut'); });
  });
  document.addEventListener('click', function (ev) { if (!ev.target.closest || !ev.target.closest('.nav-item')) shut(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { shut(); if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.nav-panel')) document.activeElement.closest('.nav-item').querySelector('.nav-top').focus(); } });
  // a link to a place on the page that is already open (the menu's application links, on the Applications page)
  function toHash() {
    var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1)); if (!el) return;
    // a step of a pinned story: stop where its picture is whole, with its text on the reading line
    var pin = el.classList.contains('step') && document.documentElement.classList.contains('live') && el.closest('.pin');
    if (pin) {
      var b = (el.querySelector('.step__text') || el).getBoundingClientRect(), f = parseFloat(getComputedStyle(pin).getPropertyValue('--focus')) || 0.5;
      window.scrollTo(0, Math.round(b.top + (window.scrollY || 0) + b.height / 2 - f * window.innerHeight));
    } else el.scrollIntoView();
  }
  window.addEventListener('hashchange', toHash); window.addEventListener('load', function () { setTimeout(toHash, 60); });

  // the header stays at the top of the window; it gets its hairline once the page has moved
  var lastY = window.scrollY || 0;
  function headerOnScroll() {
    var y = window.scrollY || 0;
    if (header && !header.classList.contains('is-open')) header.classList.toggle('is-raised', y > 8);
    lastY = y;
  }
  // ---- the contact form: its mail service is not connected yet ----
  Array.prototype.forEach.call(document.querySelectorAll('form[data-placeholder]'), function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var s = f.querySelector('.form-status'); if (s) s.textContent = 'This form is not connected yet. Nothing was sent.';
    });
  });

  // ---- a closer look: the figures become tabs ----
  Array.prototype.forEach.call(document.querySelectorAll('.look'), function (look) {
    var tabs = Array.prototype.slice.call(look.querySelectorAll('[role="tab"]')), panels = Array.prototype.slice.call(look.querySelectorAll('[role="tabpanel"]'));
    var list = look.querySelector('.look__tabs'); if (!tabs.length || !list) return;
    list.hidden = false;
    function show(n, focus) {
      tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === n ? 'true' : 'false'); t.tabIndex = i === n ? 0 : -1; });
      panels.forEach(function (p, i) { p.hidden = i !== n; if (i === n) Array.prototype.forEach.call(p.querySelectorAll('img'), function (im) { im.loading = 'eager'; }); });
      if (focus) tabs[n].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0;
        if (d) { ev.preventDefault(); show((i + d + tabs.length) % tabs.length, true); }
      });
    });
    show(0);
  });

  // ---- films play while they are on screen (and not at all when motion is reduced) ----
  var films = Array.prototype.slice.call(document.querySelectorAll('video'));
  if (films.length) {
    if (reduced || forceStill || !('IntersectionObserver' in window)) films.forEach(function (v) { v.controls = !forceStill; });
    else {
      var fo = new IntersectionObserver(function (en) { en.forEach(function (x) { var v = x.target; if (x.isIntersecting) { var pl = v.play(); if (pl && pl.catch) pl.catch(function () { v.controls = true; }); } else v.pause(); }); }, { threshold: 0.25 });
      films.forEach(function (v) { fo.observe(v); });
    }
  }

  // ---- canvases ----
  function fitCanvas(c) {
    var r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return null;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx: ctx, w: w, h: h };
  }
  function paint(c, name, t, e, time) { var m = M[name], k = m && fitCanvas(c); if (k) m.draw(k.ctx, k.w, k.h, t, e, time); }

  // still pictures that are drawn, not downloaded (used when a canvas stands alone, e.g. the hero)
  var solo = Array.prototype.slice.call(document.querySelectorAll('canvas[data-solo]'));
  function drawSolo(time) { solo.forEach(function (c) { paint(c, c.getAttribute('data-solo'), 0, 1, time); }); }

  // ---- scroll stories ----
  var pins = [];
  if (live) Array.prototype.forEach.call(document.querySelectorAll('.pin[data-moment]'), function (el) {
    var canvas = el.querySelector('.pin__stage canvas'), name = el.getAttribute('data-moment');
    if (!canvas || !M[name]) return;
    pins.push({ el: el, canvas: canvas, name: name, steps: Array.prototype.slice.call(el.querySelectorAll('.step')), rail: Array.prototype.slice.call(el.querySelectorAll('.rail [data-from]')),
      t: 0, e: 0, tt: 0, te: 0, centers: [], on: -1, dirty: true });
  });
  function measure() {
    var y = window.scrollY || 0;
    pins.forEach(function (p) {
      p.focus = parseFloat(getComputedStyle(p.el).getPropertyValue('--focus')) || 0.5;
      p.centers = p.steps.map(function (s) { var b = (s.querySelector('.step__text') || s).getBoundingClientRect(); return b.top + y + b.height / 2; });
      p.dirty = true;
    });
  }
  function target(p) {
    var vh = window.innerHeight, y = window.scrollY || 0, f = y + p.focus * vh, c = p.centers, n = c.length, t = 0, i;
    if (n) { if (f <= c[0]) t = 0; else if (f >= c[n - 1]) t = n - 1; else for (i = 0; i < n - 1; i++) if (f >= c[i] && f <= c[i + 1]) { t = i + (f - c[i]) / (c[i + 1] - c[i]); break; } }
    var top = p.el.getBoundingClientRect().top;
    p.tt = t; p.te = Math.max(0, Math.min(1, (vh * 0.92 - top) / (vh * 0.8)));
  }
  function render(p) {
    paint(p.canvas, p.name, p.t, p.e);
    var on = Math.round(p.t);
    if (on !== p.on) {
      p.on = on;
      p.steps.forEach(function (s, i) { s.classList.toggle('is-on', i === on); });
      p.rail.forEach(function (r) { var a = +r.getAttribute('data-from'), b = +r.getAttribute('data-to'); r.classList.toggle('is-on', on >= a && on <= b); });
    }
  }
  var gsap = window.gsap, ST = window.ScrollTrigger, useGsap = !!(gsap && ST);
  function visible(p) { var b = p.el.getBoundingClientRect(); return b.bottom > -200 && b.top < window.innerHeight + 200; }

  if (pins.length) {
    measure();
    if (useGsap) {
      gsap.registerPlugin(ST);
      pins.forEach(function (p) {
        var go = function () { target(p); gsap.to(p, { t: p.tt, e: p.te, duration: 0.5, ease: 'power2.out', overwrite: true, onUpdate: function () { render(p); } }); };
        ST.create({ trigger: p.el, start: 'top bottom', end: 'bottom top', onUpdate: go, onRefresh: function () { measure(); go(); } });
        target(p); p.t = p.tt; p.e = p.te; render(p);
      });
    } else {
      // the same, with a few lines of our own, if the library did not load
      var ticking = false;
      var loop = function () {
        var again = false;
        pins.forEach(function (p) {
          if (!visible(p) && !p.dirty) return;
          target(p);
          var dt = p.tt - p.t, de = p.te - p.e;
          if (Math.abs(dt) > 0.002 || Math.abs(de) > 0.002 || p.dirty) { p.t += dt * 0.16; p.e += de * 0.16; p.dirty = false; render(p); again = again || Math.abs(dt) > 0.002 || Math.abs(de) > 0.002; }
        });
        ticking = again; if (again) requestAnimationFrame(loop);
      };
      var kick = function () { if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
      window.addEventListener('scroll', kick, { passive: true });
      pins.forEach(function (p) { target(p); p.t = p.tt; p.e = p.te; render(p); });
      window.__binaKick = kick;
    }
  }

  // ---- the hero: alive while it is on screen ----
  var heroOn = false, heroRaf = 0, t0 = performance.now();
  function heroLoop(now) { if (!heroOn) return; drawSolo((now - t0) / 1000); heroRaf = requestAnimationFrame(heroLoop); }
  if (solo.length) {
    drawSolo(undefined);
    if (live && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { heroOn = en.some(function (x) { return x.isIntersecting; }); cancelAnimationFrame(heroRaf); if (heroOn) heroRaf = requestAnimationFrame(heroLoop); }).observe(solo[0]);
    }
  }

  // ---- things that slide in once ----
  if (live && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('[data-in]'), function (el) { io.observe(el); });
  }

  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { measure(); if (useGsap) ST.refresh(); else if (window.__binaKick) window.__binaKick(); pins.forEach(render); drawSolo(undefined); }, 120); });
  window.addEventListener('scroll', headerOnScroll, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); pins.forEach(render); drawSolo(undefined); });
  window.addEventListener('load', function () { measure(); if (useGsap) ST.refresh(); pins.forEach(function (p) { target(p); p.t = p.tt; p.e = p.te; render(p); }); });

  // for the tools that make the still pictures
  window.BinaSite = { paint: paint };
})();
