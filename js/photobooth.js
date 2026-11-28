// /photobooth: a four-shot photo booth.
//  1. Shoot: the camera counts down (you choose how many seconds) and takes four photos.
//  2. Arrange: choose which shots go on the strip and in what order, and pick or upload a frame.
//  3. Print: the finished strip feeds out of a slot in a wooden wall, then can be downloaded.
// Nothing leaves the device: photos stay in the page, uploaded frames are kept in this browser only.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  // The strip is 600 x 1800 pixels (a 2 x 6 inch print at 300 dpi). The four photo windows:
  var SW = 600, SH = 1800, SLOTS = [0, 1, 2, 3].map(function (i) { return { x: 40, y: 40 + i * 410, w: 520, h: 390 }; });
  var PW = 1040, PH = 780; // each photo is kept at twice the size of its window

  var video = $('video'), cam = $('cam'), countEl = $('count'), flashEl = $('flash'), dotsEl = $('dots'), msg = $('msg');
  var strip = $('strip'), sctx = strip.getContext('2d');
  var shots = [];           // every photo taken, each { colour: canvas, grey: canvas }
  var order = [0, 1, 2, 3]; // which shot sits in each of the four windows
  var sel = 0, bw = true, stream = null, busy = false, frames = [], frameId = 'white';

  /* ---------- sound ---------- */
  var actx = null;
  function audio() {
    try { var A = window.AudioContext || window.webkitAudioContext; if (!actx && A) actx = new A(); if (actx && actx.state === 'suspended') actx.resume(); } catch (e) {}
    return actx;
  }
  function beep(freq, dur, vol) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, from, to, vol) { // filtered noise: the shutter click and the printer motor
    var c = audio(); if (!c) return;
    var t = c.currentTime, buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = buf; f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(from, t); f.frequency.linearRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(c.destination); n.start(t); n.stop(t + dur);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- photos ---------- */
  function blank(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Fits any picture into a 4:3 photo, cropping the overflow from the middle.
  function toShot(src, sw, sh, mirror) {
    var c = blank(PW, PH), x = c.getContext('2d'), k = Math.max(PW / sw, PH / sh), dw = sw * k, dh = sh * k;
    if (mirror) { x.translate(PW, 0); x.scale(-1, 1); }
    x.drawImage(src, (PW - dw) / 2, (PH - dh) / 2, dw, dh);
    var g = blank(PW, PH), gx = g.getContext('2d');
    gx.drawImage(c, 0, 0);
    try { // a black and white copy, with a little extra contrast like booth film
      var im = gx.getImageData(0, 0, PW, PH), d = im.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        v = (v - 128) * 1.12 + 128; v = v < 0 ? 0 : v > 255 ? 255 : v;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      gx.putImageData(im, 0, 0);
    } catch (e) {}
    return { colour: c, grey: g };
  }
  function pic(i) { var s = shots[i]; return s ? (bw ? s.grey : s.colour) : null; }

  /* ---------- frames ---------- */
  function windows(x) { SLOTS.forEach(function (s) { x.rect(s.x, s.y, s.w, s.h); }); }
  function border(x, fill) { x.beginPath(); x.rect(0, 0, SW, SH); windows(x); x.fillStyle = fill; x.fill('evenodd'); } // everything except the windows
  // The words at the foot of the strip and on the booth sign are yours to change; they are remembered in this browser.
  var TODAY = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  var words = { title: 'narsheessho', line: TODAY, sign: 'NARSHEESSHO', msg: 'Photos\ndelivered here\nin a moment' };
  try { var kept = JSON.parse(localStorage.getItem('pbWords') || '{}'); ['title', 'sign', 'msg'].forEach(function (k) { if (typeof kept[k] === 'string') words[k] = kept[k]; }); if (typeof kept.line === 'string' && !kept.lineIsDate) words.line = kept.line; } catch (e) {}
  function fitText(x, text, weight, size, family, y, room) { // shrinks long text so it never runs off the strip
    do { x.font = weight + ' ' + size + 'px ' + family; size -= 2; } while (size > 12 && x.measureText(text).width > (room || SW - 70));
    x.fillText(text, SW / 2, y);
  }
  function caption(x, colour) {
    x.fillStyle = colour; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (words.title) fitText(x, words.title, 400, 34, '"Pixelify Sans", monospace', words.line ? 1712 : 1730);
    if (words.line) fitText(x, words.line, 300, 20, 'Jost, sans-serif', words.title ? 1754 : 1730);
  }
  function saveWords() { try { localStorage.setItem('pbWords', JSON.stringify({ title: words.title, line: words.line, lineIsDate: words.line === TODAY, sign: words.sign, msg: words.msg })); } catch (e) {} }
  function showSign() { $('sign-title').textContent = words.sign; $('sign-msg').textContent = words.msg; }
  [['strip-title', 'title'], ['strip-line', 'line'], ['sign-title-in', 'sign'], ['sign-msg-in', 'msg']].forEach(function (p) {
    var el = $(p[0]);
    el.value = words[p[1]];
    el.addEventListener('input', function () { words[p[1]] = el.value.replace(/^\s+/, ''); saveWords(); showSign(); drawStrip(); drawFrames(); });
  });
  var BUILT_IN = [
    { id: 'white', name: 'White', draw: function (x) { border(x, '#fff'); caption(x, '#000'); } },
    { id: 'black', name: 'Black', draw: function (x) { border(x, '#0a0a0a'); caption(x, '#fff'); } },
    { id: 'film', name: 'Film', draw: function (x) {
      border(x, '#0a0a0a'); x.fillStyle = '#f2f2f2';
      for (var y = 22; y < SH - 30; y += 56) { x.fillRect(11, y, 18, 28); x.fillRect(SW - 29, y, 18, 28); }
      caption(x, '#f2f2f2');
    } },
    { id: 'pink', name: 'Pink', draw: function (x) {
      border(x, '#ffd9e5'); x.strokeStyle = '#e88fb0'; x.lineWidth = 3;
      SLOTS.forEach(function (s) { x.strokeRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12); });
      caption(x, '#b54a78');
    } },
    { id: 'flower', name: 'Flower', draw: function (x) { flowers(x, '#fff', '#000', FLOWER); } },
    { id: 'flower-dark', name: 'Flower dark', draw: function (x) { flowers(x, '#0a0a0a', '#fff', FLOWER_WHITE); } },
    { id: 'polka', name: 'Polka', draw: function (x) { polka(x, '#0a0a0a', '#fff'); } },
    { id: 'polka-light', name: 'Polka light', draw: function (x) { polka(x, '#fff', '#0a0a0a'); } },
    { id: 'chrome', name: 'Chrome', draw: function (x) {
      // Gothic silver on black: polished crosses, a bevelled silver edge round every photo, and the title in blackletter.
      border(x, '#09090a');
      SLOTS.forEach(function (s) {
        x.lineWidth = 7; x.strokeStyle = silver(x, s.y - 8, s.y + s.h + 8); x.strokeRect(s.x - 5.5, s.y - 5.5, s.w + 11, s.h + 11);
        x.lineWidth = 1.5; x.strokeStyle = '#000'; x.strokeRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
      });
      x.lineWidth = 5; x.strokeStyle = silver(x, 0, SH); x.strokeRect(4.5, 4.5, SW - 9, SH - 9);
      // small crosses run down both edges, with studs between them
      for (var y = 58, k = 0; y < 1650; y += 82, k++) {
        if (k % 2) { stud(x, 20, y, 5); stud(x, SW - 20, y, 5); } else { cross(x, 20, y, 14); cross(x, SW - 20, y, 14); }
      }
      // one sits on each seam between photos, and two large ones flank the words
      SLOTS.slice(1).forEach(function (s) { cross(x, SW / 2, s.y - 10, 17); stud(x, SW / 2 - 40, s.y - 10, 4); stud(x, SW / 2 + 40, s.y - 10, 4); });
      cross(x, 70, 1730, 44); cross(x, SW - 70, 1730, 44);
      x.fillStyle = silver(x, 1690, 1770); x.textAlign = 'center'; x.textBaseline = 'middle';
      if (words.title) fitText(x, words.title, 400, 50, '"Pirata One", "UnifrakturCook", "Old English Text MT", serif', words.line ? 1714 : 1730, 320);
      if (words.line) { x.fillStyle = '#c9cdd3'; fitText(x, words.line, 400, 18, 'Jost, sans-serif', words.title ? 1760 : 1730, 320); }
    } }
  ];
  function flowers(x, paper, ink, art) {
    border(x, paper);
    // the portfolio's own flower: small ones climb both edges, larger ones tuck into the corners of each
    // photo and sit beside the words
    if (art && (art.width || art.naturalWidth)) {
      var bloom = function (cx, cy, r, rot) { x.save(); x.translate(cx, cy); x.rotate(rot); x.drawImage(art, -r, -r, r * 2, r * 2); x.restore(); };
      for (var y = 62, k = 0; y < 1650; y += 104, k++) {
        bloom(20, y, 13 + (k % 3) * 3, k * 0.7);
        bloom(SW - 20, y + 52, 13 + ((k + 1) % 3) * 3, k * 0.9 + 1);
      }
      SLOTS.forEach(function (s, i) {
        var left = i % 2 === 0;
        bloom(left ? s.x + 2 : s.x + s.w - 2, s.y + s.h + 8, 30, i * 0.8);
        bloom(left ? s.x + s.w - 8 : s.x + 8, s.y + 2, 19, i + 2);
      });
      [[70, 1718, 42, 0.3], [132, 1766, 22, 1], [530, 1718, 42, 1.4], [468, 1766, 22, 2.2]].forEach(function (b) { bloom(b[0], b[1], b[2], b[3]); });
    }
    caption(x, ink);
  }
  function polka(x, paper, ink) {
    border(x, paper);
    // dots staggered row by row, only on the border so the photos stay clear
    x.save(); x.beginPath(); x.rect(0, 0, SW, SH); windows(x); x.clip('evenodd');
    x.fillStyle = ink;
    for (var row = 0, y = 12; y < SH + 10; y += 30, row++) for (var px = (row % 2 ? 30 : 12); px < SW + 10; px += 36) { x.beginPath(); x.arc(px, y, 7.5, 0, 7); x.fill(); }
    x.restore();
    // a plain label, so the words stay readable over the dots
    x.fillStyle = paper; x.strokeStyle = ink; x.lineWidth = 3; x.beginPath();
    if (x.roundRect) x.roundRect(90, 1680, 420, 100, 50); else x.rect(90, 1680, 420, 100);
    x.fill(); x.stroke();
    caption(x, ink);
  }
  // polished silver: light, dark and light again from top to bottom of whatever is being drawn
  function silver(x, y0, y1) {
    var g = x.createLinearGradient(0, y0, 0, y1);
    [[0, '#ffffff'], [0.22, '#b4bac2'], [0.45, '#f3f5f7'], [0.52, '#5a616b'], [0.75, '#d9dde2'], [1, '#8b929c']].forEach(function (s) { g.addColorStop(s[0], s[1]); });
    return g;
  }
  function cross(x, cx, cy, r) { // a flared cross with a boss in the middle
    x.save(); x.translate(cx, cy);
    x.fillStyle = silver(x, -r, r); x.strokeStyle = '#000'; x.lineWidth = Math.max(1, r * 0.06);
    x.beginPath();
    for (var a = 0; a < 4; a++) {
      var c = Math.cos(a * Math.PI / 2), s = Math.sin(a * Math.PI / 2), pt = function (px, py) { return [px * c - py * s, px * s + py * c]; };
      var p1 = pt(-r * 0.13, -r * 0.2), p2 = pt(-r * 0.44, -r), p3 = pt(0, -r * 0.86), p4 = pt(r * 0.44, -r), p5 = pt(r * 0.13, -r * 0.2);
      x.moveTo(p1[0], p1[1]); x.quadraticCurveTo(pt(-r * 0.16, -r * 0.7)[0], pt(-r * 0.16, -r * 0.7)[1], p2[0], p2[1]);
      x.lineTo(p3[0], p3[1]); x.lineTo(p4[0], p4[1]);
      x.quadraticCurveTo(pt(r * 0.16, -r * 0.7)[0], pt(r * 0.16, -r * 0.7)[1], p5[0], p5[1]); x.closePath();
    }
    x.fill(); x.stroke();
    x.beginPath(); x.arc(0, 0, r * 0.26, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#0b0b0c'; x.beginPath(); x.arc(0, 0, r * 0.1, 0, 7); x.fill();
    x.restore();
  }
  function stud(x, cx, cy, r) { x.fillStyle = silver(x, cy - r, cy + r); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  // the flower from the portfolio, used by the Flower frames; the white copy is for the dark one
  var FLOWER = new Image(), FLOWER_WHITE = null;
  FLOWER.onload = function () {
    FLOWER_WHITE = blank(FLOWER.naturalWidth, FLOWER.naturalHeight);
    var c = FLOWER_WHITE.getContext('2d');
    c.drawImage(FLOWER, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, FLOWER_WHITE.width, FLOWER_WHITE.height);
    if (!$('stage-edit').hidden) { drawFrames(); drawStrip(); }
  };
  FLOWER.src = '/assets/flower.png';
  if (document.fonts && document.fonts.load) document.fonts.load('40px "Pirata One"').then(function () { if (!$('stage-edit').hidden) { drawFrames(); drawStrip(); } }, function () {});  function loadFrames() {
    frames = BUILT_IN.slice();
    try {
      JSON.parse(localStorage.getItem('pbFrames') || '[]').forEach(function (f) {
        var im = new Image();
        im.onload = function () { drawStrip(); drawFrames(); };
        im.src = f.data;
        frames.push({ id: f.id, name: f.name, img: im, data: f.data, mine: true });
      });
    } catch (e) {}
    frameId = localStorage.getItem('pbFrame') || 'white';
    if (!frames.some(function (f) { return f.id === frameId; })) frameId = 'white';
  }
  function saveFrames() {
    try { localStorage.setItem('pbFrames', JSON.stringify(frames.filter(function (f) { return f.mine; }).map(function (f) { return { id: f.id, name: f.name, data: f.data }; }))); return true; }
    catch (e) { return false; }
  }
  function paintFrame(x, f) { if (f.draw) f.draw(x); else if (f.img && f.img.complete && f.img.naturalWidth) x.drawImage(f.img, 0, 0, SW, SH); }
  function drawFrames() {
    var box = $('frames'); box.textContent = '';
    frames.forEach(function (f) {
      var wrap = document.createElement('div'), b = document.createElement('button'), c = blank(SW / 4, SH / 4), x = c.getContext('2d'), cap = document.createElement('span');
      wrap.className = 'fr';
      x.scale(0.25, 0.25); x.fillStyle = '#cfcfcf'; x.fillRect(0, 0, SW, SH); paintFrame(x, f);
      b.type = 'button'; b.setAttribute('aria-pressed', String(f.id === frameId)); b.setAttribute('aria-label', f.name + ' frame'); b.appendChild(c);
      b.onclick = function () { frameId = f.id; try { localStorage.setItem('pbFrame', f.id); } catch (e) {} drawFrames(); drawStrip(); };
      cap.textContent = f.name;
      wrap.appendChild(b); wrap.appendChild(cap);
      if (f.mine) {
        var del = document.createElement('button');
        del.className = 'del'; del.type = 'button'; del.textContent = '✕'; del.setAttribute('aria-label', 'Remove ' + f.name + ' frame');
        del.onclick = function () { frames = frames.filter(function (g) { return g !== f; }); if (frameId === f.id) frameId = 'white'; saveFrames(); drawFrames(); drawStrip(); };
        wrap.appendChild(del);
      }
      box.appendChild(wrap);
    });
  }
  // An uploaded frame is any picture with see-through windows. It is resized to the strip and kept in this browser.
  $('frame-file').addEventListener('change', function () {
    var file = this.files[0], note = $('frame-note'); this.value = '';
    if (!file) return;
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var c = blank(SW, SH), x = c.getContext('2d');
      x.drawImage(im, 0, 0, SW, SH); URL.revokeObjectURL(url);
      // a frame with nothing see-through would cover the photos completely
      var d = x.getImageData(0, 0, SW, SH).data, clear = 0;
      for (var i = 3; i < d.length; i += 16) if (d[i] < 40) clear++;
      var data = c.toDataURL('image/png'), f = { id: 'u' + Date.now(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'My frame', data: data, mine: true, img: new Image() };
      f.img.onload = function () { drawFrames(); drawStrip(); };
      f.img.src = data;
      frames.push(f); frameId = f.id;
      var kept = saveFrames();
      note.textContent = clear < d.length / 16 * 0.1 ? 'This frame has no see-through windows, so it will cover your photos. Use the template to see where they go.'
        : kept ? 'Frame added. It is saved in this browser for next time.' : 'Frame added for now. It was too large to save for next time.';
      drawFrames(); drawStrip();
    };
    im.onerror = function () { note.textContent = 'That file could not be read as a picture. Use a PNG with see-through windows.'; };
    im.src = url;
  });
  // The template shows exactly where the four windows are, for designing a frame in any drawing app.
  function template() {
    var c = blank(SW, SH), x = c.getContext('2d');
    border(x, '#ffffff');
    x.strokeStyle = '#ff2d95'; x.lineWidth = 2; x.setLineDash([10, 8]);
    SLOTS.forEach(function (s) { x.strokeRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6); });
    x.setLineDash([]); x.strokeRect(1, 1, SW - 2, SH - 2);
    x.fillStyle = '#ff2d95'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '600 20px Arial, sans-serif';
    x.fillText('FRAME TEMPLATE  ·  600 × 1800 px', SW / 2, 1694);
    x.font = '400 15px Arial, sans-serif';
    ['The 4 windows are see-through: photos show through them.', 'Draw on the white area only, then delete these pink guides.', 'Save as PNG with a transparent background.']
      .forEach(function (l, i) { x.fillText(l, SW / 2, 1724 + i * 21); });
    return c;
  }
  function download(canvas, name) {
    canvas.toBlob(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  }
  $('template').onclick = function () { download(template(), 'photobooth-frame-template.png'); $('frame-note').textContent = 'Template downloaded. Design on it, then upload it here as a frame.'; };

  /* ---------- the strip ---------- */
  function drawStrip() {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, SW, SH);
    SLOTS.forEach(function (s, i) {
      var p = pic(order[i]);
      if (p) sctx.drawImage(p, s.x, s.y, s.w, s.h); else { sctx.fillStyle = '#e4e4e4'; sctx.fillRect(s.x, s.y, s.w, s.h); }
    });
    var f = frames.filter(function (g) { return g.id === frameId; })[0];
    if (f) paintFrame(sctx, f);
  }
  function thumb(i) { var c = blank(192, 144), p = pic(i); if (p) c.getContext('2d').drawImage(p, 0, 0, 192, 144); return c; }
  function move(from, to) { // lift one slot out and put it back somewhere else
    if (to < 0 || to > 3 || from === to) return;
    var v = order.splice(from, 1)[0]; order.splice(to, 0, v); sel = to; drawEdit();
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }
  function place(shot, slot) { // put a shot in a slot; if it is already in another slot, the two trade places
    var at = order.indexOf(shot);
    if (at >= 0) order[at] = order[slot];
    order[slot] = shot; sel = slot; drawEdit();
  }
  function drawEdit() {
    var list = $('slots'), pool = $('pool');
    list.textContent = ''; pool.textContent = '';
    order.forEach(function (shot, i) {
      var li = document.createElement('li'), n = document.createElement('span'), lab = document.createElement('span'), grip = document.createElement('span');
      li.className = i === sel ? 'sel' : ''; li.tabIndex = 0; li.setAttribute('data-slot', i);
      li.setAttribute('aria-label', 'Slot ' + (i + 1) + ', showing shot ' + (shot + 1) + (i === sel ? ', selected' : '') + '. Drag to reorder, or press the up and down arrow keys.');
      n.className = 'n'; n.textContent = i + 1;
      lab.className = 'lab'; lab.textContent = 'Shot ' + (shot + 1);
      grip.className = 'grip'; grip.textContent = '⋮⋮'; grip.setAttribute('aria-hidden', 'true');
      li.appendChild(n); li.appendChild(thumb(shot)); li.appendChild(lab); li.appendChild(grip);
      li.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; drawEdit(); refocus(i); }
        if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); move(i, i - 1); refocus(i - 1); }
        if (e.key === 'ArrowDown' && i < 3) { e.preventDefault(); move(i, i + 1); refocus(i + 1); }
      };
      list.appendChild(li);
    });
    shots.forEach(function (s, i) {
      var b = document.createElement('button'), at = order.indexOf(i);
      b.type = 'button'; b.className = at >= 0 ? 'used' : ''; b.setAttribute('data-shot', i);
      b.setAttribute('aria-label', 'Shot ' + (i + 1) + (at >= 0 ? ', in slot ' + (at + 1) : ', not on the strip') + '. Put it in slot ' + (sel + 1));
      b.appendChild(thumb(i));
      if (at >= 0) { var tag = document.createElement('b'); tag.textContent = at + 1; b.appendChild(tag); }
      b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(i, sel); } };
      pool.appendChild(b);
    });
    drawStrip();
  }
  function refocus(i) { var li = $('slots').children[i]; if (li) li.focus(); }

  // Drag and drop, by mouse or finger. Pick up a slot to move it to another position, or pick up one of
  // your shots and drop it on a slot. A press that does not move is a tap: it selects a slot, or places a shot.
  (function () {
    var drag = null;
    function slotAt(x, y) { var el = document.elementFromPoint(x, y); el = el && el.closest ? el.closest('#slots li') : null; return el ? +el.getAttribute('data-slot') : -1; }
    function mark(i) { Array.prototype.forEach.call($('slots').children, function (li, k) { li.classList.toggle('over', k === i && !(drag.slot === k)); }); }
    $('stage-edit').addEventListener('pointerdown', function (e) {
      if (e.button) return;
      var li = e.target.closest('#slots li'), b = e.target.closest('#pool button');
      if (!li && !b) return;
      drag = { slot: li ? +li.getAttribute('data-slot') : -1, shot: b ? +b.getAttribute('data-shot') : -1, x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null, src: li || b };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.ghost) {
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 7) return;
        var shot = drag.slot >= 0 ? order[drag.slot] : drag.shot, g = thumb(shot);
        g.className = 'ghost-pic'; g.style.width = '120px'; g.style.height = '90px';
        document.body.appendChild(g); document.documentElement.classList.add('dragging');
        if (drag.slot >= 0) drag.src.classList.add('lift');
        drag.ghost = g;
      }
      e.preventDefault();
      drag.ghost.style.transform = 'translate(' + (e.clientX - 60) + 'px,' + (e.clientY - 45) + 'px) rotate(-3deg)';
      mark(slotAt(e.clientX, e.clientY));
    }, { passive: false });
    function end(e) {
      if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      document.documentElement.classList.remove('dragging');
      if (!d.ghost) { // a tap
        if (e.type === 'pointerup') { if (d.slot >= 0) { sel = d.slot; drawEdit(); } else if (d.shot >= 0) place(d.shot, sel); }
        return;
      }
      d.ghost.remove();
      var to = e.type === 'pointerup' ? slotAt(e.clientX, e.clientY) : -1;
      if (to < 0) { drawEdit(); return; }
      if (d.slot >= 0) move(d.slot, to); else place(d.shot, to);
    }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  })();
  /* ---------- stages ---------- */
  function show(id) {
    ['stage-shoot', 'stage-edit', 'stage-print'].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function toEdit() {
    if (shots.length < 4) return;
    order = order.filter(function (i) { return i < shots.length; });
    for (var i = 0; order.length < 4 && i < shots.length; i++) if (order.indexOf(i) < 0) order.push(i);
    stopCam(); show('stage-edit'); drawFrames(); drawEdit();
  }

  /* ---------- camera ---------- */
  function startCam() {
    msg.hidden = false; msg.textContent = 'Starting the camera…'; $('start').disabled = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'This browser cannot open the camera here. You can still use photos from your device.'; return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }).then(function (s) {
      stream = s; video.srcObject = s; msg.hidden = true; $('start').disabled = false;
      return video.play();
    }).catch(function () {
      msg.textContent = 'The camera is blocked or not available. Allow camera access for this page and reload, or use photos from your device.';
    });
  }
  function stopCam() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; video.srcObject = null; } }
  function dots(done, total) { dotsEl.textContent = ''; for (var i = 0; i < total; i++) { var d = document.createElement('i'); if (i < done) d.className = 'on'; dotsEl.appendChild(d); } }
  function seconds() { var v = Math.round(+$('secs').value || 3); return Math.max(1, Math.min(15, v)); }
  function setSeconds(v) { v = Math.max(1, Math.min(15, v)); $('secs').value = v; try { localStorage.setItem('pbSecs', v); } catch (e) {} }

  // Counts down, flashes and keeps the picture, `total` times.
  async function shoot(total) {
    if (busy || !stream) return;
    busy = true; audio();
    $('start').disabled = true; $('shoot-note').textContent = '';
    var secs = seconds();
    for (var n = 0; n < total; n++) {
      dots(n, total);
      for (var k = secs; k >= 1; k--) {
        countEl.textContent = k; countEl.classList.remove('tick'); void countEl.offsetWidth; countEl.classList.add('tick');
        beep(k === 1 ? 990 : 660, 0.12);
        await wait(1000);
      }
      countEl.textContent = '';
      flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
      hiss(0.09, 5200, 1800, 0.25); beep(1500, 0.05, 0.05);
      if (video.videoWidth) shots.push(toShot(video, video.videoWidth, video.videoHeight, true));
      dots(n + 1, total);
      await wait(900);
    }
    busy = false; $('start').disabled = false;
    if (shots.length >= 4) toEdit(); else $('shoot-note').textContent = 'The camera did not return a picture. Try again, or use photos from your device.';
  }

  /* ---------- controls ---------- */
  $('secs-down').onclick = function () { setSeconds(seconds() - 1); };
  $('secs-up').onclick = function () { setSeconds(seconds() + 1); };
  $('secs').onchange = function () { setSeconds(seconds()); };
  Array.prototype.forEach.call($('look').children, function (b) {
    b.onclick = function () {
      bw = b.getAttribute('data-bw') === '1'; cam.classList.toggle('bw', bw);
      Array.prototype.forEach.call($('look').children, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      try { localStorage.setItem('pbLook', bw ? '1' : '0'); } catch (e) {}
    };
  });
  var mode = 4; // how many shots the Start button takes: four at first, one when adding to a set
  $('start').onclick = function () { shoot(mode); };
  $('files').addEventListener('change', function () {
    var list = Array.prototype.slice.call(this.files), left = list.length, note = $('shoot-note'); this.value = '';
    if (!left) return;
    list.forEach(function (file) {
      var im = new Image(), url = URL.createObjectURL(file);
      im.onload = function () { shots.push(toShot(im, im.naturalWidth, im.naturalHeight, false)); URL.revokeObjectURL(url); next(); };
      im.onerror = function () { URL.revokeObjectURL(url); next(); };
      im.src = url;
    });
    function next() { if (--left) return; if (shots.length >= 4) toEdit(); else note.textContent = 'You have ' + shots.length + ' of 4 photos. Add ' + (4 - shots.length) + ' more.'; }
  });
  $('more').onclick = function () { mode = 1; $('start').textContent = 'Take 1 shot'; show('stage-shoot'); startCam(); };
  $('redo').onclick = function () { shots = []; order = [0, 1, 2, 3]; sel = 0; mode = 4; $('start').textContent = 'Start · 4 shots'; dots(0, 4); show('stage-shoot'); startCam(); };
  $('again').onclick = function () { $('redo').onclick(); };
  $('back').onclick = function () { show('stage-edit'); };

  /* ---------- print ---------- */
  $('print').onclick = function () {
    drawStrip(); audio();
    var booth = $('stage-print'), url = strip.toDataURL('image/png');
    $('out').src = url; $('save').href = url;
    booth.classList.remove('go', 'done'); show('stage-print'); void booth.offsetWidth; booth.classList.add('go');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!still) [700, 2360, 4030, 5690].forEach(function (t) { setTimeout(function () { if (!booth.hidden) hiss(1.0, 900, 1500, 0.07); }, t); }); // the motor runs once per photo
    setTimeout(function () { booth.classList.add('done'); if (!still && !booth.hidden) beep(1320, 0.18, 0.08); }, still ? 200 : 7300);
  };

  /* ---------- start ---------- */
  try { setSeconds(+localStorage.getItem('pbSecs') || 3); if (localStorage.getItem('pbLook') === '0') $('look').children[1].onclick(); } catch (e) {}
  loadFrames(); dots(0, 4); showSign();
  // ?demo fills the booth with four sample pictures, for trying the arranging and printing without a camera
  if (/[?&]demo\b/.test(location.search)) {
    [['#f6c9d6', '#c0527f'], ['#cfe3ff', '#3f6fb5'], ['#ffe7b8', '#c98a1f'], ['#d6f2dc', '#3d8f56']].forEach(function (col, i) {
      var c = blank(PW, PH), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, PW, PH);
      g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(PW / 2, PH * 0.42, 150, 0, 7); x.fill(); x.beginPath(); x.ellipse(PW / 2, PH * 1.05, 330, 300, 0, 0, 7); x.fill();
      x.fillStyle = col[1]; x.font = '600 150px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(i + 1, PW / 2, PH * 0.42);
      shots.push(toShot(c, PW, PH, false));
    });
    toEdit();
  } else startCam();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!$('stage-edit').hidden) { drawFrames(); drawStrip(); } });
})();
