/* Binacore illustrations: small structural models drawn as lines on a canvas.
   Everything here is abstract drawing made for the website; nothing is a picture of the products. */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(x, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }          // progress of t between a and b
  function ease(t) { t = clamp(t); return t * t * (3 - 2 * t); }

  // the engineering result-map ramp: blue, cyan, green, yellow, orange, red
  var STOPS = [[43, 91, 215], [25, 182, 201], [61, 190, 91], [233, 210, 41], [240, 138, 36], [216, 52, 42]];
  function ramp(v, a) {
    v = clamp(v) * (STOPS.length - 1);
    var i = Math.min(STOPS.length - 2, Math.floor(v)), f = v - i, p = STOPS[i], q = STOPS[i + 1];
    return 'rgba(' + Math.round(lerp(p[0], q[0], f)) + ',' + Math.round(lerp(p[1], q[1], f)) + ',' + Math.round(lerp(p[2], q[2], f)) + ',' + (a === undefined ? 1 : a) + ')';
  }

  var THEMES = {
    steel: { bg: '#0E2030', line: '#B4CDDF', soft: 'rgba(180,205,223,.28)', grid: 'rgba(180,205,223,.11)', node: '#F1F6FA', text: '#9DB6C8', accent: '#FFB813', panel: 'rgba(255,255,255,.045)', edge: 'rgba(180,205,223,.22)' },
    forest: { bg: '#0F211A', line: '#B5D6C3', soft: 'rgba(181,214,195,.28)', grid: 'rgba(181,214,195,.12)', node: '#F0F7F2', text: '#9CBBA9', accent: '#FFB813', panel: 'rgba(255,255,255,.05)', edge: 'rgba(181,214,195,.22)' },
    light: { bg: null, line: '#182430', soft: 'rgba(24,36,48,.26)', grid: 'rgba(24,36,48,.09)', node: '#182430', text: '#5B6875', accent: '#FFB813', panel: 'rgba(24,36,48,.035)', edge: 'rgba(24,36,48,.16)' }
  };

  // ---- camera: rotate about the vertical axis, look down by `pitch` ----
  function camera(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (p) { var xr = p[0] * cy - p[1] * sy, yr = p[0] * sy + p[1] * cy; return [xr, -(p[2] * cp + yr * sp)]; };
  }
  // a view: fits the given 3D points into a rectangle and returns the mapping to the screen
  function view(points, cam, r, pad) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, i, q;
    for (i = 0; i < points.length; i++) { q = cam(points[i]); if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    pad = pad === undefined ? 0.1 : pad;
    var s = Math.min(r.w * (1 - 2 * pad) / (x1 - x0 || 1), r.h * (1 - 2 * pad) / (y1 - y0 || 1));
    var ox = r.x + r.w / 2 - s * (x0 + x1) / 2, oy = r.y + r.h / 2 - s * (y0 + y1) / 2;
    var P = function (p) { var q = cam(p); return [ox + s * q[0], oy + s * q[1]]; };
    P.s = s; return P;
  }
  function line(ctx, a, b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function dot(ctx, p, r) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); }
  function arrow(ctx, a, b, head) {
    line(ctx, a, b);
    var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1; dx /= l; dy /= l;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - dx * head - dy * head * 0.5, b[1] - dy * head + dx * head * 0.5);
    ctx.lineTo(b[0] - dx * head + dy * head * 0.5, b[1] - dy * head - dx * head * 0.5); ctx.closePath(); ctx.fill();
  }
  function label(ctx, text, x, y, T, px, align) {
    ctx.save(); ctx.fillStyle = T.text; ctx.font = '500 ' + px + 'px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore();
  }

  // ---- the frame: a regular building frame, the main actor of the analysis story ----
  function makeFrame(nx, ny, ns, bx, by, hs) {
    var F = { nx: nx, ny: ny, ns: ns, bx: bx, by: by, hs: hs, H: ns * hs, nodes: [], cols: [], beams: [] }, i, j, k;
    F.id = function (i, j, k) { return k * (nx + 1) * (ny + 1) + j * (nx + 1) + i; };
    for (k = 0; k <= ns; k++) for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) F.nodes.push([i * bx, j * by, k * hs, i, j, k]);
    for (k = 0; k < ns; k++) {
      for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) F.cols.push([F.id(i, j, k), F.id(i, j, k + 1), k]);
      for (j = 0; j <= ny; j++) for (i = 0; i < nx; i++) F.beams.push([F.id(i, j, k + 1), F.id(i + 1, j, k + 1), k + 1, 'x']);
      for (j = 0; j < ny; j++) for (i = 0; i <= nx; i++) F.beams.push([F.id(i, j, k + 1), F.id(i, j + 1, k + 1), k + 1, 'y']);
    }
    return F;
  }
  function shape(z) { return Math.sin(clamp(z) * Math.PI / 2); }

  /* o: build 0..1 (members appear), weight 0..1 (thin lines to real members), mesh 0..1 (division points),
        amp (sway of the roof, in metres of the model), sag 0..1, colour 0..1, gravity 0..1, lateral 0..1,
        hinges 0..1 (0 none, up to .35 hollow, then they fill and warm), shake (ground offset) */
  function drawFrame(ctx, r, F, T, o) {
    var cam = camera(o.yaw === undefined ? -0.62 : o.yaw, o.pitch === undefined ? 0.42 : o.pitch);
    var pad = [[-1.5, -1.5, 0], [F.nx * F.bx + 1.5, F.ny * F.by + 1.5, 0], [0, 0, F.H * 1.04], [F.nx * F.bx, F.ny * F.by, F.H * 1.04], [F.nx * F.bx, 0, 0], [0, F.ny * F.by, 0]];
    var P = view(pad, cam, r, o.pad === undefined ? 0.11 : o.pad), s = P.s, px = Math.max(1, r.w / 620);
    var amp = o.amp || 0, sh = o.shake || 0, ref = o.ref || 1.6, i, n, a, b, t, k, u;
    function U(z) { return amp * shape(z / F.H) + sh; }
    function pos(nd) { return [nd[0] + U(nd[2]), nd[1], nd[2]]; }

    // ground grid
    ctx.lineWidth = px; ctx.strokeStyle = T.grid; ctx.globalAlpha = clamp((o.grid === undefined ? 1 : o.grid));
    var gx0 = -F.bx, gx1 = (F.nx + 1) * F.bx, gy0 = -F.by, gy1 = (F.ny + 1) * F.by, g;
    for (g = gx0; g <= gx1 + 0.01; g += F.bx / 2) line(ctx, P([g + sh, gy0, 0]), P([g + sh, gy1, 0]));
    for (g = gy0; g <= gy1 + 0.01; g += F.by / 2) line(ctx, P([gx0 + sh, g, 0]), P([gx1 + sh, g, 0]));
    ctx.globalAlpha = 1;

    var M = F.cols.length + F.beams.length, build = o.build === undefined ? 1 : o.build, m = 0;
    var w = lerp(1.1, 2.6, o.weight || 0) * px, col = clamp(o.colour || 0);
    ctx.lineCap = 'round';
    function vis() { var per = M / F.ns, kk = Math.floor(m / per); m++; return clamp(build * (F.ns + 1.2) - kk - ((m % per) / per) * 0.9); }
    function paint(p1, p2, v) {
      if (col < 1) { ctx.strokeStyle = T.line; ctx.globalAlpha = 1 - col * 0.85; line(ctx, p1, p2); }
      if (col > 0) { ctx.strokeStyle = ramp(v); ctx.globalAlpha = col; line(ctx, p1, p2); }
      ctx.globalAlpha = 1;
    }
    // storey by storey: columns (curved when the frame sways), then beams
    for (k = 0; k < F.ns; k++) {
      for (i = 0; i < F.cols.length; i++) {
        if (F.cols[i][2] !== k) continue;
        a = F.nodes[F.cols[i][0]]; b = F.nodes[F.cols[i][1]]; t = vis(); if (t <= 0) continue;
        ctx.lineWidth = w;
        var ua = U(a[2]), ub = U(b[2]), parts = amp ? 8 : 1, q, z0, z1, e0, e1;
        for (q = 0; q < parts; q++) {
          e0 = q / parts * t; e1 = (q + 1) / parts * t; z0 = lerp(a[2], b[2], e0); z1 = lerp(a[2], b[2], e1);
          paint(P([a[0] + lerp(ua, ub, e0 * e0 * (3 - 2 * e0)), a[1], z0]), P([a[0] + lerp(ua, ub, e1 * e1 * (3 - 2 * e1)), a[1], z1]), Math.abs(lerp(ua, ub, (e0 + e1) / 2) - sh) / ref);
        }
      }
      for (i = 0; i < F.beams.length; i++) {
        if (F.beams[i][2] !== k + 1) continue;
        a = F.nodes[F.beams[i][0]]; b = F.nodes[F.beams[i][1]]; t = vis(); if (t <= 0) continue;
        ctx.lineWidth = w * 0.92; u = U(a[2]);
        var sag = (o.sag || 0) * 0.1, bp = sag ? 6 : 1, pa = [a[0] + u, a[1], a[2]], pb = [lerp(a[0], b[0], t) + u, lerp(a[1], b[1], t), a[2]], f0, f1;
        for (q = 0; q < bp; q++) {
          f0 = q / bp; f1 = (q + 1) / bp;
          paint(P([lerp(pa[0], pb[0], f0), lerp(pa[1], pb[1], f0), a[2] - sag * 4 * f0 * (1 - f0)]), P([lerp(pa[0], pb[0], f1), lerp(pa[1], pb[1], f1), a[2] - sag * 4 * f1 * (1 - f1)]), Math.abs(u - sh) / ref);
        }
      }
    }
    // supports
    ctx.strokeStyle = T.line; ctx.lineWidth = px * 1.2; ctx.globalAlpha = clamp(build * 4);
    for (i = 0; i < F.nodes.length; i++) { n = F.nodes[i]; if (n[5] !== 0) continue; a = P([n[0] + sh, n[1], 0]); line(ctx, [a[0] - 5 * px, a[1] + 1.5 * px], [a[0] + 5 * px, a[1] + 1.5 * px]); }
    ctx.globalAlpha = 1;
    // nodes and division points
    var mesh = o.mesh || 0;
    if (mesh > 0) {
      ctx.fillStyle = T.node; ctx.globalAlpha = mesh * 0.9;
      for (i = 0; i < F.cols.length; i++) { a = F.nodes[F.cols[i][0]]; b = F.nodes[F.cols[i][1]]; for (t = 1; t < 4; t++) { var e = t / 4; dot(ctx, P([a[0] + lerp(U(a[2]), U(b[2]), e * e * (3 - 2 * e)), a[1], lerp(a[2], b[2], e)]), 1.25 * px); } }
      for (i = 0; i < F.beams.length; i++) { a = pos(F.nodes[F.beams[i][0]]); b = pos(F.nodes[F.beams[i][1]]); for (t = 1; t < 4; t++) dot(ctx, P([lerp(a[0], b[0], t / 4), lerp(a[1], b[1], t / 4), a[2]]), 1.25 * px); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = T.node; ctx.globalAlpha = clamp(build * 1.4 - 0.2) * (col ? 0.55 : 1);
    for (i = 0; i < F.nodes.length; i++) { n = F.nodes[i]; if (build * (F.ns + 1.2) >= n[5]) dot(ctx, P(pos(n)), (n[5] === 0 ? 1.9 : 1.7) * px); }
    ctx.globalAlpha = 1;

    // loads
    var gv = o.gravity || 0, lat = o.lateral || 0;
    ctx.strokeStyle = T.accent; ctx.fillStyle = T.accent; ctx.lineWidth = px * 1.15;
    if (gv > 0) {
      ctx.globalAlpha = gv;
      for (i = 0; i < F.beams.length; i++) {
        if (F.beams[i][3] !== 'x') continue; a = pos(F.nodes[F.beams[i][0]]); b = pos(F.nodes[F.beams[i][1]]);
        if (F.nodes[F.beams[i][0]][4] !== 0) continue;                                   // the front frame carries the picture
        for (t = 1; t <= 3; t++) { var bxm = lerp(a[0], b[0], t / 4); arrow(ctx, P([bxm, a[1], a[2] + F.hs * 0.34 * gv]), P([bxm, a[1], a[2] + 0.06]), 3.6 * px); }
      }
      ctx.globalAlpha = 1;
    }
    if (lat > 0) {
      ctx.globalAlpha = clamp(lat * 1.5);
      for (k = 1; k <= F.ns; k++) { n = pos(F.nodes[F.id(0, 0, k)]); var len = F.bx * 0.62 * (k / F.ns) * lerp(0.5, 1, lat); arrow(ctx, P([n[0] - 0.25 - len, n[1], n[2]]), P([n[0] - 0.25, n[1], n[2]]), 4.2 * px); }
      ctx.globalAlpha = 1;
    }
    // plastic hinges at the column bases and the beam ends of the front frame
    var hg = o.hinges || 0;
    if (hg > 0) {
      var fill = seg(hg, 0.35, 1), hr = 3.6 * px;
      function hinge(p, order) {
        var on = clamp(fill * 3.2 - order * 0.5);
        ctx.beginPath(); ctx.arc(p[0], p[1], hr, 0, TAU);
        ctx.globalAlpha = clamp(hg * 4); ctx.fillStyle = on > 0 ? ramp(lerp(0.5, 1, on)) : T.bg || '#fff'; ctx.fill();
        ctx.strokeStyle = on > 0 ? ramp(lerp(0.5, 1, on)) : T.line; ctx.lineWidth = px * 1.2; ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (i = 0; i <= F.nx; i++) { n = F.nodes[F.id(i, 0, 0)]; hinge(P([n[0] + U(0), n[1], 0.28]), 1.4); }
      for (i = 0; i < F.beams.length; i++) {
        var be = F.beams[i]; if (be[3] !== 'x' || F.nodes[be[0]][4] !== 0) continue;
        a = pos(F.nodes[be[0]]); b = pos(F.nodes[be[1]]);
        hinge(P([a[0] + 0.55, a[1], a[2]]), be[2] * 0.75); hinge(P([b[0] - 0.55, b[1], b[2]]), be[2] * 0.75);
      }
    }
    return P;
  }

  // ---- small insets: a plot that draws itself, a fibre section, a colour scale ----
  function panel(ctx, r, T, title) {
    var px = Math.max(1, r.w / 300);
    ctx.fillStyle = T.panel; ctx.strokeStyle = T.edge; ctx.lineWidth = px;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 10 * px); else ctx.rect(r.x, r.y, r.w, r.h); ctx.fill(); ctx.stroke();
    if (title) label(ctx, title, r.x + 14 * px, r.y + 18 * px, T, 11 * px);
    return px;
  }
  var CURVES = {
    push: function (d) { return (1 - Math.exp(-4.4 * d)) * 0.86 + 0.12 * d; },
    th: function (d) { var env = Math.pow(Math.sin(Math.PI * clamp(d * 1.02)), 0.75) * (1 - 0.35 * d); return 0.5 + 0.46 * env * (0.72 * Math.sin(TAU * 4.1 * d) + 0.28 * Math.sin(TAU * 9.3 * d + 1.1)); },
    ground: function (d) { var env = Math.pow(Math.sin(Math.PI * clamp(d)), 0.6); return 0.5 + 0.4 * env * (0.5 * Math.sin(TAU * 11 * d) + 0.3 * Math.sin(TAU * 17.3 * d + 2) + 0.2 * Math.sin(TAU * 29 * d + 0.5)); }
  };
  function drawPlot(ctx, r, T, o) {
    var px = panel(ctx, r, T, o.title), x0 = r.x + 26 * px, x1 = r.x + r.w - 16 * px, y0 = r.y + r.h - 28 * px, y1 = r.y + 36 * px, i, n = 140, f = CURVES[o.kind], prog = clamp(o.prog), mid = o.kind !== 'push';
    ctx.strokeStyle = T.soft; ctx.lineWidth = px;
    line(ctx, [x0, y1 - 4 * px], [x0, y0]); line(ctx, [x0, mid ? (y0 + y1) / 2 : y0], [x1, mid ? (y0 + y1) / 2 : y0]);
    label(ctx, o.xlabel, x1, y0 + 14 * px, T, 9.5 * px, 'right');
    if (o.under) { ctx.strokeStyle = T.soft; ctx.beginPath(); for (i = 0; i <= n * prog; i++) { var gxx = lerp(x0, x1, i / n), gyy = lerp(y0, y1, CURVES[o.under](i / n)); if (i) ctx.lineTo(gxx, gyy); else ctx.moveTo(gxx, gyy); } ctx.stroke(); }
    ctx.strokeStyle = o.colour || T.accent; ctx.lineWidth = 2 * px; ctx.lineJoin = 'round'; ctx.beginPath();
    var hx = x0, hy = lerp(y0, y1, f(0));
    for (i = 0; i <= Math.round(n * prog); i++) { hx = lerp(x0, x1, i / n); hy = lerp(y0, y1, f(i / n)); if (i) ctx.lineTo(hx, hy); else ctx.moveTo(hx, hy); }
    ctx.stroke(); ctx.fillStyle = T.node; dot(ctx, [hx, hy], 3.4 * px);
  }
  function drawSection(ctx, r, T, o) {
    var px = panel(ctx, r, T, o.title), cols = 8, rows = 11, pad = 34 * px, bw = Math.min(r.w - 2 * pad, (r.h - 2 * pad - 8 * px) * 0.74), bh = bw / 0.74;
    var x = r.x + (r.w - bw) / 2, y = r.y + (r.h - bh) / 2 + 8 * px, i, j, cw = bw / cols, ch = bh / rows, a = o.angle || 0, c = clamp(o.colour || 0);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var u = (i + 0.5) / cols - 0.5, v = (j + 0.5) / rows - 0.5, val = 0.5 + (v * Math.cos(a) + u * Math.sin(a)) * 1.05 * lerp(0.2, 1, o.level === undefined ? 1 : o.level);
      ctx.fillStyle = c > 0 ? ramp(val, lerp(0.12, 0.95, c)) : T.panel; ctx.fillRect(x + i * cw + 0.6 * px, y + j * ch + 0.6 * px, cw - 1.2 * px, ch - 1.2 * px);
    }
    ctx.strokeStyle = T.line; ctx.lineWidth = 1.4 * px; ctx.strokeRect(x, y, bw, bh);
    ctx.strokeStyle = T.soft; ctx.lineWidth = px; ctx.strokeRect(x + cw * 0.75, y + ch * 0.75, bw - cw * 1.5, bh - ch * 1.5);
    var bars = [[0, 0], [1 / 3, 0], [2 / 3, 0], [1, 0], [0, 1], [1 / 3, 1], [2 / 3, 1], [1, 1], [0, 1 / 3], [0, 2 / 3], [1, 1 / 3], [1, 2 / 3]];
    for (i = 0; i < bars.length; i++) {
      var bxp = x + cw * 0.75 + bars[i][0] * (bw - cw * 1.5), byp = y + ch * 0.75 + bars[i][1] * (bh - ch * 1.5);
      ctx.fillStyle = c > 0 ? ramp(0.5 + ((bars[i][1] - 0.5) * Math.cos(a) + (bars[i][0] - 0.5) * Math.sin(a)) * 1.3, 1) : T.line; dot(ctx, [bxp, byp], 4.2 * px);
      ctx.strokeStyle = T.bg || '#fff'; ctx.lineWidth = px; ctx.beginPath(); ctx.arc(bxp, byp, 4.2 * px, 0, TAU); ctx.stroke();
    }
  }
  function drawScale(ctx, x, y, w, h, T, text, a) {
    var i, n = 40; ctx.globalAlpha = clamp(a);
    for (i = 0; i < n; i++) { ctx.fillStyle = ramp(i / (n - 1)); ctx.fillRect(x + w * i / n, y, w / n + 0.6, h); }
    label(ctx, text, x, y - h * 1.6, T, Math.max(10, h * 1.5)); ctx.globalAlpha = 1;
  }

  // ---- the application range: one generator per kind of structure ----
  function S() { return { pts: [], lines: [], dots: [] }; }
  function N(s, x, y, z) { s.pts.push([x, y, z]); return s.pts.length - 1; }
  function L(s, a, b, w, hot) { s.lines.push([a, b, w === undefined ? 1 : w, hot ? 1 : 0]); }       // hot: drawn in the accent colour
  // the frame the three seismic drawings share (3 x 2 bays, 5 storeys), and its devices
  function protectedFrame(s, lift) {
    var F = makeFrame(3, 2, 5, 6, 6, 3.4), i, j;
    for (i = 0; i < F.nodes.length; i++) N(s, F.nodes[i][0], F.nodes[i][1], F.nodes[i][2] + lift);
    for (i = 0; i < F.cols.length; i++) L(s, F.cols[i][0], F.cols[i][1], 1.5);
    for (i = 0; i < F.beams.length; i++) L(s, F.beams[i][0], F.beams[i][1], 0.9);
    if (lift) { for (j = 0; j <= 2; j++) for (i = 0; i < 3; i++) L(s, F.id(i, j, 0), F.id(i + 1, j, 0), 1.5); for (j = 0; j < 2; j++) for (i = 0; i <= 3; i++) L(s, F.id(i, j, 0), F.id(i, j + 1, 0), 1.5); }
    return F;
  }
  function isolators(s, F, lift) {                                                       // under every column: two plates and the rubber between them
    for (var i = 0; i < 12; i++) (function (c, top) {
      var lo = [], hi = [], h = 0.95, r = 0.6, q, sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      sq.forEach(function (o) { lo.push(N(s, c[0] + o[0] * h, c[1] + o[1] * h, 0.45)); hi.push(N(s, c[0] + o[0] * h, c[1] + o[1] * h, lift - 0.35)); });
      for (q = 0; q < 4; q++) { L(s, lo[q], lo[(q + 1) % 4], 1.1); L(s, hi[q], hi[(q + 1) % 4], 1.1); }
      sq.forEach(function (o) { L(s, N(s, c[0] + o[0] * r, c[1] + o[1] * r, 0.45), N(s, c[0] + o[0] * r, c[1] + o[1] * r, lift - 0.35), 1.5, 1); });
      L(s, N(s, c[0], c[1], lift - 0.35), top, 1.5); L(s, N(s, c[0], c[1], 0), N(s, c[0], c[1], 0.45), 1.5);
    })(F.nodes[i], i);
  }
  function moat(s, lift) {
    var top = [], bot = [], q; [[-3.2, -3.2], [21.2, -3.2], [21.2, 15.2], [-3.2, 15.2]].forEach(function (o) { top.push(N(s, o[0], o[1], lift)); bot.push(N(s, o[0], o[1], 0)); });
    for (q = 0; q < 4; q++) { L(s, top[q], top[(q + 1) % 4], 0.9); L(s, bot[q], bot[(q + 1) % 4], 0.6); L(s, top[q], bot[q], 0.6); }
  }
  function device(s, a, b, f0, f1) {                                                     // a brace from a to b whose middle part (f0 to f1) is the device
    function P(f) { return N(s, lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)); }
    L(s, P(0), P(f0), 1.5); L(s, P(f0), P(f1), 3, 1); L(s, P(f1), P(1), 1.5);
  }

  var RANGE = {
    buildings: function () {
      var F = makeFrame(3, 2, 6, 6, 5.5, 3.4), s = S(), i;
      for (i = 0; i < F.nodes.length; i++) N(s, F.nodes[i][0], F.nodes[i][1], F.nodes[i][2]);
      for (i = 0; i < F.cols.length; i++) L(s, F.cols[i][0], F.cols[i][1], 1.5);
      for (i = 0; i < F.beams.length; i++) L(s, F.beams[i][0], F.beams[i][1], 1);
      s.yaw = -0.62; return s;
    },
    industrial: function () {
      var s = S(), fr = [], i, y, W = 20, hE = 7, hA = 10.5;
      for (i = 0; i < 6; i++) { y = i * 6; fr.push([N(s, 0, y, 0), N(s, 0, y, hE), N(s, W / 4, y, (hE + hA) / 2), N(s, W / 2, y, hA), N(s, 3 * W / 4, y, (hE + hA) / 2), N(s, W, y, hE), N(s, W, y, 0)]); }
      for (i = 0; i < 6; i++) { for (y = 0; y < 6; y++) L(s, fr[i][y], fr[i][y + 1], 1.6); if (i) for (y = 1; y < 6; y++) L(s, fr[i - 1][y], fr[i][y], 0.8); }
      [[0, 1], [4, 5]].forEach(function (b) { for (y = 1; y < 5; y++) { L(s, fr[b[0]][y], fr[b[1]][y + 1], 0.6); L(s, fr[b[0]][y + 1], fr[b[1]][y], 0.6); } L(s, fr[b[0]][0], fr[b[1]][1], 0.6); L(s, fr[b[0]][1], fr[b[1]][0], 0.6); L(s, fr[b[0]][6], fr[b[1]][5], 0.6); L(s, fr[b[0]][5], fr[b[1]][6], 0.6); });
      s.yaw = -0.72; return s;
    },
    space: function () {
      var s = S(), n = 7, c = 3, h = 2.4, top = [], bot = [], i, j;
      for (j = 0; j <= n; j++) { top.push([]); for (i = 0; i <= n; i++) top[j].push(N(s, i * c, j * c, h)); }
      for (j = 0; j < n; j++) { bot.push([]); for (i = 0; i < n; i++) bot[j].push(N(s, (i + 0.5) * c, (j + 0.5) * c, 0)); }
      for (j = 0; j <= n; j++) for (i = 0; i <= n; i++) { if (i < n) L(s, top[j][i], top[j][i + 1], 1.3); if (j < n) L(s, top[j][i], top[j + 1][i], 1.3); }
      for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
        if (i < n - 1) L(s, bot[j][i], bot[j][i + 1], 1); if (j < n - 1) L(s, bot[j][i], bot[j + 1][i], 1);
        L(s, bot[j][i], top[j][i], 0.6); L(s, bot[j][i], top[j][i + 1], 0.6); L(s, bot[j][i], top[j + 1][i], 0.6); L(s, bot[j][i], top[j + 1][i + 1], 0.6);
      }
      [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1]].forEach(function (q) { L(s, bot[q[1]][q[0]], N(s, (q[0] + 0.5) * c, (q[1] + 0.5) * c, -7), 1.8); });
      s.yaw = -0.5; s.pitch = 0.36; return s;
    },
    domes: function () {
      var s = S(), R = 14, nt = 20, nr = 7, rings = [], i, j, phi, th;
      for (j = 0; j < nr; j++) { phi = (j / nr) * (Math.PI / 2) * 0.96; rings.push([]); for (i = 0; i < nt; i++) { th = TAU * i / nt; rings[j].push(N(s, R * Math.cos(phi) * Math.cos(th), R * Math.cos(phi) * Math.sin(th), R * Math.sin(phi))); } }
      var crown = N(s, 0, 0, R);
      for (j = 0; j < nr; j++) for (i = 0; i < nt; i++) {
        L(s, rings[j][i], rings[j][(i + 1) % nt], 1.2);
        if (j < nr - 1) { L(s, rings[j][i], rings[j + 1][i], 1.2); L(s, rings[j][i], rings[j + 1][(i + 1) % nt], 0.6); } else L(s, rings[j][i], crown, 1);
      }
      s.yaw = 0.2; s.pitch = 0.4; return s;
    },
    bridges: function () {                                                             // a deck arch bridge: two ribs, spandrel columns, approach spans
      var s = S(), n = 16, bay = 5.5, span = n * bay, rise = 21, zd = 25, wd = 9, app = 3, arch = [[], []], deck = [[], []], i, y, x, z;
      for (i = -app; i <= n + app; i++) for (y = 0; y < 2; y++) deck[y].push(N(s, i * bay, y * wd, zd));
      for (i = 0; i <= n; i++) { z = rise * (1 - Math.pow(2 * i / n - 1, 2)); for (y = 0; y < 2; y++) arch[y].push(N(s, i * bay, y * wd, z)); }
      var m = deck[0].length;
      for (i = 0; i < m; i++) { L(s, deck[0][i], deck[1][i], 0.6); if (i < m - 1) { L(s, deck[0][i], deck[0][i + 1], 2.1); L(s, deck[1][i], deck[1][i + 1], 2.1); if (i % 2 === 0) L(s, deck[0][i], deck[1][i + 1], 0.3); else L(s, deck[1][i], deck[0][i + 1], 0.3); } }
      for (i = 0; i <= n; i++) {
        for (y = 0; y < 2; y++) { if (i < n) L(s, arch[y][i], arch[y][i + 1], 2.6); L(s, arch[y][i], deck[y][i + app], i === 0 || i === n ? 1.7 : 0.9); }
        if (i > 0 && i < n) L(s, arch[0][i], arch[1][i], 0.8);
        if (i > 0 && i < n - 1) { if (i % 2) L(s, arch[0][i], arch[1][i + 1], 0.4); else L(s, arch[1][i], arch[0][i + 1], 0.4); }
      }
      [-app, n + app].forEach(function (k) { x = k * bay; var a = N(s, x, 0, zd - 7), b = N(s, x, wd, zd - 7); L(s, deck[0][k + app], a, 1.7); L(s, deck[1][k + app], b, 1.7); L(s, a, b, 1.2); });
      for (y = 0; y < 2; y++) { s.dots.push(arch[y][0], arch[y][n]); }
      var g = [N(s, -bay * (app + 1.2), -5, zd - 7), N(s, -bay * 0.4, -5, 0), N(s, span + bay * 0.4, -5, 0), N(s, span + bay * (app + 1.2), -5, zd - 7)];   // the valley
      L(s, g[0], g[1], 0.5); L(s, g[1], g[2], 0.5); L(s, g[2], g[3], 0.5);
      s.yaw = -0.5; s.pitch = 0.22; s.big = 5; return s;
    },
    soil: function () {                                                                // a frame on piles, in layered soil cut open at the front
      var F = makeFrame(2, 1, 4, 7, 7, 3.5), s = S(), i, j, z, x;
      var x0 = -9, x1 = 23, y0 = -4.5, y1 = 11.5, D = 15, nx = 16, nz = 7, pile = 11.5, g = [];
      function layer(xx, q) { return -D * q / nz + (q > 0 && q < nz ? 0.55 * Math.sin(xx * 0.32 + q * 1.3) : 0); }      // the strata are not quite level
      for (i = 0; i < F.nodes.length; i++) N(s, F.nodes[i][0], F.nodes[i][1], F.nodes[i][2]);
      for (i = 0; i < F.cols.length; i++) L(s, F.cols[i][0], F.cols[i][1], 1.6);
      for (i = 0; i < F.beams.length; i++) L(s, F.beams[i][0], F.beams[i][1], 1);
      for (i = 0; i < 6; i++) {                                                           // a cap and three piles under every column, springs along each pile
        var c = F.nodes[i], cap = [N(s, c[0] - 1.5, c[1] - 1.5, 0), N(s, c[0] + 1.5, c[1] - 1.5, 0), N(s, c[0] + 1.5, c[1] + 1.5, 0), N(s, c[0] - 1.5, c[1] + 1.5, 0)];
        for (j = 0; j < 4; j++) L(s, cap[j], cap[(j + 1) % 4], 1.3);
        [[-1, -1], [1, -1], [0, 1]].forEach(function (o, q) {
          var px = c[0] + o[0], py = c[1] + o[1]; L(s, N(s, px, py, 0), N(s, px, py, -pile), 1.9);
          if (c[1] === 0 && q < 2) for (z = -1.4; z > -pile; z -= 1.45) L(s, N(s, px, py, z), N(s, px + (o[0] < 0 ? -1.15 : 1.15), py, z), 0.9, 1);
        });
      }
      for (j = 0; j <= nz; j++) { g.push([]); for (i = 0; i <= nx; i++) { x = x0 + (x1 - x0) * i / nx; g[j].push(N(s, x, y0, layer(x, j))); } }
      for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) {
        if (i < nx) L(s, g[j][i], g[j][i + 1], j === 0 || j === nz ? 1.2 : j === 2 || j === 5 ? 0.9 : 0.32);
        if (j < nz) L(s, g[j][i], g[j + 1][i], i === 0 || i === nx ? 1.2 : 0.32);
      }
      var b = [N(s, x0, y1, 0), N(s, x1, y1, 0), N(s, x1, y1, -D), N(s, x1, y1, layer(x1, 2)), N(s, x1, y1, layer(x1, 5))];
      L(s, g[0][0], b[0], 0.7); L(s, b[0], b[1], 0.7); L(s, g[0][nx], b[1], 0.7); L(s, b[1], b[2], 0.7); L(s, g[nz][nx], b[2], 0.7); L(s, g[2][nx], b[3], 0.5); L(s, g[5][nx], b[4], 0.5);
      s.yaw = -0.56; s.pitch = 0.3; return s;
    },
    slopes: function () {
      var s = S(), nx = 16, nz = 6, W = 40, D = 12, ny = 2, by = 5, g = [], i, j, k;
      function top(x) { var c = Math.abs(x - W / 2); return c < 5 ? 5 : c < 13 ? 5 * (13 - c) / 8 : 0; }               // an embankment on level ground
      for (k = 0; k <= ny; k++) { g.push([]); for (j = 0; j <= nz; j++) { g[k].push([]); for (i = 0; i <= nx; i++) { var x = W * i / nx, zt = top(x); g[k][j].push(N(s, x, k * by, -D + (D + zt) * j / nz)); } } }
      for (k = 0; k <= ny; k++) for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) {
        var front = k === 0, w = front ? (j === nz || j === 0 || i === 0 || i === nx ? 1.5 : 0.7) : 0;
        if (front) { if (i < nx) L(s, g[k][j][i], g[k][j][i + 1], w); if (j < nz) L(s, g[k][j][i], g[k][j + 1][i], w); }
        if (k < ny && (j === nz || ((i === 0 || i === nx) && (j === 0)))) L(s, g[k][j][i], g[k + 1][j][i], 0.5);
        if (k === ny && j === nz && i < nx) L(s, g[k][j][i], g[k][j][i + 1], 0.9);
      }
      L(s, g[ny][0][nx], g[ny][nz][nx], 0.9); L(s, g[ny][0][nx], g[0][0][nx], 0.5);
      s.yaw = -0.32; s.pitch = 0.3; return s;
    },
    cables: function () {
      var s = S(), Lb = 96, nx = 24, d = [[], []], i, y, x;
      for (i = 0; i <= nx; i++) { x = Lb * i / nx; for (y = 0; y < 2; y++) d[y].push(N(s, x, y * 8, 0)); }
      for (i = 0; i <= nx; i++) { if (i < nx) { L(s, d[0][i], d[0][i + 1], 1.8); L(s, d[1][i], d[1][i + 1], 1.8); } L(s, d[0][i], d[1][i], 0.6); }
      [7, 17].forEach(function (k) {                                                   // two A-shaped pylons, the stays in a fan
        x = Lb * k / nx;
        var top = N(s, x, 4, 25), m0 = N(s, x, -0.9, 0), m1 = N(s, x, 8.9, 0), j;
        L(s, N(s, x, -0.9, -10), m0, 2.2); L(s, N(s, x, 8.9, -10), m1, 2.2); L(s, m0, top, 2.2); L(s, m1, top, 2.2); L(s, m0, m1, 1.4);
        for (j = 1; j <= 5; j++) for (y = 0; y < 2; y++) { L(s, top, d[y][k - j], 0.42); L(s, top, d[y][k + j], 0.42); }
      });
      s.yaw = -0.42; s.pitch = 0.28; return s;
    },
    tanks: function () {
      var s = S(), R = 9, H = 12, nt = 24, nz = 6, rings = [], i, j, th;
      for (j = 0; j <= nz; j++) { rings.push([]); for (i = 0; i < nt; i++) { th = TAU * i / nt; rings[j].push(N(s, R * Math.cos(th), R * Math.sin(th), H * j / nz)); } }
      var apex = N(s, 0, 0, H + 3.2);
      for (j = 0; j <= nz; j++) for (i = 0; i < nt; i++) {
        L(s, rings[j][i], rings[j][(i + 1) % nt], j === 0 || j === nz ? 1.6 : 0.7);
        if (j < nz) L(s, rings[j][i], rings[j + 1][i], 0.7); else if (i % 2 === 0) L(s, rings[j][i], apex, 0.6);
      }
      for (i = 0; i < nt; i += 3) s.dots.push(rings[0][i]);                             // the anchors
      s.yaw = 0.2; s.pitch = 0.36; return s;
    },
    underground: function () {
      var s = S(), W = 30, D = 16, nx = 15, nz = 8, by = 12, cx = 15, cz = -8.5, R = 3.7, g = [], n = 20, ring = [[], []], i, j, k;
      function inside(x, z) { return (x - cx) * (x - cx) + (z - cz) * (z - cz) < R * R * 1.08; }
      for (j = 0; j <= nz; j++) { g.push([]); for (i = 0; i <= nx; i++) g[j].push(N(s, W * i / nx, 0, -D * j / nz)); }
      for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) {
        var x = W * i / nx, z = -D * j / nz, e = (j === 0 || j === nz) ? 1.4 : 0.6, f = (i === 0 || i === nx) ? 1.4 : 0.6;
        if (i < nx && !inside(x, z) && !inside(x + W / nx, z)) L(s, g[j][i], g[j][i + 1], e);
        if (j < nz && !inside(x, z) && !inside(x, z - D / nz)) L(s, g[j][i], g[j + 1][i], f);
      }
      for (k = 0; k < 2; k++) for (i = 0; i < n; i++) ring[k].push(N(s, cx + R * Math.cos(TAU * i / n), k * by, cz + R * Math.sin(TAU * i / n)));
      for (i = 0; i < n; i++) { L(s, ring[0][i], ring[0][(i + 1) % n], 2.1); L(s, ring[1][i], ring[1][(i + 1) % n], 0.8); if (i % 2 === 0) L(s, ring[0][i], ring[1][i], 0.5); }
      var b0 = N(s, 0, by, 0), b1 = N(s, W, by, 0), b2 = N(s, W, by, -D);
      L(s, g[0][0], b0, 0.6); L(s, g[0][nx], b1, 0.6); L(s, b0, b1, 0.9); L(s, b1, b2, 0.9); L(s, g[nz][nx], b2, 0.6);
      s.yaw = -0.34; s.pitch = 0.3; return s;
    },
    towers: function () {                                                              // a lattice tower with its cross-arms
      var s = S(), n = 12, H = 48, lv = [], i, k;
      for (k = 0; k <= n; k++) { var z = H * k / n, h = lerp(6.4, 1.1, Math.pow(k / n, 0.72)); lv.push([N(s, -h, -h, z), N(s, h, -h, z), N(s, h, h, z), N(s, -h, h, z)]); }
      for (k = 0; k <= n; k++) for (i = 0; i < 4; i++) { L(s, lv[k][i], lv[k][(i + 1) % 4], 0.8); if (k < n) { L(s, lv[k][i], lv[k + 1][i], 1.9); L(s, lv[k][i], lv[k + 1][(i + 1) % 4], 0.55); L(s, lv[k][(i + 1) % 4], lv[k + 1][i], 0.55); } }
      [[7, 11], [9, 8.5], [11, 6]].forEach(function (a) {
        var k0 = a[0], zz = H * k0 / n; [-1, 1].forEach(function (sd) {
          var tip = N(s, sd * a[1], 0, zz + 0.6), lo = sd < 0 ? [lv[k0][0], lv[k0][3]] : [lv[k0][1], lv[k0][2]], up = sd < 0 ? [lv[k0 + 1][0], lv[k0 + 1][3]] : [lv[k0 + 1][1], lv[k0 + 1][2]];
          L(s, lo[0], tip, 1.1); L(s, lo[1], tip, 1.1); L(s, up[0], tip, 0.7); L(s, up[1], tip, 0.7); s.dots.push(tip);
        });
      });
      L(s, N(s, 0, 0, H), N(s, 0, 0, H + 5), 1.2);
      s.yaw = -0.42; s.pitch = 0.2; s.big = 3.2; return s;
    },
    masonry: function () {
      var F = makeFrame(3, 1, 3, 5.5, 5, 3.3), s = S(), i, k, q;
      for (i = 0; i < F.nodes.length; i++) N(s, F.nodes[i][0], F.nodes[i][1], F.nodes[i][2]);
      for (i = 0; i < F.cols.length; i++) L(s, F.cols[i][0], F.cols[i][1], 1.6);
      for (i = 0; i < F.beams.length; i++) L(s, F.beams[i][0], F.beams[i][1], 1.1);
      for (k = 0; k < 3; k++) for (i = 0; i < 3; i++) {
        var x0 = i * 5.5, z0 = k * 3.3, open = (i === 1 && k === 0);
        if (open) continue;
        if ((i + k) % 2 === 0) { for (q = 1; q < 6; q++) L(s, N(s, x0, 0, z0 + 3.3 * q / 6), N(s, x0 + 5.5, 0, z0 + 3.3 * q / 6), 0.5); for (q = 0; q < 6; q++) for (var c = 1; c < 5; c++) { var xx = x0 + 5.5 * (c - (q % 2 ? 0.5 : 0)) / 4.5; if (xx > x0 + 0.2 && xx < x0 + 5.3) L(s, N(s, xx, 0, z0 + 3.3 * q / 6), N(s, xx, 0, z0 + 3.3 * (q + 1) / 6), 0.4); } }
        else { L(s, F.id(i, 0, k), F.id(i + 1, 0, k + 1), 1.9); L(s, F.id(i + 1, 0, k), F.id(i, 0, k + 1), 0.7); }
      }
      s.yaw = -0.5; s.pitch = 0.32; return s;
    },
    wind: function () {                                                                // a wind turbine: tapered tower, nacelle, three blades, its foundation
      var s = S(), H = 70, n = 10, m = 10, rings = [], i, k, th;
      for (k = 0; k <= n; k++) { var r = lerp(3.4, 1.7, k / n), z = H * k / n; rings.push([]); for (i = 0; i < m; i++) { th = TAU * i / m; rings[k].push(N(s, r * Math.cos(th), r * Math.sin(th), z)); } }
      for (k = 0; k <= n; k++) for (i = 0; i < m; i++) { L(s, rings[k][i], rings[k][(i + 1) % m], k === 0 || k === n ? 1.2 : 0.5); if (k < n) L(s, rings[k][i], rings[k + 1][i], i % 5 === 0 ? 1.6 : 0.6); }
      var lo = [], hi = []; [[-1.8, -4.5], [1.8, -4.5], [1.8, 5], [-1.8, 5]].forEach(function (o) { lo.push(N(s, o[0], o[1], H)); hi.push(N(s, o[0], o[1], H + 3.4)); });
      for (i = 0; i < 4; i++) { L(s, lo[i], lo[(i + 1) % 4], 1.2); L(s, hi[i], hi[(i + 1) % 4], 1.2); L(s, lo[i], hi[i], 1.2); }
      var hz = H + 1.7, hub = N(s, 0, -6.4, hz); L(s, N(s, 0, -4.5, hz), hub, 2);
      for (k = 0; k < 3; k++) {
        th = TAU * k / 3 + 0.35; var R = 34, c = Math.cos(th), sn = Math.sin(th);
        var tip = N(s, R * sn, -6.4, hz + R * c), a = N(s, 7 * sn + 1.6 * c, -6.4, hz + 7 * c - 1.6 * sn), b = N(s, 7 * sn - 1.1 * c, -6.4, hz + 7 * c + 1.1 * sn);
        L(s, hub, a, 1.2); L(s, hub, b, 1.2); L(s, a, tip, 1.2); L(s, b, tip, 1.2); L(s, hub, tip, 0.35);
      }
      var f = []; for (i = 0; i < 8; i++) { th = TAU * i / 8 + TAU / 16; f.push(N(s, 9.5 * Math.cos(th), 9.5 * Math.sin(th), 0)); }
      for (i = 0; i < 8; i++) { L(s, f[i], f[(i + 1) % 8], 1.2); L(s, f[i], rings[0][Math.round(i * m / 8) % m], 0.4); }
      s.dots.push(hub); s.yaw = -0.5; s.pitch = 0.16; s.big = 3.4; return s;
    },
    nuclear: function () {                                                             // a containment (cylinder and dome) beside its auxiliary building
      var s = S(), R = 11, Hc = 22, m = 20, lv = [], rings = [], i, k, th;
      for (k = 0; k <= 5; k++) lv.push([R, Hc * k / 5]);
      for (k = 1; k <= 5; k++) { var a = (Math.PI / 2) * k / 5; lv.push([R * Math.cos(a), Hc + R * Math.sin(a)]); }
      for (k = 0; k < lv.length; k++) { rings.push([]); if (lv[k][0] < 0.01) { rings[k].push(N(s, 0, 0, lv[k][1])); continue; } for (i = 0; i < m; i++) { th = TAU * i / m; rings[k].push(N(s, lv[k][0] * Math.cos(th), lv[k][0] * Math.sin(th), lv[k][1])); } }
      for (k = 0; k < lv.length; k++) for (i = 0; i < m; i++) {
        var one = rings[k].length === 1;
        if (!one) L(s, rings[k][i], rings[k][(i + 1) % m], k === 0 || k === 5 ? 1.5 : 0.55);
        if (k + 1 < lv.length) L(s, rings[k][one ? 0 : i], rings[k + 1][rings[k + 1].length === 1 ? 0 : i], i % 2 ? 0.4 : 0.8);
      }
      function box(x0, x1, y0, y1, h, nx) {
        var lo = [N(s, x0, y0, 0), N(s, x1, y0, 0), N(s, x1, y1, 0), N(s, x0, y1, 0)], hi = [N(s, x0, y0, h), N(s, x1, y0, h), N(s, x1, y1, h), N(s, x0, y1, h)], q;
        for (q = 0; q < 4; q++) { L(s, lo[q], lo[(q + 1) % 4], 0.9); L(s, hi[q], hi[(q + 1) % 4], 1.4); L(s, lo[q], hi[q], 1.4); }
        for (q = 1; q < nx; q++) { var x = lerp(x0, x1, q / nx); L(s, N(s, x, y0, 0), N(s, x, y0, h), 0.6); L(s, N(s, x, y0, h), N(s, x, y1, h), 0.5); L(s, N(s, x, y1, 0), N(s, x, y1, h), 0.45); }
      }
      box(13, 44, -9, 9, 13, 5); box(-9, 9, -21, -12.5, 9, 3);
      var raft = [N(s, -15, -24, 0), N(s, 47, -24, 0), N(s, 47, 14, 0), N(s, -15, 14, 0)]; for (i = 0; i < 4; i++) L(s, raft[i], raft[(i + 1) % 4], 0.5);
      s.yaw = -0.62; s.pitch = 0.3; return s;
    },
    siteresponse: function () {                                                        // a layered deposit; one soil column picked out and sheared by the motion at its base
      var s = S(), W = 32, D = 20, nx = 16, nz = 10, by = 7, g = [], i, j, z, u;
      for (j = 0; j <= nz; j++) { g.push([]); for (i = 0; i <= nx; i++) g[j].push(N(s, W * i / nx, 0, -D * j / nz)); }
      for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) {
        if (i < nx) L(s, g[j][i], g[j][i + 1], j === 0 || j === nz ? 1.3 : j === 3 || j === 7 ? 1 : 0.3);
        if (j < nz) L(s, g[j][i], g[j + 1][i], i === 0 || i === nx ? 1.3 : 0.3);
      }
      var b = [N(s, 0, by, 0), N(s, W, by, 0), N(s, W, by, -D)];
      L(s, g[0][0], b[0], 0.6); L(s, b[0], b[1], 0.8); L(s, g[0][nx], b[1], 0.6); L(s, b[1], b[2], 0.8); L(s, g[nz][nx], b[2], 0.6);
      var cl = [], cr = [];
      for (j = 0; j <= nz; j++) { z = -D * j / nz; u = 3 * Math.cos(Math.PI * j / (2 * nz)); cl.push(N(s, 15 + u, -0.01, z)); cr.push(N(s, 17 + u, -0.01, z)); }
      for (j = 0; j <= nz; j++) { L(s, cl[j], cr[j], 1.1, 1); if (j < nz) { L(s, cl[j], cl[j + 1], 1.9, 1); L(s, cr[j], cr[j + 1], 1.9, 1); } }
      var wv = [], amp = [0, 0.5, -0.9, 1.6, -2.2, 1.9, -1.2, 2.4, -1.7, 0.8, -1.1, 0.5, -0.3, 0];
      for (i = 0; i < amp.length; i++) wv.push(N(s, 6 + 20 * i / (amp.length - 1), 0, -D - 3.4 + amp[i] * 0.7));
      for (i = 0; i < amp.length - 1; i++) L(s, wv[i], wv[i + 1], 1.1, 1);
      s.dots.push(N(s, 16 + 3, -0.01, 0), N(s, 16, -0.01, -D));
      s.yaw = -0.3; s.pitch = 0.24; s.big = 5; return s;
    },
    liquefaction: function () {                                                        // a frame that has settled and tilted into a layer that let go
      var F = makeFrame(2, 1, 3, 6, 6, 3.4), s = S(), i, j, x, g = [], x0 = -10, x1 = 22, y0 = -4, y1 = 10, D = 13, nx = 16, nz = 6, tilt = 0.1, c = Math.cos(tilt), sn = Math.sin(tilt);
      function lay(xx, q) { return -D * q / nz + (q === 2 || q === 3 || q === 4 ? 0.55 * Math.sin(xx * 0.55 + q * 2.1) : 0); }
      for (i = 0; i < F.nodes.length; i++) { var p = F.nodes[i], X = p[0] - 6, Z = p[2]; N(s, 6 + X * c + Z * sn, p[1], -1.5 - X * sn + Z * c); }
      for (i = 0; i < F.cols.length; i++) L(s, F.cols[i][0], F.cols[i][1], 1.6);
      for (i = 0; i < F.beams.length; i++) L(s, F.beams[i][0], F.beams[i][1], 1);
      L(s, 0, 2, 1.6); L(s, 3, 5, 1.6); L(s, 0, 3, 1.6); L(s, 1, 4, 1.6); L(s, 2, 5, 1.6); L(s, 0, 1, 1.6); L(s, 1, 2, 1.6); L(s, 3, 4, 1.6); L(s, 4, 5, 1.6);
      for (j = 0; j <= nz; j++) { g.push([]); for (i = 0; i <= nx; i++) { x = x0 + (x1 - x0) * i / nx; g[j].push(N(s, x, y0, lay(x, j))); } }
      for (j = 0; j <= nz; j++) for (i = 0; i <= nx; i++) {
        var soft = j === 2 || j === 3 || j === 4;
        if (i < nx) L(s, g[j][i], g[j][i + 1], j === 0 || j === nz ? 1.2 : soft ? (j === 3 ? 0.6 : 1.1) : 0.3, soft);
        if (j < nz) L(s, g[j][i], g[j + 1][i], i === 0 || i === nx ? 1.2 : 0.3);
      }
      var b = [N(s, x0, y1, 0), N(s, x1, y1, 0), N(s, x1, y1, -D)];
      L(s, g[0][0], b[0], 0.7); L(s, b[0], b[1], 0.7); L(s, g[0][nx], b[1], 0.7); L(s, b[1], b[2], 0.7); L(s, g[nz][nx], b[2], 0.7);
      s.dots.push(N(s, -6.5, y0, 0), N(s, 17.5, y0, 0), N(s, 19.5, y0 + 6, 0));          // sand boils at the surface
      s.yaw = -0.5; s.pitch = 0.3; s.big = 4; return s;
    },
    isolation: function () { var s = S(), F = protectedFrame(s, 2.3); isolators(s, F, 2.3); moat(s, 2.3); s.yaw = -0.6; s.pitch = 0.3; return s; },
    dampers: function () {                                                             // a damper in the brace of the middle bay, on the front and back frames
      var s = S(), F = protectedFrame(s, 0), j, k;
      for (j = 0; j <= 2; j += 2) for (k = 0; k < F.ns; k++) device(s, F.nodes[F.id(k % 2 ? 2 : 1, j, k)], F.nodes[F.id(k % 2 ? 1 : 2, j, k + 1)], 0.3, 0.7);
      for (j = 0; j < 12; j++) s.dots.push(j);
      s.yaw = -0.6; s.pitch = 0.3; return s;
    },
    brb: function () {                                                                 // buckling-restrained braces: a chevron in the middle bay of every storey, the yielding core picked out
      var s = S(), F = protectedFrame(s, 0), j, k;
      for (j = 0; j <= 2; j += 2) for (k = 0; k < F.ns; k++) {
        var top = F.nodes[F.id(1, j, k + 1)], mid = [top[0] + 3, top[1], top[2]];
        device(s, F.nodes[F.id(1, j, k)], mid, 0.22, 0.78); device(s, F.nodes[F.id(2, j, k)], mid, 0.22, 0.78);
      }
      for (j = 0; j < 12; j++) s.dots.push(j);
      s.yaw = -0.6; s.pitch = 0.3; return s;
    }
  };
  var built = {};
  function structure(name) { return built[name] || (built[name] = RANGE[name]()); }
  function drawWire(ctx, r, st, T, o) {
    var cam = camera((st.yaw || -0.6) + (o.turn || 0), st.pitch || 0.38), P = view(st.pts, camera(st.yaw || -0.6, st.pitch || 0.38), r, o.pad === undefined ? 0.13 : o.pad), s = P.s, i, l;
    var mid = [0, 0, 0], n = st.pts.length;
    if (!st.zr) { st.zr = [1e9, -1e9]; for (i = 0; i < n; i++) { st.zr[0] = Math.min(st.zr[0], st.pts[i][2]); st.zr[1] = Math.max(st.zr[1], st.pts[i][2]); } }
    for (i = 0; i < n; i++) { mid[0] += st.pts[i][0] / n; mid[1] += st.pts[i][1] / n; mid[2] += st.pts[i][2] / n; }
    var m1 = cam(mid), base = P(mid), z0 = st.zr[0], zh = (st.zr[1] - st.zr[0]) || 1, sway = o.sway || 0, col = o.colour || 0;
    function Q(p) { var q = cam(sway ? [p[0] + sway * zh * Math.pow((p[2] - z0) / zh, 1.6), p[1], p[2]] : p); return [base[0] + s * (q[0] - m1[0]), base[1] + s * (q[1] - m1[1])]; }
    var px = Math.max(1, r.w / 560), draw = o.draw === undefined ? 1 : o.draw, cnt = st.lines.length, al = o.alpha === undefined ? 1 : o.alpha;
    ctx.lineCap = 'round';
    for (i = 0; i < cnt; i++) {
      l = st.lines[i]; var vis = clamp(draw * 1.25 * cnt / 8 - i / 8); if (vis <= 0 || l[2] < 0.05) continue;
      var pa = st.pts[l[0]], pb = st.pts[l[1]];
      ctx.strokeStyle = l[3] ? T.accent : col ? ramp(0.1 + 0.86 * ((pa[2] + pb[2]) / 2 - z0) / zh) : T.line;
      ctx.globalAlpha = al * (l[3] ? 1 : clamp((col ? 0.74 : 0.42) + l[2] * 0.42)) * clamp(vis);
      ctx.lineWidth = px * (0.7 + l[2] * 0.62) * (o.bold || 1); line(ctx, Q(pa), Q(pb));
    }
    ctx.fillStyle = T.accent; ctx.globalAlpha = al * clamp(draw * 2 - 1);
    for (i = 0; i < st.dots.length; i++) dot(ctx, Q(st.pts[st.dots[i]]), (st.big || 4) * px);
    ctx.globalAlpha = 1;
  }

  // ---- the slab: plan, plate model, result map, reinforcement, checks ----
  var SLAB = { xs: [0, 6, 13.2, 19.2], ys: [0, 5.4, 11.4] };
  function slabField(x, y) {
    var X = SLAB.xs, Y = SLAB.ys, i, j, xi = 0, yj = 0;
    for (i = 0; i < X.length - 1; i++) if (x >= X[i]) xi = i;
    for (j = 0; j < Y.length - 1; j++) if (y >= Y[j]) yj = j;
    var u = (x - X[xi]) / (X[xi + 1] - X[xi]), v = (y - Y[yj]) / (Y[yj + 1] - Y[yj]);
    var sagg = Math.pow(Math.sin(Math.PI * u), 0.9) * Math.pow(Math.sin(Math.PI * v), 0.7), hog = 0;
    for (i = 1; i < X.length - 1; i++) hog = Math.max(hog, Math.exp(-Math.pow((x - X[i]) / 0.75, 2)) * Math.pow(Math.sin(Math.PI * v), 0.5));
    return clamp(0.52 + 0.5 * sagg - 1.1 * hog);
  }
  function drawSlab(ctx, r, T, o) {
    var X = SLAB.xs, Y = SLAB.ys, Lx = X[3], Ly = Y[2], cam = camera(o.yaw === undefined ? -0.42 : o.yaw, o.pitch === undefined ? 0.95 : o.pitch);
    var P = view([[0, 0, 0], [Lx, 0, 0], [Lx, Ly, 0], [0, Ly, 0], [0, 0, -1.2]], cam, r, 0.1), px = Math.max(1, r.w / 560), i, j, a;
    var nx = 48, ny = 28, map = clamp(o.map || 0), keep = o.keep === undefined ? 1 : o.keep, mesh = o.mesh || 0;
    function quad(x0, y0, x1, y1) { var p = P([x0, y0, 0]), q = P([x1, y0, 0]), s = P([x1, y1, 0]), t = P([x0, y1, 0]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(s[0], s[1]); ctx.lineTo(t[0], t[1]); ctx.closePath(); }
    // the slab body
    ctx.fillStyle = T.panel; quad(0, 0, Lx, Ly); ctx.fill();
    // the result map, sweeping across
    if (map > 0 && keep > 0) {
      for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
        var cx = (i + 0.5) / nx, cyy = (j + 0.5) / ny, vis = clamp((map * 1.25 - (cx * 0.85 + (1 - cyy) * 0.15)) * 9); if (vis <= 0) continue;
        ctx.fillStyle = ramp(slabField(cx * Lx, cyy * Ly), vis * keep); quad(i / nx * Lx, j / ny * Ly, (i + 1) / nx * Lx + 0.02, (j + 1) / ny * Ly + 0.02); ctx.fill();
      }
    }
    // the plate model's mesh
    if (mesh > 0) {
      ctx.strokeStyle = T.grid; ctx.lineWidth = px * 0.8; ctx.globalAlpha = mesh;
      for (i = 1; i < 24; i++) line(ctx, P([Lx * i / 24, 0, 0]), P([Lx * i / 24, Ly, 0]));
      for (j = 1; j < 14; j++) line(ctx, P([0, Ly * j / 14, 0]), P([Lx, Ly * j / 14, 0]));
      ctx.globalAlpha = 1;
    }
    // edge, thickness, beams on the grid lines, columns
    var build = o.build === undefined ? 1 : o.build;
    ctx.strokeStyle = T.line; ctx.lineCap = 'round'; ctx.globalAlpha = clamp(build * 2);
    ctx.lineWidth = px * 1.3; quad(0, 0, Lx, Ly); ctx.stroke();
    ctx.strokeStyle = T.soft; ctx.lineWidth = px;
    line(ctx, P([0, 0, 0]), P([0, 0, -0.5])); line(ctx, P([Lx, 0, 0]), P([Lx, 0, -0.5])); line(ctx, P([0, 0, -0.5]), P([Lx, 0, -0.5])); line(ctx, P([Lx, Ly, 0]), P([Lx, Ly, -0.5])); line(ctx, P([Lx, 0, -0.5]), P([Lx, Ly, -0.5]));
    ctx.strokeStyle = T.line; ctx.lineWidth = px * 2.3;
    for (i = 0; i < X.length; i++) line(ctx, P([X[i], 0, 0]), P([X[i], Ly * clamp(build * 2 - i * 0.2), 0]));
    for (j = 0; j < Y.length; j++) line(ctx, P([0, Y[j], 0]), P([Lx * clamp(build * 2 - j * 0.2), Y[j], 0]));
    ctx.globalAlpha = clamp(build * 2 - 0.6); ctx.fillStyle = T.node;
    for (i = 0; i < X.length; i++) for (j = 0; j < Y.length; j++) { a = P([X[i], Y[j], 0]); ctx.fillRect(a[0] - 3.4 * px, a[1] - 3.4 * px, 6.8 * px, 6.8 * px); line(ctx, a, P([X[i], Y[j], -2.2])); }
    ctx.globalAlpha = 1;
    // reinforcement: bottom bars both ways in every panel, top bars over the inner supports
    var bars = o.bars || 0;
    if (bars > 0) {
      ctx.lineWidth = px * 1.25; var b, n, z = 0.02, cnt = 0, tot = 0;
      function bar(p, q) { cnt++; var vv = clamp(bars * 1.3 * tot / 10 - cnt / 10); if (vv > 0) { ctx.globalAlpha = vv; line(ctx, P(p), P([lerp(p[0], q[0], vv), lerp(p[1], q[1], vv), z])); } }
      tot = 3 * 2 * (7 + 9) + 2 * 22 + 30; ctx.strokeStyle = T.accent;
      for (i = 0; i < 3; i++) for (j = 0; j < 2; j++) {
        for (n = 1; n <= 7; n++) { b = lerp(Y[j], Y[j + 1], n / 8); bar([X[i] + 0.35, b, z], [X[i + 1] - 0.35, b, z]); }
        for (n = 1; n <= 9; n++) { b = lerp(X[i], X[i + 1], n / 10); bar([b, Y[j] + 0.35, z], [b, Y[j + 1] - 0.35, z]); }
      }
      ctx.strokeStyle = T.node;
      for (i = 1; i < 3; i++) for (n = 1; n <= 22; n++) { b = Ly * n / 23; bar([X[i] - 1.5, b, z], [X[i] + 1.5, b, z]); }
      for (n = 1; n <= 30; n++) { b = Lx * n / 31; bar([b, Y[1] - 1.4, z], [b, Y[1] + 1.4, z]); }
      ctx.globalAlpha = 1;
    }
    return P;
  }
  // a calculation sheet: rows that tick themselves off
  function drawSheet(ctx, r, T, o) {
    var px = Math.max(1, r.w / 240), a = clamp(o.alpha), rows = 6, i, y, p = clamp(o.prog);
    ctx.globalAlpha = a; ctx.fillStyle = '#FBFCFB'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 6 * px); else ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
    ctx.fillStyle = '#16211C'; ctx.fillRect(r.x + 16 * px, r.y + 18 * px, r.w * 0.42, 6 * px);
    ctx.fillStyle = '#C9D3CD'; ctx.fillRect(r.x + 16 * px, r.y + 32 * px, r.w * 0.62, 3 * px);
    for (i = 0; i < rows; i++) {
      y = r.y + 58 * px + i * (r.h - 76 * px) / rows; var on = clamp(p * (rows + 1) - i);
      ctx.fillStyle = '#DDE4E0'; ctx.fillRect(r.x + 40 * px, y, r.w * lerp(0.34, 0.5, (i * 37 % 10) / 10), 4 * px);
      ctx.fillStyle = '#EEF2F0'; ctx.fillRect(r.x + 40 * px, y + 10 * px, r.w * 0.28, 3 * px);
      ctx.fillStyle = '#FFB813'; ctx.globalAlpha = a * on; ctx.fillRect(r.x + r.w - 62 * px, y - 1 * px, 46 * px, 10 * px); ctx.globalAlpha = a;      // the clause tag
      ctx.strokeStyle = on > 0 ? '#1F8A55' : '#C9D3CD'; ctx.lineWidth = 1.6 * px; ctx.beginPath(); ctx.arc(r.x + 24 * px, y + 5 * px, 7 * px, 0, TAU); ctx.stroke();
      if (on > 0) { ctx.beginPath(); ctx.moveTo(r.x + 20.5 * px, y + 5 * px); ctx.lineTo(r.x + 23 * px, y + 7.8 * px); ctx.lineTo(r.x + lerp(23, 28, on) * px, y + lerp(7.8, 2.2, on) * px); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  var api = { clamp: clamp, lerp: lerp, seg: seg, ease: ease, ramp: ramp, THEMES: THEMES, makeFrame: makeFrame, drawFrame: drawFrame, drawPlot: drawPlot, drawSection: drawSection,
    drawScale: drawScale, structure: structure, drawWire: drawWire, drawSlab: drawSlab, drawSheet: drawSheet, label: label, RANGE: RANGE, CURVES: CURVES };
  root.Bina = api;
})(typeof window !== 'undefined' ? window : this);
