// /sofia: the same intro as the home page, saying "I love you" in ten languages, then the black lifts
// on a glass vase of white and pink peonies that grow, open and turn in space, built from tiny dots in
// the style of braille text art, with a line of handwriting underneath, made of the same dots.
(function () {
  var LOVE = ['I love you', 'Te amo', 'Je t’aime', 'Ti amo', 'Ich liebe dich', '愛してる', '사랑해', '我爱你', 'Eu te amo', 'Mahal kita'];
  var LINE = 'you are as beautiful as your favorite flower';
  var TAU = Math.PI * 2;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sound: one note per phrase, same as the home intro ---------- */
  var actx = null;
  function note(freq) {
    try {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      if (!actx) actx = new A();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + 0.2);
    } catch (e) {}
  }
  var NOTES = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];

  /* ---------- song: the official YouTube upload, started at 0:58 when the bouquet appears ---------- */
  // The player is loaded on the opening click (a browser only lets sound start after a click or tap),
  // so it is ready by the time the black lifts. The player itself is kept out of sight; a click or tap
  // anywhere on the bouquet pauses and resumes the song.
  var SONG = '38P_VVl8yKY', SONG_AT = 58, player = null, ready = false, wanted = false;
  function loadSong() {
    if (document.getElementById('song')) return;
    var box = document.createElement('div');
    box.className = 'song';
    box.appendChild(Object.assign(document.createElement('div'), { id: 'song' }));
    document.body.appendChild(box);
    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player('song', {
        width: 200, height: 113, videoId: SONG,
        playerVars: { start: SONG_AT, playsinline: 1, rel: 0, modestbranding: 1 },
        events: { onReady: function () { ready = true; if (wanted) playSong(); } }
      });
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  canvas_toggle();
  function canvas_toggle() {
    document.addEventListener('click', function (e) {
      if (!ready || !started || (e.target.closest && e.target.closest('.intro'))) return;
      try { if (player.getPlayerState() === 1) player.pauseVideo(); else player.playVideo(); } catch (err) {}
    });
  }
  function playSong() {
    wanted = true;
    if (!ready) return;
    try { player.seekTo(SONG_AT, true); player.playVideo(); } catch (e) {}
  }

  /* ---------- canvas and layout ---------- */
  // The flowers are real 3D shapes: every petal is a curved surface made of thousands of points. Each frame
  // the points are turned, flattened onto the screen and lit up as tiny dots grouped in 2 x 4 blocks, the way
  // braille characters are built. Nearer points hide farther ones, and brightness decides how many dots light.
  var canvas = document.getElementById('bouquet'), ctx = canvas.getContext('2d');
  var W, H, dpr, ch, u, cx, base, lines, letters, textTop, tall = 182, started = 0;
  var pitch, gap, cellW, cellH, DW, DH, zbuf, bbuf, cbuf, scene = null, stars = [], img = null, px32 = null;
  var SCRIPT = '700 {px}px "Dancing Script", "Segoe Script", "Brush Script MT", cursive'; // the handwriting font for the sentence
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function inout(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // the dot grid everything is drawn on
    pitch = Math.max(1.9, Math.min(3.2, Math.sqrt(W * H) / 340));
    gap = pitch * 0.5;
    cellW = pitch * 2 + gap; cellH = pitch * 4 + gap;
    DW = Math.ceil(W / cellW) * 2; DH = Math.ceil(H / cellH) * 4;
    zbuf = new Float32Array(DW * DH); bbuf = new Float32Array(DW * DH); cbuf = new Uint8Array(DW * DH);
    // The sentence is written in a cursive font on a hidden canvas, one pixel per dot, wrapped to the
    // screen. Every pixel the handwriting covers becomes a dot, so it is made of the same stuff as the flowers.
    ch = pitch * 4;
    var hx = cellW / 2, hy = cellH / 4, fpx = Math.max(34, Math.min(84, W / (W / H < 0.7 ? 9 : 15))), lineH = fpx * 1.12;
    var mc = document.createElement('canvas'), m = mc.getContext('2d', { willReadFrequently: true });
    m.font = SCRIPT.replace('{px}', fpx);
    lines = [];
    var words = LINE.split(' '), cur = '';
    words.forEach(function (w) {
      var next = cur ? cur + ' ' + w : w;
      if (cur && m.measureText(next).width > W * 0.9) { lines.push(cur); cur = w; } else cur = next;
    });
    if (cur) lines.push(cur);
    var textH = lines.length * lineH + fpx * 0.35;
    textTop = H - textH - ch;
    var tw = DW, thh = Math.ceil(textH / hy) + 2, y0 = Math.floor(textTop / hy);
    mc.width = tw; mc.height = thh;
    m.setTransform(1 / hx, 0, 0, 1 / hy, 0, 0);
    m.font = SCRIPT.replace('{px}', fpx);
    m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff';
    var spans = lines.map(function (l) { return m.measureText(l).width; });
    lines.forEach(function (l, li) { m.fillText(l, W / 2, lineH * (li + 0.55)); });
    var a = m.getImageData(0, 0, tw, thh).data;
    letters = [];
    for (var yy = 0; yy < thh; yy++) for (var xx = 0; xx < tw; xx++) if (a[(yy * tw + xx) * 4 + 3] > 96) {
      var li = Math.min(lines.length - 1, Math.floor(yy * hy / lineH)), left = W / 2 - spans[li] / 2;
      letters.push(xx, y0 + yy, li, clamp((xx * hx - left) / Math.max(1, spans[li]))); // dot x, dot y, line, how far along the line
    }    // the arrangement is designed in a space about 180 units tall and 170 wide
    base = textTop - ch * 2;
    var narrow = W / H < 0.7;
    arrange(narrow);
    u = Math.max(1, narrow ? Math.min(base / 214, W / 124) : Math.min(base / 182, W / 172));
    tall = narrow ? 214 : 182;
    cx = W / 2;
    build();
    var r = rng(7);
    stars = [];
    for (var i = 0; i < 90; i++) stars.push([Math.floor(r() * DW), Math.floor(r() * DH * (textTop / H)), r() * TAU, 0.6 + r() * 1.6]);
  }

  /* ---------- the flowers, as points in space ---------- */
  // Each bloom: where it sits (z is depth), its size, its colour (0 white, 1 blush, 2 pink, 3 rose), when it
  // starts to open, and how far it opens (the small ones stay as buds). They lean outward from the vase.
  var BLOOMS = [
    { x: 0, y: 60, z: 0, R: 30, c: 2, t0: 3.60 },
    { x: -35, y: 42, z: 14, R: 26, c: 0, t0: 4.15 },
    { x: 37, y: 44, z: -12, R: 27, c: 1, t0: 4.70 },
    { x: -8, y: 30, z: 36, R: 24, c: 3, t0: 5.25 },
    { x: 14, y: 33, z: -36, R: 23, c: 0, t0: 5.80 },
    { x: -54, y: 13, z: -14, R: 20, c: 3, t0: 6.35 },
    { x: 56, y: 15, z: 16, R: 21, c: 2, t0: 6.90 },
    { x: 26, y: 12, z: 40, R: 19, c: 0, t0: 7.45 },
    { x: -27, y: 10, z: -40, R: 18, c: 1, t0: 8.00 },
    { x: -21, y: 78, z: -10, R: 10, c: 3, t0: 8.55, max: 0.12 },
    { x: 24, y: 82, z: 12, R: 9, c: 1, t0: 9.10, max: 0.2 }
  ];
  BLOOMS.forEach(function (f, i) { f.seed = i * 1.37 + 1; f.x0 = f.x; f.y0 = f.y; f.z0 = f.z; });
  // On a tall, narrow screen the arrangement is drawn taller and narrower, so it can be bigger on a phone.
  function arrange(narrow) {
    BLOOMS.forEach(function (f) {
      f.x = f.x0 * (narrow ? 0.7 : 1); f.z = f.z0 * (narrow ? 0.7 : 1); f.y = f.y0 * (narrow ? 1.24 : 1) + (narrow ? 6 : 0);
      pose(f);
    });
  }
  function pose(f) {
    var hz = Math.sqrt(f.x * f.x + f.z * f.z);
    f.az = Math.atan2(f.z, f.x);              // which way it leans
    f.tilt = Math.atan2(hz, f.y + 34) * 0.85; // how far: more for the ones out at the sides
    f.ax = [Math.sin(f.tilt) * Math.cos(f.az), Math.cos(f.tilt), Math.sin(f.tilt) * Math.sin(f.az)];
  }
  // six tiers of petals, outside to inside: how many, how long, how steeply they rise, how much they cup
  var TIERS = [[9, 1.0, -0.28, 0.4], [9, 0.94, 0.08, 0.34], [8, 0.84, 0.4, 0.28], [7, 0.7, 0.72, 0.22], [6, 0.54, 1.02, 0.14], [5, 0.38, 1.3, 0.08]];
  // the vase, bottom to rim: height and how wide it is there
  var VASE = [[-76, 0], [-76, 13], [-70, 16], [-58, 19.5], [-46, 18.5], [-36, 14], [-28, 11.5], [-22, 12.5], [-18, 15.5]];
  function vaseR(y) {
    for (var i = 1; i < VASE.length; i++) if (y <= VASE[i][0]) {
      var a = VASE[i - 1], b = VASE[i], t = b[0] === a[0] ? 1 : (y - a[0]) / (b[0] - a[0]);
      t = t * t * (3 - 2 * t);
      return a[1] + (b[1] - a[1]) * t;
    }
    return VASE[VASE.length - 1][1];
  }
  function build() {
    var step = pitch * 1.05 / u; // spacing between points: close enough that the surface has no holes
    scene = { flowers: [], green: null };
    BLOOMS.forEach(function (f) {
      var pts = [], ct = Math.cos(f.tilt), st = Math.sin(f.tilt), ca = Math.cos(f.az), sa = Math.sin(f.az);
      function lean(x, y, z) { var x1 = x * ct + y * st; return [x1 * ca - z * sa, -x * st + y * ct, x1 * sa + z * ca]; }
      // every point is stored in three poses: fully open, half open (a cup), and closed (a ball)
      function put(o, m, c, tier, b, shade) {
        o = lean(o[0], o[1], o[2]); m = lean(m[0], m[1], m[2]); c = lean(c[0], c[1], c[2]);
        pts.push(o[0], o[1], o[2], m[0], m[1], m[2], c[0], c[1], c[2], tier, b, shade);
      }
      var ball = f.R * 0.3; // a peony bud is a tight ball, about a third the width of the open flower
      TIERS.forEach(function (tr, j) {
        var n = tr[0], L = tr[1] * f.R, span_ = Math.PI / n * 1.4;
        var ns = Math.ceil(L / step) + 1, nt = Math.ceil(2 * span_ * L / step) + 1;
        for (var i = 0; i < n; i++) {
          var p0 = i / n * TAU + j * 0.45 + f.seed;
          for (var a = 0; a < nt; a++) {
            var t = nt > 1 ? a / (nt - 1) * 2 - 1 : 0;
            // the tip of each petal is rounded and a little ragged, like a peony's
            var smax = 1 - 0.1 * t * t - 0.17 * Math.abs(Math.sin(t * 6.5 + i * 1.7 + j));
            for (var k = 1; k < ns; k++) {
              var s = k / (ns - 1);
              if (s > smax) break;
              var phi = p0 + t * span_ * (0.3 + 0.7 * s), em = tr[2] + tr[3] * s;
              var rad = L * s * Math.cos(em), yy = j * 0.05 * f.R + L * s * Math.sin(em) + 0.03 * f.R * Math.sin(t * 9 + i) * s;
              // half open: the petal stands up and curves inward, so the flower is a bowl
              var emid = tr[2] * 0.4 + 0.8 + tr[3] * s * 1.5, Lm = L * 0.8, radm = Lm * s * Math.cos(emid) + 0.1 * f.R * Math.sin(Math.PI * s), ym = j * 0.04 * f.R + Lm * s * Math.sin(emid);
              // closed: the petal is wrapped over the ball, from its base up and across the top
              var rb = ball * (1 - j * 0.07), wrapA = s * 2.8 * (1 - j * 0.04), phc = p0 + t * span_, radc = rb * Math.sin(wrapA), yc = rb * (1 - Math.cos(wrapA));
              var edge = Math.pow(Math.abs(t), 3);
              put([Math.cos(phi) * rad, yy, Math.sin(phi) * rad], [Math.cos(phi) * radm, ym, Math.sin(phi) * radm], [Math.cos(phc) * radc, yc, Math.sin(phc) * radc], j,
                (0.1 + 0.9 * Math.pow(s, 1.4)) * (1 - 0.55 * edge), clamp(0.08 + 0.56 * s + 0.2 * j / 5 - 0.25 * edge + (i % 2 ? 0.1 : -0.04) + (j % 2 ? 0.08 : -0.05)));
            }
          }
        }
      });
      // a small green cup under the bloom
      var cup = f.R * 0.16, nr = Math.ceil(cup * TAU / step);
      for (var v = 0; v <= 1; v += step / cup) for (var q = 0; q < nr; q++) {
        var ang = q / nr * TAU, cr = cup * 0.85 * (1 - v * 0.75), cy_ = -f.R * 0.02 - cup * v;
        var cp_ = [Math.cos(ang) * cr, cy_, Math.sin(ang) * cr];
        put(cp_, cp_, cp_, -1, 0.75, 0.55);
      }
      // five green sepals hold the bud shut, then peel back and fold down under the flower
      var sb = ball * 1.07, sn_ = Math.ceil(sb * 2 / step) + 1, sm = Math.ceil(sb * 1.3 / step) + 1;
      for (var si = 0; si < 5; si++) for (var sa_ = 0; sa_ < sm; sa_++) for (var sk = 1; sk < sn_; sk++) {
        var st_ = sm > 1 ? sa_ / (sm - 1) * 2 - 1 : 0, ss = sk / (sn_ - 1);
        if (ss > 1 - 0.55 * st_ * st_) continue; // pointed tip
        var sph = si / 5 * TAU + f.seed + st_ * 0.62 * (1 - 0.35 * ss), wa = ss * 1.95, ln = sb * 1.5 * ss;
        put([Math.cos(sph) * ln * 0.5, -ln * 0.86, Math.sin(sph) * ln * 0.5], [Math.cos(sph) * ln, -ln * 0.1, Math.sin(sph) * ln],
          [Math.cos(sph) * sb * Math.sin(wa), sb * (1 - Math.cos(wa)) - sb * 0.05, Math.sin(sph) * sb * Math.sin(wa)], 6, 0.5 + 0.4 * ss, 0.5);
      }
      scene.flowers.push({ f: f, pts: new Float32Array(pts) });
    });
    // green and glass: x, y, z, the moment it appears, brightness, colour
    var g = [];
    // the vase is see-through: rings and ribs of dots, so the stems show inside it
    var y, k, r, ang, ribs = 22;
    for (y = VASE[1][0]; y <= VASE[VASE.length - 1][0]; y += step) {
      r = vaseR(y);
      for (k = 0; k < ribs; k++) { ang = k / ribs * TAU; g.push(Math.cos(ang) * r, y, Math.sin(ang) * r, (y + 76) / 58 * 1.6, 0.62, 12); }
    }
    [-76, -64, -52, -40, -28, -18].forEach(function (ry, ri) {
      r = vaseR(ry);
      var n = Math.ceil(r * TAU / step);
      for (k = 0; k < n; k++) { ang = k / n * TAU; g.push(Math.cos(ang) * r, ry, Math.sin(ang) * r, (ry + 76) / 58 * 1.6, ri === 5 || ri === 0 ? 0.95 : 0.7, ri === 5 ? 15 : 13); }
    });
    for (r = 0; r < 13; r += step) { var nb = Math.max(6, Math.ceil(r * TAU / step)); for (k = 0; k < nb; k += 2) { ang = k / nb * TAU; g.push(Math.cos(ang) * r, -76, Math.sin(ang) * r, 0, 0.4, 11); } }
    // stems rise from the bottom of the vase, through its neck, and curve out to each bloom
    BLOOMS.forEach(function (f, n) {
      var sa = n * 2.4, bx = Math.cos(sa) * 6, bz = Math.sin(sa) * 6, by = -72;
      var tx = f.x - f.ax[0] * f.R * 0.2, ty = f.y - f.ax[1] * f.R * 0.2, tz = f.z - f.ax[2] * f.R * 0.2;
      // Inside the glass a stem runs straight from the bottom to a point well inside the mouth, so it can
      // never poke through the side. Only above the rim does it curve away toward its flower.
      var hz = Math.sqrt(tx * tx + tz * tz) || 1, mr = 2 + (n % 4) * 1.4, ox = tx / hz * mr, oz = tz / hz * mr, oyv = -17;
      var kx = ox + tx * 0.1, ky = oyv + (ty - oyv) * 0.5, kz = oz + tz * 0.1; // the bend, straight above the mouth
      var len1 = oyv - by, len2 = Math.abs(ty - oyv) + hz, len = len1 + len2, a1 = len1 / len;
      var at = function (a) {
        if (a <= a1) { var q = a / a1; return [bx + (ox - bx) * q, by + (oyv - by) * q, bz + (oz - bz) * q]; }
        var w = (a - a1) / (1 - a1), m = 1 - w;
        return [m * m * ox + 2 * m * w * kx + w * w * tx, m * m * oyv + 2 * m * w * ky + w * w * ty, m * m * oz + 2 * m * w * kz + w * w * tz];
      };
      for (var a = 0; a <= 1; a += step / len) {
        var p = at(a);
        g.push(p[0], p[1], p[2], 1.2 + a * 2.8, 0.8, 4, p[0] + step, p[1], p[2], 1.2 + a * 2.8, 0.8, 3, p[0], p[1], p[2] + step, 1.2 + a * 2.8, 0.8, 3);
      }
      if (f.max) return;
      // one outlined leaf on each stem, above the rim, reaching outward
      var la = a1 + (1 - a1) * (0.3 + (n % 3) * 0.1), p0 = at(la), up = 0.5 + (n % 2) * 0.3, L = 17 + f.R * 0.3, Wd = 5.5, side = n % 2 ? 1 : -1;
      var az = f.az + side * 1.1, dx = Math.cos(az) * Math.cos(up), dy = Math.sin(up), dz = Math.sin(az) * Math.cos(up), born = 1.2 + la * 2.8 + 0.8;
      for (var l = 0; l <= L; l += step * 0.9) {
        var wv = Wd * Math.pow(Math.sin(Math.PI * l / L), 0.75), x0 = p0[0] + dx * l, y0 = p0[1] + dy * l, z0 = p0[2] + dz * l, tt = born + l / L * 2;
        g.push(x0 - Math.sin(az) * wv, y0 + wv * 0.25, z0 + Math.cos(az) * wv, tt, 0.85, 6);
        g.push(x0 + Math.sin(az) * wv, y0 - wv * 0.25, z0 - Math.cos(az) * wv, tt, 0.85, 6);
        g.push(x0, y0, z0, tt, 0.6, 2);
      }
    });
    scene.green = new Float32Array(g);
  }

  /* ---------- drawing ---------- */
  // Four petal colours, each running from the shaded base of a petal to its pale tip: white, blush,
  // pink and rose. After them come the greens for stems and leaves, and the pale tones of the glass.
  var PINKS = [], GREENS = [], STAR = abgr(150, 120, 140);
  function abgr(r, g, b) { return (255 << 24 | Math.round(b) << 16 | Math.round(g) << 8 | Math.round(r)) >>> 0; } // a pixel, as the canvas stores it
  (function () {
    [
      [[200, 176, 188], [238, 224, 230], [252, 246, 248], [255, 255, 255]],
      [[232, 160, 188], [255, 204, 220], [255, 228, 237], [255, 246, 249]],
      [[224, 132, 170], [255, 176, 202], [255, 208, 224], [255, 238, 244]],
      [[188, 74, 124], [226, 108, 156], [246, 150, 188], [255, 200, 220]]
    ].forEach(function (stops) {
      for (var i = 0; i < 32; i++) {
        var t = i / 31 * 3, k = Math.min(2, Math.floor(t)), f = t - k, a = stops[k], b = stops[k + 1];
        PINKS.push(abgr(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f));
      }
    });
    for (var i = 0; i < 8; i++) GREENS.push(abgr(86 + i * 10, 150 + i * 11, 128 + i * 8));
    for (i = 0; i < 8; i++) GREENS.push(abgr(150 + i * 14, 170 + i * 11, 190 + i * 9)); // glass
  })();
  var DITHER = [0.06, 0.52, 0.72, 0.3, 0.2, 0.84, 0.62, 0.4]; // which dots of a block light first as it gets brighter
  // one full turn while it grows, then it keeps turning slowly
  function spin(T) {
    if (still) return 0;
    var after = Math.max(0, T - 19.5);
    return inout(clamp(T / 20)) * TAU + 0.2 * (after - (1 - Math.exp(-after)));
  }
  function render(T) {
    var th = spin(T), cs = Math.cos(th), sn = Math.sin(th), cp = Math.cos(0.3), sp = Math.sin(0.3);
    var hx = cellW / 2, hy = cellH / 4, oy = base - 84 * u - Math.max(0, base - tall * u) / 2, i, n; // centred in the space above the text
    zbuf.fill(-1e9); bbuf.fill(0);
    function plot(x, y, z, b, c) {
      var xr = x * cs + z * sn, zr = -x * sn + z * cs, yr = y * cp - zr * sp, zf = y * sp + zr * cp;
      var dx = Math.floor((cx + xr * u) / hx), dy = Math.floor((oy - yr * u) / hy);
      if (dx < 0 || dy < 0 || dx >= DW || dy >= DH) return;
      var id = dy * DW + dx;
      if (zf <= zbuf[id]) return;
      zbuf[id] = zf; bbuf[id] = b * (0.8 + 0.2 * clamp(0.5 + zf / 90)); cbuf[id] = c;
    }
    // stems and leaves grow in from the bottom
    var g = scene.green, grow = still ? 99 : T;
    for (i = 0, n = g.length; i < n; i += 6) if (g[i + 3] <= grow) plot(g[i], g[i + 1], g[i + 2], g[i + 4], 128 + g[i + 5]);
    // blooms: each starts as a tight bud and its tiers fold open from the outside in
    scene.flowers.forEach(function (fl) {
      var f = fl.f, p = fl.pts, sc = still ? 1 : ease(clamp((T - f.t0) / 1.6));
      if (sc <= 0) return;
      // The bud sits closed for a moment. Then the sepals peel back, the outer guard petals loosen first,
      // and each tier further in follows well behind, so the middle is still a ball while the outside is a bowl.
      var open = [], lim = f.max || 1;
      for (var j = 0; j < 6; j++) open.push((still ? 1 : inout(clamp((T - f.t0 - 2.2 - j * 0.9) / 5.2))) * lim);
      open.push((still ? 1 : inout(clamp((T - f.t0 - 1.2) / 3))) * (f.max ? 0.35 : 1)); // sepals
      var breathe = 1 + Math.sin(T * 1.2 + f.seed) * 0.012, bud = Math.min(3, f.c + 1) * 32, own = f.c * 32;
      for (var q = 0, m = p.length; q < m; q += 12) {
        var tier = p[q + 9], o = tier < 0 ? 1 : open[tier], k = sc * breathe, a = 0, w;
        // closed -> cup over the first half, cup -> open over the second
        if (o < 0.5) { a = 6; w = o * 2; } else { w = o * 2 - 1; }
        var x0 = a ? p[q + 6] + (p[q + 3] - p[q + 6]) * w : p[q + 3] + (p[q] - p[q + 3]) * w;
        var y0 = a ? p[q + 7] + (p[q + 4] - p[q + 7]) * w : p[q + 4] + (p[q + 1] - p[q + 4]) * w;
        var z0 = a ? p[q + 8] + (p[q + 5] - p[q + 8]) * w : p[q + 5] + (p[q + 2] - p[q + 5]) * w;
        // a bud is a deeper colour than the flower it becomes: petals pale as they unfold
        var col = tier < 0 || tier === 6 ? 128 + 5 : (o < 0.3 ? bud : own) + Math.round(p[q + 11] * (0.55 + 0.45 * o) * 31);
        plot(f.x + x0 * k, f.y + y0 * k, f.z + z0 * k, tier === 6 ? p[q + 10] : p[q + 10] * (0.75 + 0.25 * o) + 0.2 * (1 - o), col);
      }
    });

    // dots are written straight into the picture's pixels, which is far quicker than drawing each one
    var pw = canvas.width, ph = canvas.height;
    if (!img || img.width !== pw || img.height !== ph) { img = ctx.createImageData(pw, ph); px32 = new Uint32Array(img.data.buffer); }
    px32.fill(0xff000000);
    var d = Math.max(1, Math.round(pitch * 0.8 * dpr));
    function dot(x, y, colour) {
      var x0 = Math.round(((x >> 1) * cellW + (x & 1) * pitch + gap / 2) * dpr), y0 = Math.round(((y >> 2) * cellH + (y & 3) * pitch + gap / 2) * dpr);
      if (x0 < 0 || y0 < 0 || x0 + d > pw || y0 + d > ph) return;
      for (var yy = 0; yy < d; yy++) { var o = (y0 + yy) * pw + x0; for (var xx = 0; xx < d; xx++) px32[o + xx] = colour; }
    }
    // a few faint stars
    stars.forEach(function (s) { if (still || Math.sin(T * s[3] + s[2]) > -0.2) dot(s[0], s[1], STAR); });
    for (var y = 0; y < DH; y++) {
      var row = y * DW;
      for (var x = 0; x < DW; x++) {
        var b = bbuf[row + x];
        if (b <= 0 || b < DITHER[(y & 3) * 2 + (x & 1)] * 0.62) continue;
        var c = cbuf[row + x];
        dot(x, y, c < 128 ? PINKS[c] : GREENS[c - 128]);
      }
    }
    // the sentence is written in like handwriting: each line from left to right, with a bright pen tip
    for (i = 0, n = letters.length; i < n; i += 4) {
      var due = still ? 0 : 18 + letters[i + 2] * 2.2 + letters[i + 3] * 2;
      if (T < due) continue;
      var w = Math.abs(letters[i + 3] - 0.5) * 2;
      dot(letters[i], letters[i + 1], T < due + 0.12 ? 0xffffffff : abgr(255, 232 - w * 62, 240 - w * 36));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }  var lastPaint = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!started || now - lastPaint < 30) return; // about thirty frames a second is plenty
    lastPaint = now;
    render((now - started) / 1000);
  }
  function begin() {
    started = performance.now();
    if (still) { render(40); return; }
    requestAnimationFrame(loop);
  }
  size();
  // the handwriting font arrives a moment after the page: lay the sentence out again once it has
  if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Dancing Script"').then(function () { size(); if (started && still) render(40); }, function () {});
  window.addEventListener('resize', function () { size(); if (started && still) render(40); });

  /* ---------- intro ---------- */
  var word = document.createElement('span');
  word.textContent = LOVE[0];
  var intro = document.createElement('div');
  intro.className = 'intro';
  intro.setAttribute('role', 'button');
  intro.setAttribute('tabindex', '0');
  intro.setAttribute('aria-label', 'Open');
  intro.appendChild(word);
  function leave(e) {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (intro.getAttribute('data-go')) return;
    intro.setAttribute('data-go', '1');
    loadSong();
    var n = still ? LOVE.length : 1;
    word.classList.add('cycling');
    note(NOTES[0]);
    (function next() {
      if (n < LOVE.length) {
        note(NOTES[n % NOTES.length]);
        word.textContent = LOVE[n++];
        setTimeout(next, n <= 3 ? 340 : n >= LOVE.length ? 620 : 210);
        return;
      }
      begin();
      playSong();
      intro.classList.add('leave');
      setTimeout(function () { intro.remove(); }, 1150);
    })();
  }
  intro.addEventListener('click', leave);
  intro.addEventListener('keydown', leave);
  document.body.appendChild(intro);
  intro.focus();
})();
