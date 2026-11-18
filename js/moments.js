/* The scroll stories. Each one is a function of t, the step the reader has reached (0, 1, 2 ... with
   everything in between), and e, how far the story has come into view (0 to 1). */
(function (root) {
  'use strict';
  var B = root.Bina, clamp = B.clamp, lerp = B.lerp, seg = B.seg, ease = B.ease, T = B.THEMES, TAU = Math.PI * 2;
  function win(t, a, b, c, d) { return ease(seg(t, a, b)) * (1 - ease(seg(t, c, d))); }
  function bg(ctx, w, h, colour) { ctx.clearRect(0, 0, w, h); if (colour) { ctx.fillStyle = colour; ctx.fillRect(0, 0, w, h); } }
  var frame = B.makeFrame(3, 2, 5, 6, 5.5, 3.4);

  var M = {};

  // Home: from a drawing to an answer, in four steps
  M.frame = { theme: 'steel', steps: 4, draw: function (ctx, w, h, t, e) {
    var th = T.steel; bg(ctx, w, h, th.bg);
    var wide = w / h > 1.15, r = wide ? { x: w * 0.06, y: h * 0.07, w: w * 0.88, h: h * 0.86 } : { x: w * 0.02, y: h * 0.03, w: w * 0.96, h: h * 0.94 };
    var col = ease(seg(t, 2.2, 2.85));
    B.drawFrame(ctx, r, frame, th, { build: ease(e), yaw: -0.66 + 0.05 * t, weight: ease(seg(t, 0.25, 0.95)), mesh: win(t, 0.35, 1, 1.5, 2),
      gravity: win(t, 1.15, 1.8, 2.15, 2.6), sag: win(t, 1.3, 1.9, 9, 10), lateral: win(t, 1.45, 2, 2.9, 3.4), amp: 1.6 * ease(seg(t, 2.1, 3)), colour: col });
    if (col > 0) B.drawScale(ctx, r.x + r.w * 0.04, r.y + r.h - 18, Math.min(180, r.w * 0.3), 6, th, 'displacement', col);
  } };

  // Desktop: model, members, analysis, results
  M.story = { theme: 'steel', steps: 8, draw: function (ctx, w, h, t, e) {
    var th = T.steel; bg(ctx, w, h, th.bg);
    var wide = w / h > 1.15;
    var secA = Math.max(win(t, 0.55, 1, 1.45, 1.8), ease(seg(t, 6.55, 6.95)));
    var pushA = win(t, 3.5, 3.78, 4.55, 4.8), thA = win(t, 4.72, 4.98, 5.42, 5.62), modeA = win(t, 2.55, 2.85, 3.4, 3.6);
    var inset = Math.max(secA, pushA, thA);
    var full = wide ? { x: w * 0.1, y: h * 0.08, w: w * 0.8, h: h * 0.84 } : { x: w * 0.02, y: h * 0.03, w: w * 0.96, h: h * 0.94 };
    var left = wide ? { x: w * 0.02, y: h * 0.08, w: w * 0.6, h: h * 0.84 } : { x: 0, y: h * 0.03, w: w * 0.64, h: h * 0.94 };
    var r = { x: lerp(full.x, left.x, inset), y: lerp(full.y, left.y, inset), w: lerp(full.w, left.w, inset), h: lerp(full.h, left.h, inset) };
    var box = wide ? { x: w * 0.61, y: h * 0.22, w: w * 0.35, h: Math.min(h * 0.56, w * 0.33) } : { x: w * 0.6, y: h * 0.16, w: w * 0.38, h: Math.min(h * 0.56, w * 0.5) };

    var tau = seg(t, 4.78, 5.42);
    var ampMode = 1.15 * Math.sin(TAU * 1.25 * (t - 2.5)) * win(t, 2.5, 2.8, 3.35, 3.6);
    var pushP = seg(t, 3.65, 4.4), ampPush = 1.6 * ease(pushP) * (1 - ease(seg(t, 4.55, 4.9)));
    var live = win(t, 4.74, 4.84, 5.42, 5.58), ampTh = 2.6 * (B.CURVES.th(tau) - 0.5) * live, shake = 0.55 * (B.CURVES.ground(tau) - 0.5) * live;
    var res = ease(seg(t, 5.58, 6)), col = ease(seg(t, 5.62, 6));
    var hinges = Math.max(0.3 * win(t, 0.6, 1, 1.5, 1.9), win(t, 3.5, 3.7, 4.6, 4.9) * (0.35 + 0.65 * seg(t, 3.8, 4.4)), ease(seg(t, 6.5, 6.9)));

    B.drawFrame(ctx, r, frame, th, { build: ease(e), yaw: -0.66 + 0.012 * t, weight: ease(seg(t, 0.4, 1)), mesh: win(t, 0.5, 1, 1.5, 2),
      gravity: win(t, 1.5, 2, 2.45, 2.8), sag: win(t, 1.6, 2, 2.45, 2.8), lateral: win(t, 3.5, 3.8, 4.5, 4.8),
      amp: ampMode + ampPush + ampTh + 1.6 * res, shake: shake, colour: col, hinges: hinges });

    if (modeA > 0) { ctx.globalAlpha = modeA; B.label(ctx, 'mode 1', r.x + r.w * 0.08, r.y + r.h * 0.1, th, Math.max(11, w / 90)); ctx.globalAlpha = 1; }
    if (col > 0) B.drawScale(ctx, r.x + r.w * 0.06, r.y + r.h - 16, Math.min(170, r.w * 0.3), 6, th, 'displacement', col);
    if (secA > 0.01) { ctx.save(); ctx.globalAlpha = secA; B.drawSection(ctx, box, th, { title: 'fibre section', colour: seg(t, 6.6, 7), angle: 0.35 }); ctx.restore(); }
    if (pushA > 0.01) { ctx.save(); ctx.globalAlpha = pushA; B.drawPlot(ctx, box, th, { kind: 'push', prog: pushP, title: 'base shear', xlabel: 'roof displacement' }); ctx.restore(); }
    if (thA > 0.01) { ctx.save(); ctx.globalAlpha = thA; B.drawPlot(ctx, box, th, { kind: 'th', under: 'ground', prog: tau, title: 'roof displacement', xlabel: 'time' }); ctx.restore(); }
  } };

  // the application range: one stage, one structure after another
  var KINDS = { rangeHome: ['buildings', 'bridges', 'domes', 'soil', 'isolation'],
    appBuildings: ['buildings', 'industrial', 'masonry'],
    appBridges: ['bridges', 'cables'],
    appSpecial: ['space', 'domes', 'tanks', 'towers', 'wind', 'nuclear'],
    appGround: ['soil', 'siteresponse', 'liquefaction', 'slopes', 'underground'],
    appSeismic: ['isolation', 'dampers', 'brb'] };
  function rangeMoment(list, theme, back) {
    return { theme: theme, steps: list.length, draw: function (ctx, w, h, t, e) {
      var th = T[theme]; bg(ctx, w, h, back);
      var r = { x: w * 0.06, y: h * 0.08, w: w * 0.88, h: h * 0.84 }, i = Math.min(list.length - 1, Math.floor(t)), f = t - i;
      var out = 1 - ease(seg(f, 0.5, 0.82)), inn = ease(seg(f, 0.62, 0.96));
      B.drawWire(ctx, r, B.structure(list[i]), th, { alpha: out, turn: 0.2 * f, draw: i === 0 ? ease(e) : 1 });
      if (i + 1 < list.length && inn > 0) B.drawWire(ctx, r, B.structure(list[i + 1]), th, { alpha: inn, turn: 0.2 * (f - 1), draw: lerp(0.55, 1, inn) });
    } };
  }
  M.rangeHome = rangeMoment(KINDS.rangeHome, 'light', '#F4F6F8');
  M.appBuildings = rangeMoment(KINDS.appBuildings, 'light', '#F4F6F8');
  M.appBridges = rangeMoment(KINDS.appBridges, 'light', '#FFFFFF');
  M.appSpecial = rangeMoment(KINDS.appSpecial, 'light', '#F4F6F8');
  M.appGround = rangeMoment(KINDS.appGround, 'steel', '#0E2030');
  M.appSeismic = rangeMoment(KINDS.appSeismic, 'light', '#FFFFFF');

  // Mobile: a floor becomes a plate, a result map, reinforcement, a checked calculation
  M.slab = { theme: 'forest', steps: 5, draw: function (ctx, w, h, t, e) {
    var th = T.forest; bg(ctx, w, h, th.bg);
    var wide = w / h > 1.15, sa = ease(seg(t, 3.35, 3.9));
    var full = wide ? { x: w * 0.08, y: h * 0.1, w: w * 0.84, h: h * 0.8 } : { x: w * 0.01, y: h * 0.06, w: w * 0.98, h: h * 0.88 };
    var left = wide ? { x: w * 0.02, y: h * 0.14, w: w * 0.6, h: h * 0.72 } : { x: 0, y: h * 0.02, w: w * 0.66, h: h * 0.7 };
    var r = { x: lerp(full.x, left.x, sa), y: lerp(full.y, left.y, sa), w: lerp(full.w, left.w, sa), h: lerp(full.h, left.h, sa) };
    var map = seg(t, 1.15, 2), scale = win(t, 1.5, 2, 2.4, 2.8);
    B.drawSlab(ctx, r, th, { build: ease(e), mesh: win(t, 0.45, 1, 2.5, 2.95), map: map, keep: 1 - 0.84 * ease(seg(t, 2.45, 3)), bars: seg(t, 2.5, 3.15), yaw: -0.42 + 0.03 * t });
    if (scale > 0) B.drawScale(ctx, r.x + r.w * 0.06, r.y + r.h - 10, Math.min(170, r.w * 0.3), 6, th, 'moment', scale);
    if (sa > 0.01) {
      var sw = wide ? Math.min(w * 0.27, h * 0.5) : w * 0.36, sh = sw * 1.36;
      B.drawSheet(ctx, { x: wide ? w * 0.66 : w * 0.62, y: (h - sh) / 2 + (1 - sa) * 30, w: sw, h: sh }, th, { alpha: sa, prog: seg(t, 3.55, 4) });
    }
  } };

  // Reliability: a hand result, the program's answer, and the difference between them
  M.check = { theme: 'light', steps: 3, draw: function (ctx, w, h, t, e) {
    var th = T.light; bg(ctx, w, h, '#FFFFFF');
    var px = Math.max(1, w / 520), x0 = w * 0.14, x1 = w * 0.88, y0 = h * 0.76, y1 = h * 0.2, i, n = 9, f = B.CURVES.push;
    ctx.strokeStyle = th.soft; ctx.lineWidth = px; ctx.beginPath(); ctx.moveTo(x0, y1 - 10); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 10, y0); ctx.stroke();
    var prog = ease(seg(t, 0.55, 1.25)), band = ease(seg(t, 1.5, 2));
    if (band > 0) { ctx.fillStyle = 'rgba(31,138,85,' + 0.14 * band + ')'; ctx.beginPath(); for (i = 0; i <= 60; i++) { var bx = lerp(x0, x1, i / 60), by = lerp(y0, y1, f(i / 60) * 1.03 + 0.012); if (i) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); } for (i = 60; i >= 0; i--) ctx.lineTo(lerp(x0, x1, i / 60), lerp(y0, y1, f(i / 60) * 0.97 - 0.012)); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#2F5D7C'; ctx.lineWidth = 2.4 * px; ctx.lineJoin = 'round'; ctx.beginPath();
    for (i = 0; i <= Math.round(120 * prog); i++) { var cx = lerp(x0, x1, i / 120), cy = lerp(y0, y1, f(i / 120)); if (i) ctx.lineTo(cx, cy); else ctx.moveTo(cx, cy); } ctx.stroke();
    for (i = 1; i <= n; i++) {                                                        // the hand results: open circles
      var a = clamp(ease(e) * (n + 2) - i), d = i / (n + 0.6), hx = lerp(x0, x1, d), hy = lerp(y0, y1, f(d) * (1 + 0.012 * Math.sin(i * 2.3)));
      ctx.globalAlpha = a; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = th.line; ctx.lineWidth = 1.6 * px; ctx.beginPath(); ctx.arc(hx, hy, 5.2 * px, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    B.label(ctx, 'hand result', x0 + 16 * px, y1 + 6 * px, th, 12 * px);
    ctx.strokeStyle = th.line; ctx.lineWidth = 1.6 * px; ctx.beginPath(); ctx.arc(x0 + 6 * px, y1 + 6 * px, 4.4 * px, 0, TAU); ctx.stroke();
    if (prog > 0) { ctx.globalAlpha = prog; B.label(ctx, 'program', x0 + 16 * px, y1 + 28 * px, th, 12 * px); ctx.strokeStyle = '#2F5D7C'; ctx.lineWidth = 2.4 * px; ctx.beginPath(); ctx.moveTo(x0, y1 + 28 * px); ctx.lineTo(x0 + 11 * px, y1 + 28 * px); ctx.stroke(); ctx.globalAlpha = 1; }
    if (band > 0) { ctx.globalAlpha = band; B.label(ctx, 'within tolerance', x1, y0 + 22 * px, { text: '#1F8A55' }, 12 * px, 'right'); ctx.globalAlpha = 1; }
  } };

  // the Home hero: the frame, alive (driven by time, not by the scroll)
  // the Home hero: one structure after another, each coloured like a result and swaying a little
  var HERO = [['buildings', 'Buildings'], ['bridges', 'Bridges'], ['domes', 'Domes and shells'], ['soil', 'Soil and foundations'], ['cables', 'Cable-stayed bridges'], ['isolation', 'Seismic isolation'], ['wind', 'Wind turbines']];
  // the home drawing: white lines on the dark stage (the glow is the canvas's own shadow, in the stylesheet)
  var WHITE = {}; for (var key in T.steel) WHITE[key] = T.steel[key];
  WHITE.line = '#F3F8FC'; WHITE.soft = 'rgba(243,248,252,.45)'; WHITE.node = '#FFFFFF';
  M.hero = { theme: 'steel', steps: 1, draw: function (ctx, w, h, t, e, time) {
    bg(ctx, w, h, null);
    var still = time === undefined, D = 5.5, k = still ? 0 : Math.floor(time / D) % HERO.length, f = still ? 0.5 : (time % D) / D;
    var s = still ? 0.9 : Math.sin(time * 0.9) * 0.55 + 0.25 * Math.sin(time * 2.1), fade = still ? 1 : ease(seg(f, 0, 0.1)) * (1 - ease(seg(f, 0.9, 1)));
    B.drawWire(ctx, { x: w * 0.02, y: h * 0.03, w: w * 0.96, h: h * 0.94 }, B.structure(HERO[k][0]), WHITE, { bold: 1.25, sway: 0.012 * s, turn: 0.1 * (f - 0.5), pad: 0.04 });
    if (!still) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
  } };

  // one white drawing per application category, for the row of tiles on the home page
  ['buildings', 'cables', 'domes', 'soil', 'isolation'].forEach(function (kind) {
    M['tile-' + kind] = { theme: 'steel', steps: 1, draw: function (ctx, w, h) { bg(ctx, w, h, null); B.drawWire(ctx, { x: 0, y: 0, w: w, h: h }, B.structure(kind), WHITE, { bold: 1.1, pad: 0.07 }); } };
  });

  root.BinaMoments = M;
})(typeof window !== 'undefined' ? window : this);
