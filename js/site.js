(function () {
  var h = UI.h, img = UI.img, folder = UI.folder;
  var TOOLS = ['photoshop', 'canva', 'figma', 'excel', 'word', 'powerpoint', 'vscode', 'capcut', 'claude', 'gemini', 'jira', 'chatgpt', 'lightroom'];
  var CATS = Store.CATEGORIES, SHADES = Store.SHADES;
  var app = document.getElementById('app');
  var page = document.body.getAttribute('data-page');
  var C;

  // The nav floats over the page with no background. Each item looks at what is directly behind it
  // and switches between black and white, so it stays readable over folders, bars and the marquee.
  function contrastNav(el) {
    var items = el.querySelectorAll('a'), queued = false;
    function rgb(str) {
      var m = /rgba?\(([^)]+)\)/.exec(str || '');
      if (!m) return null;
      var p = m[1].split(/[,\s\/]+/).map(parseFloat);
      return p.length > 3 && p[3] < 0.5 ? null : p;
    }
    function behind(x, y) {
      var stack = document.elementsFromPoint(x, y);
      for (var i = 0; i < stack.length; i++) {
        var n = stack[i];
        if (el.contains(n)) continue;
        var tag = n.tagName.toLowerCase();
        if (tag === 'img' || tag === 'video' || tag === 'canvas' || tag === 'iframe') return 'image';
        var cs = getComputedStyle(n);
        if (n instanceof SVGElement) {
          var fill = tag === 'svg' ? null : rgb(cs.fill);
          if (fill) return fill;
          continue;
        }
        var bg = rgb(cs.backgroundColor);
        if (bg) return bg;
      }
      return [255, 255, 255];
    }
    function update() {
      queued = false;
      Array.prototype.forEach.call(items, function (a) {
        var r = a.getBoundingClientRect();
        if (!r.width) return;
        // Three points across the item, so one that straddles an edge follows the larger part.
        var image = 0, lum = 0, y = r.top + r.height / 2;
        [0.2, 0.5, 0.8].forEach(function (k) {
          var c = behind(r.left + r.width * k, y);
          if (c === 'image') { image++; return; }
          lum += (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
        });
        a.classList.toggle('on-image', image >= 2);
        a.classList.toggle('on-dark', image >= 2 || lum / Math.max(1, 3 - image) < 150);
      });
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    setInterval(update, 700); // also catches things that move under it without scrolling
    setTimeout(update, 200);
  }

  function nav() {
    // About is not a page of its own: it is the section straight under the cover on the home page.
    var items = [['about', 'index.html#about'], ['projects', 'projects.html'], ['contact', 'contact.html']];
    // On a phone the menu is a floating glass bar of icons along the bottom, with Home as its first item.
    // On wider screens the icons are hidden and the words show instead. The icons are drawn in the
    // text colour, so they flip to white over dark parts of the page just as the words do.
    var ICONS = {
      about: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5v-1.2c0-3 3.2-5 7.5-5s7.5 2 7.5 5v1.2"/>',
      projects: '<path d="M2.5 5.5h6.8l2.4 2.6h9.8v11.4h-19z"/>',
      contact: '<path d="M2.5 5.5h19v13h-19z"/><path d="M2.8 6l9.2 7 9.2-7"/>'
    };
    function item(name, href, current) {
      var ico = h('span', { class: 'ico' + (name === 'home' ? ' flower' : ''), 'aria-hidden': 'true' });
      if (ICONS[name]) ico.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square">' + ICONS[name] + '</svg>';
      return h('li', { class: name === 'home' ? 'm-only' : null }, h('a', { href: href, 'aria-current': current ? 'page' : null }, ico, h('span', { class: 'lab', text: name })));
    }
    var glass = h('div', { class: 'glass' }, h('ul', null, item('home', 'index.html', page === 'home'), items.map(function (i) { return item(i[0], i[1], page === i[0]); })));
    var el = h('nav', { class: 'nav', 'aria-label': 'Main' },
      page === 'home' ? h('span') : h('a', { class: 'home', href: 'index.html', 'aria-label': 'Home' }, h('img', { src: 'assets/flower.png', alt: '' })),
      glass);
    contrastNav(el);
    waterDrop(glass);
    if (page === 'home') {
      // On the home page, Home and About glide up and down the same page instead of loading anything, and
      // the menu marks whichever of the two you are looking at.
      var homeA = glass.querySelector('li.m-only a'), aboutA = glass.querySelector('a[href$="#about"]'), inAbout = null;
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      var spy = function () {
        var sec = document.getElementById('about');
        if (!sec) return;
        var now = sec.getBoundingClientRect().top < window.innerHeight * 0.55;
        if (now === inAbout) return;
        inAbout = now;
        if (now) { aboutA.setAttribute('aria-current', 'true'); homeA.removeAttribute('aria-current'); } else { homeA.setAttribute('aria-current', 'page'); aboutA.removeAttribute('aria-current'); }
        glass.dispatchEvent(new Event('navchange'));
      };
      aboutA.addEventListener('click', function (e) {
        var sec = document.getElementById('about');
        if (!sec) return;
        e.preventDefault(); sec.scrollIntoView({ behavior: calm, block: 'start' });
        try { history.replaceState(null, '', '#about'); } catch (err) {}
      });
      homeA.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: calm }); try { history.replaceState(null, '', location.pathname); } catch (err) {} });
      window.addEventListener('scroll', spy, { passive: true });
      setTimeout(spy, 0);
    }
    return el;
  }

  // The links sit in a pill of glass. A drop of water rests on the current page and runs to whichever link is
  // pointed at: its front edge leaves first so it stretches, two droplets break off and catch up, and it
  // lands with a ripple. The goo filter is what makes the drop and droplets merge like liquid.
  function waterDrop(glass) {
    if (!document.getElementById('goo')) {
      var svg = h('div', { 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
      svg.innerHTML = '<svg width="0" height="0"><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="4"/>' +
        '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></svg>';
      document.body.appendChild(svg);
    }
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var drop = h('i', { class: 'drop' }), drops = h('span', { class: 'drops' }, drop);
    var wrap = h('span', { class: 'dropwrap', 'aria-hidden': 'true' }, drops);
    glass.insertBefore(wrap, glass.firstChild);
    var home = null, at = null, phone = window.matchMedia('(max-width: 760px)');
    function seen() { var marked = glass.querySelector('a[aria-current]'); home = marked && marked.offsetWidth ? marked : null; return home; } // the Home item only exists on a phone
    // Each edge of the drop is on its own spring, so it glides instead of snapping, can change its mind
    // mid-way without a jump, and the back edge trails the front one (that is the stretch).
    var cur = null, tgt = null, vl = 0, vr = 0, raf = 0, last = 0, busy = false;

    function box(a) {
      var g = glass.getBoundingClientRect(), r = a.getBoundingClientRect(), pad = phone.matches ? 2 : r.height * 0.6;
      return { l: r.left - g.left - pad, r: g.right - r.right - pad };
    }
    function paint() { drop.style.left = cur.l.toFixed(2) + 'px'; drop.style.right = cur.r.toFixed(2) + 'px'; }
    function spring(x, v, to, w, dt) { // critically damped: no overshoot, no wobble
      var acc = w * w * (to - x) - 2 * w * v;
      v += acc * dt;
      return [x + v * dt, v];
    }
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.034), right = tgt.l > cur.l, s;
      last = now;
      for (var i = 0; i < 2; i++) { // two half steps keep the spring steady on slow frames
        s = spring(cur.l, vl, tgt.l, right ? 11 : 19, dt / 2); cur.l = s[0]; vl = s[1];
        s = spring(cur.r, vr, tgt.r, right ? 19 : 11, dt / 2); cur.r = s[0]; vr = s[1];
      }
      if (Math.abs(tgt.l - cur.l) + Math.abs(tgt.r - cur.r) < 0.4 && Math.abs(vl) + Math.abs(vr) < 4) {
        cur = { l: tgt.l, r: tgt.r }; vl = vr = 0; raf = 0;
        paint();
        ripple();
        return;
      }
      paint();
      raf = requestAnimationFrame(frame);
    }
    // one droplet breaks off the back of the drop and catches up; never more than one at a time
    function droplet(fromMid, toMid) {
      if (busy || Math.abs(toMid - fromMid) < 30) return;
      busy = true;
      var size = glass.clientHeight * 0.34;
      var bead = h('i', { class: 'bead', style: 'width:' + size + 'px;height:' + size + 'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;left:' + fromMid + 'px' });
      var end = function () { bead.remove(); busy = false; };
      drops.appendChild(bead);
      bead.animate([{ transform: 'translateX(0) scale(1)' }, { transform: 'translateX(' + (toMid - fromMid) + 'px) scale(.6)' }],
        { duration: 620, delay: 90, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'both' }).onfinish = end;
      setTimeout(end, 1200);
    }
    function ripple() {
      var ring = h('i', { class: 'ring', style: 'left:' + cur.l + 'px;right:' + cur.r + 'px' });
      wrap.parentNode.insertBefore(ring, wrap.nextSibling);
      ring.animate([{ transform: 'scale(1)', opacity: 0.55 }, { transform: 'scale(1.18, 1.35)', opacity: 0 }],
        { duration: 700, easing: 'cubic-bezier(.2, .6, .3, 1)', fill: 'both' }).onfinish = function () { ring.remove(); };
      setTimeout(function () { ring.remove(); }, 1400);
    }
    function go(a, instant) {
      if (!a) { wrap.classList.remove('show'); at = null; return; }
      if (a === at && !instant) return;
      var to = box(a), fresh = !at || !cur;
      at = a;
      wrap.classList.add('show');
      if (instant || still || fresh) {
        cancelAnimationFrame(raf); raf = 0;
        cur = to; tgt = to; vl = vr = 0;
        paint();
        if (fresh && !instant && !still) drop.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        return;
      }
      var w = glass.clientWidth;
      droplet((cur.l + w - cur.r) / 2, (to.l + w - to.r) / 2);
      tgt = to;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    Array.prototype.forEach.call(glass.querySelectorAll('a'), function (a) {
      a.addEventListener('pointerenter', function () { go(a); });
      a.addEventListener('focus', function () { go(a); });
      a.addEventListener('blur', function () { go(home); });
    });
    glass.addEventListener('pointerleave', function () { go(home); });
    function rest() { seen(); if (at && !at.offsetWidth) at = null; if (at || home) go(at || home, true); else go(null); }
    window.addEventListener('resize', rest);
    glass.addEventListener('navchange', function () { seen(); at = null; go(home); }); // the current page mark moved: let the drop flow to it
    setTimeout(rest, 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
  }

  function marquee() {
    var run = [];
    for (var i = 0; i < 40; i++) run.push(h('span', { text: C.site.marquee + ' —' }));
    return h('div', { class: 'marquee', 'aria-hidden': 'true' }, h('div', null, run));
  }

  // Types each role in turn after "and i'm a".
  function typed(roles) {
    var text = h('b', { text: roles[0] });
    var wrap = h('span', { class: 'typed', 'aria-hidden': 'true' }, text, h('span', { class: 'caret' }));
    if (roles.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return wrap;
    var i = 0, n = roles[0].length, deleting = true;
    function tick() {
      var wait;
      if (deleting) {
        if (n > 0) { n--; wait = 38; } else { deleting = false; i = (i + 1) % roles.length; wait = 260; }
      } else if (n < roles[i].length) { n++; wait = 75; } else { deleting = true; wait = 1700; }
      text.textContent = roles[i].slice(0, n);
      setTimeout(tick, wait);
    }
    setTimeout(tick, 1700);
    return wrap;
  }

  // The name inside the greeting is a quiet link to the admin sign in.
  function greeting(s) {
    var at = s.name ? s.greeting.indexOf(s.name) : -1;
    if (at < 0) return s.greeting;
    return [s.greeting.slice(0, at), h('a', { class: 'me', href: 'admin.html', 'aria-label': s.name + ', admin sign in', text: s.name }), s.greeting.slice(at + s.name.length)];
  }

  function aboutBlock(open) {
    var s = C.site;
    var roles = h('div', { class: 'roles', id: 'roles', hidden: !open }, s.roles.map(function (name, i) {
      return h('a', { class: 'role', href: 'projects.html#' + CATS[i] },
        h('span', { class: 'fwrap', style: 'display:block' }, folder(SHADES[i]), h('span', { class: 'num', text: '0' + (i + 1) })),
        name);
    }));
    var more = h('a', { class: 'more', href: '#roles', 'aria-expanded': String(!!open), text: s.whatElse, onclick: function (e) {
      e.preventDefault();
      roles.hidden = !roles.hidden;
      more.setAttribute('aria-expanded', String(!roles.hidden));
      bio.classList.toggle('open', !roles.hidden);
      rule.classList.toggle('open', !roles.hidden);
    } });
    var bio = h('p', { class: 'bio' + (open ? ' open' : '') }, s.bio, more);
    var rule = h('div', { class: 'rule' + (open ? ' open' : '') });
    // Only pointing at "what else?" itself swaps the shading.
    ['mouseenter', 'focus'].forEach(function (ev) { more.addEventListener(ev, function () { bio.classList.add('peek'); }); });
    ['mouseleave', 'blur'].forEach(function (ev) { more.addEventListener(ev, function () { bio.classList.remove('peek'); }); });
    return h('section', { class: 'about', id: 'about' },
      h('div', null,
        h('h2', { 'aria-label': s.greeting + ' ' + s.greetingLead + ' ' + s.roles.join(', ') }, greeting(s), h('br'), s.greetingLead + ' ', typed(s.roles)),
        bio,
        rule,
        roles),
      h('div', { class: 'portrait' }, s.portrait ? img(s.portrait, '', 'Portrait') : null));
  }

  // Each icon gets its own size, height and spacing so the row reads as scattered, then the whole band drifts sideways.
  var SCATTER = [
    [1.25, 0.08, 0.9], [0.7, 0.52, 0.5], [1.5, 0.3, 1.1], [0.85, 0.02, 0.6], [1.1, 0.5, 0.8], [0.6, 0.22, 0.45], [1.4, 0.04, 1.0],
    [0.9, 0.46, 0.7], [1.2, 0.2, 0.55], [0.65, 0.6, 0.9], [1.55, 0.26, 0.75], [0.8, 0.0, 0.5], [1.05, 0.42, 1.0]
  ];
  function tools() {
    function set(hidden) {
      return TOOLS.map(function (t, i) {
        var p = SCATTER[i % SCATTER.length];
        return h('img', { src: 'assets/tools/' + t + '.png', alt: hidden ? '' : t, 'aria-hidden': hidden ? 'true' : null,
          style: '--s:' + p[0] + ';--y:' + p[1] + ';--g:' + p[2] + ';--d:' + (i * -0.7).toFixed(1) + 's' });
      });
    }
    return h('div', { class: 'tools-flow', 'aria-label': 'Tools I use' }, h('div', { class: 'tools-track' }, set(false), set(true)));
  }
  // Drifting icons (on the Projects cover): each tool is ONE element, so it can never be on screen twice. Every pass it picks a new
  // height, size, speed and depth, sometimes crossing in front of the logo and sometimes behind it.
  function heroIcons() {
    var back = h('div', { class: 'hero-flow back', 'aria-hidden': 'true' });
    var front = h('div', { class: 'hero-flow front', 'aria-hidden': 'true' });
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var BANDS = 9, band = Math.floor(Math.random() * BANDS);
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function launch(el, progress) {
      var hero = back.parentNode;
      if (!hero) return;
      var W = hero.clientWidth, H = hero.clientHeight;
      var size = Math.max(34, Math.min(78, W * 0.041)) * rnd(0.6, 1.65);
      band = (band + 2 + Math.floor(Math.random() * 5)) % BANDS; // never the same height twice in a row
      var y = (band + rnd(0.05, 0.95)) / BANDS * (H - size * 1.3);
      back.appendChild(el); // icons always pass behind the logo and text
      el.style.width = size + 'px';
      if (still) { el.style.transform = 'translate(' + (progress || 0) * W + 'px,' + y + 'px)'; return; }
      var spin = rnd(-16, 16);
      var run = el.animate([
        { transform: 'translate(' + (W + size) + 'px,' + y + 'px) rotate(' + (-spin) + 'deg)' },
        { transform: 'translate(' + (-size * 1.6) + 'px,' + (y + rnd(-0.08, 0.08) * H) + 'px) rotate(' + spin + 'deg)' }
      ], { duration: rnd(18000, 40000), easing: 'linear', fill: 'both' });
      if (progress) run.currentTime = progress * run.effect.getComputedTiming().duration;
      run.onfinish = function () { launch(el, 0); };
    }
    var icons = TOOLS.map(function (t) { return h('img', { src: 'assets/tools/' + t + '.png', alt: '' }); });
    icons.sort(function () { return Math.random() - 0.5; });
    return {
      back: back, front: front,
      start: function () {
        icons.forEach(function (el, i) { launch(el, (i + rnd(0.1, 0.9)) / icons.length * 0.94); });
        back.classList.add('go'); front.classList.add('go');
      }
    };
  }
  function link(label, href) {
    return href ? h('a', { href: href, target: '_blank', rel: 'noopener', text: label }) : h('a', { text: label });
  }

  function footer() {
    var s = C.site;
    return h('footer', { class: 'footer' },
      h('div', { class: 'row' },
        h('a', { class: 'logo', href: 'index.html', 'aria-label': 'Home' }, h('img', { src: 'assets/footer-logo.png', alt: 'narsheessho' })),
        h('div', { class: 'links' },
          link('Linkedin', s.linkedin), link('Facebook', s.facebook), link('Instagram', s.instagram),
          h('a', { href: 'mailto:' + s.email, text: s.email }),
          h('div', { class: 'copy', text: s.copyright }))),
      h('div', { class: 'bars' }, CATS.map(function (c, i) {
        return h('a', { class: 'b' + (i + 1), href: 'projects.html#' + c, 'aria-label': s.roles[i] + ' projects' });
      })));
  }

  function toTop() {
    var b = h('button', { class: 'totop', 'aria-label': 'Back to top', onclick: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); } }, UI.arrow('up'));
    // Stays out of the way of the footer links at the very bottom of the page.
    var place = function () {
      var nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 140;
      b.style.visibility = nearEnd || window.scrollY < 200 ? 'hidden' : '';
    };
    window.addEventListener('scroll', place, { passive: true });
    place();
    return b;
  }

  // Cover liquid: a blob of black magnetic fluid, like the ferrofluid in a visualiser speaker. It is a handful
  // of soft balls that merge wherever they touch. The big ones churn round each other and pulse; the small
  // ones lag behind, so the blob stretches, sheds droplets and swallows them again; and every second or so
  // it "beats", throwing out a ring of spikes the way real ferrofluid does near a magnet. It wanders on its
  // own, and while the mouse is over the cover it is drawn to the pointer. A click or tap on the cover
  // parks it in the middle, where it stays (still churning) until the next click sets it loose again.
  function ferro(hero) {
    var canvas = h('canvas', { class: 'ferro', 'aria-hidden': 'true' }), ctx = canvas.getContext('2d');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 0, H = 0, S = 0, dpr = 1, G = 8, cols = 0, rows = 0, field = null, balls = [], raf = 0, born = 0, seen = true, topY = 0, navY = 0;
    var mid = { x: 0, y: 0, vx: 0, vy: 0 }, ptr = { x: 0, y: 0, on: false }, parked = false, floorY = 1e9, beat = 0, nextBeat = 0, lastT = 0, sim = 0, acc = 0, prev = 0;
    hero.insertBefore(canvas, hero.firstChild);
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function size() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height; S = Math.min(W, H);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      G = Math.max(4, Math.round(S / 150));
      cols = Math.ceil(W / G) + 1; rows = Math.ceil(H / G) + 1;
      field = new Float32Array(cols * rows);
      // keep the liquid clear of the menu, whether the menu sits along the top or (on a phone) the bottom
      var navEl = hero.querySelector('.nav .glass'), nr = navEl ? navEl.getBoundingClientRect() : null;
      navY = 0; floorY = 1e9;
      if (nr && nr.top - r.top > H / 2) floorY = nr.top - r.top - 10; else if (nr) navY = nr.bottom - r.top + 10;
      topY = navY + S * 0.17;
      if (!balls.length) {
        mid.x = W * 0.5; mid.y = H * 0.55;
        for (var i = 0; i < 26; i++) {
          // six big balls make the body, ten droplets trail it, ten "spikes" wait inside for each beat
          var kind = i < 6 ? 0 : i < 16 ? 1 : 2;
          balls.push({ kind: kind, big: kind === 0,
            r: kind === 0 ? rnd(0.036, 0.062) : kind === 1 ? rnd(0.009, 0.024) : rnd(0.013, 0.022),
            reach: kind === 0 ? rnd(0.04, 0.13) : kind === 1 ? rnd(0.12, 0.3) : rnd(0.03, 0.06),
            k: kind === 0 ? rnd(0.03, 0.07) : kind === 1 ? rnd(0.006, 0.02) : rnd(0.06, 0.1),
            f: kind === 1 ? rnd(0.5, 1.6) : rnd(0.9, 2.3), g: kind === 1 ? rnd(0.5, 1.6) : rnd(0.9, 2.3), p: rnd(0, 6.3), q: rnd(0, 6.3),
            a: (i - 16) / 10 * 6.283 + rnd(-0.2, 0.2), x: mid.x, y: mid.y, vx: 0, vy: 0 });
        }
      }
    }
    function step(t) {
      // where the blob wants to be: the middle if it is parked, the pointer if that is over the cover,
      // otherwise a wandering path of its own
      var tx = parked ? W * 0.5 : ptr.on ? ptr.x : W * (0.5 + 0.3 * Math.sin(t * 0.41) + 0.1 * Math.sin(t * 1.07 + 1));
      var ty = parked ? H * 0.5 : ptr.on ? ptr.y : H * (0.52 + 0.2 * Math.sin(t * 0.53 + 2) + 0.07 * Math.cos(t * 0.93));
      ty = Math.min(floorY - S * 0.17, Math.max(topY, ty));
      mid.vx = (mid.vx + (tx - mid.x) * 0.02) * 0.9; mid.vy = (mid.vy + (ty - mid.y) * 0.02) * 0.9;
      mid.x += mid.vx; mid.y += mid.vy;
      // the beat: at uneven intervals everything is kicked outward and the spikes shoot out, then it all settles
      var dt = Math.min(0.05, Math.max(0, t - lastT)), kick = false;
      lastT = t; beat *= Math.pow(0.02, dt);
      if (t > nextBeat) { nextBeat = t + rnd(0.7, 1.7); beat = 1; kick = true; }
      var turn = t * 0.9; // the body slowly churns round its own middle
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i], ax, ay;
        if (b.kind === 2) { // a spike: tucked inside the body, thrown outward on the beat
          var out = (b.reach + beat * 0.15) * S, an = b.a + turn * 0.6;
          ax = mid.x + Math.cos(an) * out; ay = mid.y + Math.sin(an) * out;
        } else {
          var c = Math.cos(turn * (b.kind ? 0.4 : 1)), s = Math.sin(turn * (b.kind ? 0.4 : 1));
          var ox = Math.cos(t * b.f + b.p) * b.reach * S, oy = Math.sin(t * b.g + b.q) * b.reach * S;
          ax = mid.x + ox * c - oy * s; ay = mid.y + ox * s + oy * c;
        }
        if (kick && b.kind !== 2) { var kx = b.x - mid.x, ky = b.y - mid.y, kl = Math.sqrt(kx * kx + ky * ky) || 1; b.vx += kx / kl * S * 0.012; b.vy += ky / kl * S * 0.012; }
        b.vx = (b.vx + (ax - b.x) * b.k) * 0.9; b.vy = (b.vy + (ay - b.y) * b.k) * 0.9;
        b.x += b.vx; b.y += b.vy;
        var rr = b.r * S * 1.2, roof = navY + rr, fl = floorY - rr; // droplets bounce off an invisible line beside the menu
        if (b.y < roof) { b.y = roof; b.vy = Math.abs(b.vy) * 0.3; }
        if (b.y > fl) { b.y = fl; b.vy = -Math.abs(b.vy) * 0.3; }
      }
    }
    function draw(t) {
      var grow = still ? 1 : Math.min(1, (t - born) / 1.6), i, j, n;
      grow = 1 - Math.pow(1 - grow, 3);
      field.fill(0);
      for (n = 0; n < balls.length; n++) {
        var b = balls[n], rr = b.r * S * grow * (b.big ? 1 + 0.16 * Math.sin(t * 3.4 + b.p) + beat * 0.12 : 1), r2 = rr * rr;
        // a ball only matters near itself, so only that patch of the grid is touched
        var reach = rr * 5, i0 = Math.max(0, Math.floor((b.x - reach) / G)), i1 = Math.min(cols - 1, Math.ceil((b.x + reach) / G));
        var j0 = Math.max(0, Math.floor((b.y - reach) / G)), j1 = Math.min(rows - 1, Math.ceil((b.y + reach) / G));
        for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) {
          var dx = i * G - b.x, dy = j * G - b.y;
          field[j * cols + i] += r2 / (dx * dx + dy * dy + 0.01);
        }
      }
      // trace the edge of the liquid: everywhere the balls add up to 1 or more is inside
      var path = new Path2D();
      for (j = 0; j < rows - 1; j++) {
        var run = -1;
        for (i = 0; i < cols - 1; i++) {
          var a = field[j * cols + i], bb = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          var A = a >= 1, B = bb >= 1, C = c >= 1, D = d >= 1;
          if (A && B && C && D) { if (run < 0) run = i; continue; }
          if (run >= 0) { path.rect(run * G, j * G, (i - run) * G, G); run = -1; }
          if (!A && !B && !C && !D) continue;
          var x0 = i * G, y0 = j * G, pts = [];
          if (A) pts.push(x0, y0);
          if (A !== B) pts.push(x0 + G * (1 - a) / (bb - a), y0);
          if (B) pts.push(x0 + G, y0);
          if (B !== C) pts.push(x0 + G, y0 + G * (1 - bb) / (c - bb));
          if (C) pts.push(x0 + G, y0 + G);
          if (C !== D) pts.push(x0 + G * (1 - d) / (c - d), y0 + G);
          if (D) pts.push(x0, y0 + G);
          if (D !== A) pts.push(x0, y0 + G * (1 - a) / (d - a));
          path.moveTo(pts[0], pts[1]);
          for (n = 2; n < pts.length; n += 2) path.lineTo(pts[n], pts[n + 1]);
          path.closePath();
        }
        if (run >= 0) path.rect(run * G, j * G, (cols - 1 - run) * G, G);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fill(path);
      // a soft sheen, so it reads as wet rather than flat
      ctx.save(); ctx.clip(path);
      var sx = mid.x - S * 0.04, sy = mid.y - S * 0.06, gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, S * 0.13);
      gl.addColorStop(0, 'rgba(255,255,255,.2)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    function frame(now) {
      raf = 0;
      if (!seen || document.hidden) return;
      // The motion is worked out in fixed 1/60 second steps, however often the screen redraws, so the
      // liquid moves at the same speed on a slow laptop and on a 120 Hz phone.
      var t = now / 1000, guard = 0;
      acc += Math.min(0.2, prev ? t - prev : 0); prev = t;
      while (acc >= 1 / 60 && guard++ < 10) { sim += 1 / 60; step(sim); acc -= 1 / 60; }
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function wake() { if (born && !raf && !still) { prev = 0; raf = requestAnimationFrame(frame); } }
    function point(e) {
      var r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
      ptr.on = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
    }
    window.addEventListener('pointermove', function (e) { if (!e.pointerType || e.pointerType === 'mouse') point(e); }, { passive: true });
    // One click or tap parks the liquid in the middle; the next sets it loose again, heading for where you clicked.
    hero.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a, button, .nav')) return;
      parked = !parked;
      beat = 1; nextBeat = sim + 0.9;
      if (!parked) { point(e); if (e.pointerType && e.pointerType !== 'mouse') setTimeout(function () { ptr.on = false; }, 1600); } // after a tap it wanders off again
    });
    document.addEventListener('pointerleave', function () { ptr.on = false; });
    document.addEventListener('visibilitychange', wake);
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; wake(); }).observe(hero);
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { size(); if (still && born) draw(born + 9); }, 150); });
    return {
      start: function () {
        size();
        born = performance.now() / 1000;
        canvas.classList.add('go');
        if (still) { for (var i = 0; i < 400; i++) step(i / 30); draw(born + 9); return; }
        wake();
      }
    };
  }

  // Liquid logo: the cover logo and its tags stay solid, but near the pointer they bend, stretch and wobble
  // like the surface of a liquid, then settle. The artwork is warped on a fine grid, never broken apart.
  function liquid(hero, mark) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { assemble: function () {} };
    var canvas = h('canvas', { class: 'liquid', 'aria-hidden': 'true' });
    var ctx = canvas.getContext('2d');
    var tex = document.createElement('canvas');
    var G = 14, MAX = 30, R = 90;
    var pts = [], cells = [], cols = 0, rows = 0, w = 0, ht = 0, ox = 0, oy = 0, box = null, on = false, raf = 0, dpr = 1;
    var ptr = { x: -9999, y: -9999, vx: 0, vy: 0 };
    hero.appendChild(canvas);

    function build() {
      var image = mark.querySelector('img');
      var hr = hero.getBoundingClientRect(), mr = mark.getBoundingClientRect();
      if (!image.naturalWidth || !mr.width) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(hr.width * dpr);
      canvas.height = Math.round(hr.height * dpr);
      var pad = 42;
      ox = mr.left - hr.left - pad; oy = mr.top - hr.top - pad;
      cols = Math.ceil((mr.width + pad * 2) / G); rows = Math.ceil((mr.height + pad * 2) / G);
      w = cols * G; ht = rows * G;
      tex.width = Math.round(w * dpr); tex.height = Math.round(ht * dpr);
      var c = tex.getContext('2d', { willReadFrequently: true });
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, ht);
      var ir = image.getBoundingClientRect();
      c.drawImage(image, ir.left - mr.left + pad, ir.top - mr.top + pad, ir.width, ir.height);
      c.fillStyle = '#000';
      c.textBaseline = 'top';
      Array.prototype.forEach.call(mark.querySelectorAll('.tag'), function (t) {
        var r = t.getBoundingClientRect(), cs = getComputedStyle(t);
        c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        c.fillText(t.textContent, r.left - mr.left + pad, r.top - mr.top + pad);
      });
      // Only grid squares that actually contain ink need drawing.
      var data = c.getImageData(0, 0, tex.width, tex.height).data, step = Math.max(1, Math.round(dpr));
      cells = [];
      for (var cy = 0; cy < rows; cy++) {
        for (var cx = 0; cx < cols; cx++) {
          var ink = false, x0 = Math.floor(cx * G * dpr), y0 = Math.floor(cy * G * dpr), x1 = Math.min(tex.width, Math.ceil((cx + 1) * G * dpr)), y1 = Math.min(tex.height, Math.ceil((cy + 1) * G * dpr));
          for (var y = y0; y < y1 && !ink; y += step) for (var x = x0; x < x1; x += step) if (data[(y * tex.width + x) * 4 + 3] > 8) { ink = true; break; }
          if (ink) cells.push(cy * (cols + 1) + cx);
        }
      }
      pts = [];
      for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) pts.push({ u: i * G, v: j * G, x: i * G, y: j * G, vx: 0, vy: 0 });
      R = Math.max(60, Math.min(130, mr.width * 0.17));
      box = { l: ox - R, t: oy - R, r: ox + w + R, b: oy + ht + R };
      return cells.length > 0;
    }

    // Draws one triangle of the logo, mapped from its resting shape onto its current warped shape.
    function tri(a, b, c) {
      var cxm = (a.x + b.x + c.x) / 3, cym = (a.y + b.y + c.y) / 3, k = 1.06; // slightly oversized so no seams show
      ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      ctx.beginPath();
      ctx.moveTo(cxm + (a.x - cxm) * k, cym + (a.y - cym) * k);
      ctx.lineTo(cxm + (b.x - cxm) * k, cym + (b.y - cym) * k);
      ctx.lineTo(cxm + (c.x - cxm) * k, cym + (c.y - cym) * k);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      var d = (b.u - a.u) * (c.v - a.v) - (c.u - a.u) * (b.v - a.v);
      var m11 = ((b.x - a.x) * (c.v - a.v) - (c.x - a.x) * (b.v - a.v)) / d;
      var m21 = ((c.x - a.x) * (b.u - a.u) - (b.x - a.x) * (c.u - a.u)) / d;
      var m12 = ((b.y - a.y) * (c.v - a.v) - (c.y - a.y) * (b.v - a.v)) / d;
      var m22 = ((c.y - a.y) * (b.u - a.u) - (b.y - a.y) * (c.u - a.u)) / d;
      var e = a.x - m11 * a.u - m21 * a.v, f = a.y - m12 * a.u - m22 * a.v;
      ctx.transform(m11, m12, m21, m22, e, f);
      ctx.drawImage(tex, 0, 0, w, ht);
      ctx.restore();
    }

    function frame() {
      raf = 0;
      var px = ptr.x - ox, py = ptr.y - oy, pvx = ptr.vx, pvy = ptr.vy, far = 0, i;
      ptr.vx *= 0.8; ptr.vy *= 0.8;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], dx = p.x - px, dy = p.y - py, d = dx * dx + dy * dy;
        if (d < R * R) {
          d = Math.sqrt(d) || 1;
          var fo = 1 - d / R; fo *= fo;
          p.vx += pvx * fo * 0.34 + dx / d * fo * 0.9; // carried along by the pointer, with a soft bulge around it
          p.vy += pvy * fo * 0.34 + dy / d * fo * 0.9;
        }
        p.vx = (p.vx + (p.u - p.x) * 0.07) * 0.88;
        p.vy = (p.vy + (p.v - p.y) * 0.07) * 0.88;
        p.x += p.vx; p.y += p.vy;
        var ex = p.x - p.u, ey = p.y - p.v, len = Math.sqrt(ex * ex + ey * ey);
        if (len > MAX) { p.x = p.u + ex / len * MAX; p.y = p.v + ey / len * MAX; }
        if (len > far) far = len;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (i = 0; i < cells.length; i++) {
        var n = cells[i], a = pts[n], b = pts[n + 1], c = pts[n + cols + 1], e2 = pts[n + cols + 2];
        tri(a, b, c);
        tri(b, e2, c);
      }
      var near = ptr.x > box.l && ptr.x < box.r && ptr.y > box.t && ptr.y < box.b;
      if (!near && far < 0.25) stop(); else raf = requestAnimationFrame(frame);
    }
    function start() {
      if (!cells.length) return;
      if (!on) { on = true; mark.classList.add('liquid-on'); canvas.style.opacity = 1; }
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function stop() {
      on = false;
      mark.classList.remove('liquid-on');
      canvas.style.opacity = 0;
    }
    function ready(cb) {
      var image = mark.querySelector('img');
      var go = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(cb); };
      if (image.complete && image.naturalWidth) go(); else image.addEventListener('load', go);
    }

    window.addEventListener('pointermove', function (e) {
      if (!box) return;
      var hr = hero.getBoundingClientRect(), x = e.clientX - hr.left, y = e.clientY - hr.top;
      ptr.vx = Math.max(-28, Math.min(28, x - ptr.x));
      ptr.vy = Math.max(-28, Math.min(28, y - ptr.y));
      ptr.x = x; ptr.y = y;
      if (x > box.l && x < box.r && y > box.t && y < box.b) start();
    }, { passive: true });
    document.addEventListener('pointerleave', function () { ptr.x = -9999; ptr.y = -9999; });
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { if (box) build(); }, 200);
    });
    ready(function () { if (!box) build(); });

    return {
      // On arrival the logo ripples once, like a drop landing, then settles.
      assemble: function () {
        ready(function () {
          if (!build()) return;
          pts.forEach(function (p) {
            p.x = p.u + Math.sin(p.v * 0.09 + p.u * 0.012) * 8;
            p.y = p.v + Math.cos(p.u * 0.05) * 5;
          });
          start();
        });
      }
    };
  }
  /* ---------- home ---------- */
  // Sound effects are made in the browser, so there are no audio files to load. Browsers only allow
  // sound after the visitor has clicked or tapped once, which the intro click takes care of.
  var sfx = (function () {
    var ctx = null;
    function ac() {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try {
        if (!ctx) ctx = new A();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { return null; }
      return ctx;
    }
    function tone(from, to, dur, vol, type) {
      var c = ac();
      if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type || 'sine';
      o.frequency.setValueAtTime(from, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    var NOTES = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];
    return {
      // a short pixel-style blip for links and buttons
      click: function () { tone(740, 430, 0.07, 0.05, 'square'); },
      // each hello is one note, climbing a scale
      hello: function (n) { tone(NOTES[n % NOTES.length], 0, 0.14, 0.08, 'triangle'); }
    };
  })();
  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (!t || !t.closest || t.closest('.intro')) return; // the intro has its own sounds
    if (t.closest('a, button, [role="button"], summary')) sfx.click();
  }, true);

  var HELLOS = ['Hello', 'Hola', 'Bonjour', 'こんにちは', 'Hallo', '안녕하세요', 'Olá', '你好', 'Kumusta', 'Mabuhay'];
  function home() {
    var s = C.site;
    var seen = sessionStorage.getItem('introSeen'), flow;
    if (!sessionStorage.getItem('introSeen')) {
      var intro = h('div', { class: 'intro', role: 'button', tabindex: '0', 'aria-label': 'Enter site' }, h('span', { text: s.introWord }));
      var leave = function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.clientX) { intro.style.setProperty('--x', e.clientX + 'px'); intro.style.setProperty('--y', e.clientY + 'px'); }
        if (intro.getAttribute('data-go')) return;
        intro.setAttribute('data-go', '1');
        sessionStorage.setItem('introSeen', '1');
        // One click runs through "hello" in other languages, then the site opens.
        var word = intro.firstChild, n = 0;
        var hellos = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? [] : HELLOS;
        word.classList.add('cycling');
        (function next() {
          if (n < hellos.length) {
            sfx.hello(n);
            word.textContent = hellos[n++];
            setTimeout(next, n <= 2 ? 300 : n >= hellos.length ? 420 : 170);
            return;
          }
          flow.start();
          fluid.assemble();
          intro.classList.add('leave');
          setTimeout(function () { intro.remove(); }, 1150);
        })();
      };
      intro.addEventListener('click', leave);
      intro.addEventListener('keydown', leave);
      document.body.appendChild(intro);
      intro.focus();
    }
    var clock = h('span');
    var tick = function () { clock.textContent = 'current time: ' + new Date().toLocaleTimeString('en-GB'); };
    tick(); setInterval(tick, 1000);
    var hero = h('header', { class: 'hero' },
        nav(),
        h('div', { class: 'hero-mid' },
          h('div', { class: 'mark' },
            h('h1', { class: 'sr-only', text: 'Portfolio' }),
            h('img', { src: 'assets/portfolio-wordmark.png', alt: 'Portfolio' }),
            s.roles.map(function (r, i) { return h('span', { class: 'tag t' + (i + 1), text: '( ' + (i + 1) + ' )' + r }); }))),
        h('div', { class: 'hero-foot' }, clock));
    app.append(hero, marquee(), aboutBlock(false), footer(), toTop());
    flow = ferro(hero);
    // arriving from another page's About link: go straight down to the section
    if (location.hash === '#about') setTimeout(function () { var sec = document.getElementById('about'); if (sec) sec.scrollIntoView(); }, 80);
    var fluid = liquid(hero, hero.querySelector('.mark'));
    if (seen) { flow.start(); fluid.assemble(); }
  }

  /* ---------- about ---------- */
  function about() {
    app.append(nav(), h('h1', { class: 'sr-only', text: 'About' }), marquee(), aboutBlock(true), footer(), toTop());
  }

  /* ---------- projects ---------- */
  function byCat(cat) {
    return C.projects.filter(function (p) { return p.category === cat && p.published; });
  }

  function graphic(list) {
    var i = 0;
    var stage = h('div', { class: 'stage' });
    var cap = h('div', { class: 'caption' });
    var thumbs = h('div', { class: 'thumbs' }, list.map(function (p, n) {
      return h('button', { 'aria-label': p.title || 'Project ' + (n + 1), onclick: function () { show(n); } }, p.images[0] ? img(p.images[0], '', '') : null);
    }));
    function show(n) {
      i = (n + list.length) % list.length;
      var p = list[i];
      stage.replaceChildren(p.images[0] ? img(p.images[0], 'swap', p.title) : '');
      cap.replaceChildren(h('h3', { class: 'swap', text: p.title }), h('p', { class: 'swap', text: p.description }));
      Array.prototype.forEach.call(thumbs.children, function (b, n2) { n2 === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    }
    show(0);
    return h('div', { class: 'gd' },
      h('div', { class: 'viewer' },
        h('button', { class: 'chev', 'aria-label': 'Previous', onclick: function () { show(i - 1); } }, UI.arrow('left')),
        stage,
        h('button', { class: 'chev', 'aria-label': 'Next', onclick: function () { show(i + 1); } }, UI.arrow('right')),
        cap),
      thumbs);
  }

  function embed(url) {
    var m;
    if ((m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/.exec(url))) return h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + m[1], title: 'Video', allowfullscreen: true });
    if ((m = /vimeo\.com\/(\d+)/.exec(url))) return h('iframe', { src: 'https://player.vimeo.com/video/' + m[1], title: 'Video', allowfullscreen: true });
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return h('video', { src: url, controls: true });
    return null;
  }

  function video(list) {
    var box = h('div', { class: 'reel' });
    var cap = h('div', { class: 'caption' });
    var picks = h('div', { class: 'reel-list' });
    function show(n) {
      var p = list[n];
      var player = p.link ? embed(p.link) : null;
      box.replaceChildren(player || (p.images[0] ? img(p.images[0], '', p.title) : C.site.reelLabel));
      cap.replaceChildren(p.description ? h('p', { text: p.description }) : '');
      Array.prototype.forEach.call(picks.children, function (b, n2) { n2 === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    }
    if (list.length > 1) list.forEach(function (p, n) { picks.append(h('button', { text: p.title || 'Video ' + (n + 1), onclick: function () { show(n); } })); });
    show(0);
    return h('div', null, box, picks, cap);
  }

  function uiux(list, title) {
    var view = h('div', { class: 'pane view', tabindex: '0' });
    var cells = h('div', { class: 'cells' }, list.map(function (p, n) {
      return h('button', { 'aria-label': p.title || 'Project ' + (n + 1), onclick: function () { show(n); } }, p.images[0] ? img(p.images[0], '', '') : null);
    }));
    for (var k = list.length; k < 22; k++) cells.append(h('span', { class: 'cell', 'aria-hidden': 'true' }));
    var thumb = h('div', { class: 'sthumb' });
    var sbar = h('div', { class: 'sbar', 'aria-hidden': 'true' }, thumb);
    function show(n) {
      var p = list[n];
      view.replaceChildren(h('div', { class: 'caption' }, h('h3', { class: 'swap', text: p.title }), h('p', { class: 'swap', text: p.description })));
      p.images.forEach(function (r) { view.append(img(r, 'swap', p.title)); });
      if (p.link) view.append(h('a', { class: 'btn', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }));
      view.scrollTop = 0;
      Array.prototype.forEach.call(cells.children, function (b, n2) { n2 === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    }
    // The scrollbar keeps its designed look: the thumb stays one size and rides the track as the list scrolls.
    function sync() {
      var max = cells.scrollHeight - cells.clientHeight, travel = sbar.clientHeight - thumb.offsetHeight;
      thumb.style.top = (max > 1 ? (cells.scrollTop / max) * travel : 0) + 'px';
    }
    function jump(e) {
      var r = sbar.getBoundingClientRect(), size = thumb.offsetHeight;
      var ratio = Math.min(1, Math.max(0, (e.clientY - r.top - size / 2) / (r.height - size)));
      cells.scrollTop = ratio * (cells.scrollHeight - cells.clientHeight);
    }    cells.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    sbar.addEventListener('pointerdown', function (e) { sbar.setPointerCapture(e.pointerId); jump(e); });
    sbar.addEventListener('pointermove', function (e) { if (sbar.hasPointerCapture(e.pointerId)) jump(e); });
    setTimeout(sync, 300);
    if (list.length) show(0);
    return h('div', { class: 'win uxwin' },
      h('div', { class: 'win-bar' }, title, UI.controls()),
      h('div', { class: 'ux' }, view, h('div', { class: 'pane side' }, cells, sbar)));
  }
  function developer(list) {
    var grid = h('div', { class: 'folders' });
    // Each folder is a back, a few sheets and a front flap. Hovering tips the flap forward so the sheets
    // show, with a note of how many pages are inside.
    var counters = [];
    list.forEach(function (p, n) {
      var col = p.color || SHADES[n % 4], pc = h('span', { class: 'fpages' });
      grid.append(h('button', { onclick: function (e) { popup(p, e.currentTarget, col); } },
        h('span', { class: 'fwrap fopen' + (tint(col).indexOf('#fff') > 0 ? ' dark' : ''), style: 'display:block;' + tint(col) }, folder(col),
          h('span', { class: 'fpaper' }, pc), h('span', { class: 'ffront' }, h('i'))),
        h('span', { class: 'name', text: p.title })));
      counters.push(function () {
        var k = popup(p, null, col, true);
        pc.textContent = k + (k === 1 ? ' page' : ' pages');
      });
    });
    // Pages are counted by laying each project out once, unseen, after the fonts have arrived.
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      setTimeout(function () { counters.forEach(function (run) { try { run(); } catch (e) {} }); }, 400);
    });
    // Dotted folders fill the rest of the grid. Only a signed-in admin gets the "+" shortcut.
    var admin = Store.signedIn();
    var slots = Math.max(6, Math.ceil((list.length + (admin ? 1 : 0)) / 3) * 3);
    for (var k = list.length; k < slots; k++) {
      var empty = h('span', { class: 'fwrap', style: 'display:block' }, folder('', { dashed: true, plus: admin }));
      grid.append(admin ? h('a', { href: 'admin.html', 'aria-label': 'Add a project in the admin' }, empty) : h('div', { 'aria-hidden': 'true' }, empty));
    }
    return grid;
  }

  // Picks black or white lettering so it stays readable on whatever folder colour was chosen.
  function tint(color) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color || '');
    if (!m) return '';
    var lum = (parseInt(m[1], 16) * 299 + parseInt(m[2], 16) * 587 + parseInt(m[3], 16) * 114) / 1000;
    return '--fc:' + color + ';--fct:' + (lum > 150 ? '#000' : '#fff');
  }
  // One project opens as a folder lying flat with a sheet on each side, like an open book. Turning the
  // page curls the right-hand sheet over by its bottom corner and lays it down on the left. Nothing
  // scrolls: long writing runs on to the next sheet. Arrows, the mouse wheel, a swipe or the arrow keys
  // turn pages; the X closes.
  function popup(p, opener, color, probe) {
    var narrow = window.matchMedia('(max-width: 760px)').matches;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var per = narrow ? 1 : 2; // phones show one sheet at a time
    var spread = h('div', { class: 'spread' + (narrow ? ' single' : '') });
    var count = h('div', { class: 'count', 'aria-live': 'polite' });
    var prev = h('button', { class: 'chev', 'aria-label': 'Previous page', onclick: function () { turn(-1); } }, UI.arrow('left'));
    var next = h('button', { class: 'chev', 'aria-label': 'Next page', onclick: function () { turn(1); } }, UI.arrow('right'));
    var close = h('button', { class: 'x', 'aria-label': 'Close', text: '✕', onclick: done });
    var overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': p.title || 'Project' },
      prev, h('div', { class: 'dossier', style: tint(color) }, h('div', { class: 'dtab', text: p.title }), close, spread, count), next);
    var pages = [], s = 0, busy = false, last = 0, L = null, R = null;

    function pic(ref) { return function () { return h('div', { class: 'sheet pic' }, img(ref, '', p.title)); }; }
    function paper(d) {
      return function () {
        return h('div', { class: 'sheet text' },
          d.head ? h('h3', { text: p.title }) : null,
          d.head && p.role ? h('p', { class: 'role-line', text: p.role }) : null,
          d.text ? h('p', { class: 'body', text: d.text }) : null,
          d.link ? h('a', { class: 'go', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }) : null,
          h('span', { class: 'pnum', text: String(d.n) }));
      };
    }
    function leaf(i, side) {
      return h('div', { class: 'leaf ' + side }, h('div', { class: 'pface' }, i >= 0 && i < pages.length ? pages[i]() : null));
    }
    // Fills one sheet with as many words as fit, then carries the rest over to the next sheet.
    function paginate() {
      var probe = h('div', { class: 'leaf right probe' }, h('div', { class: 'pface' }));
      spread.appendChild(probe);
      var face = probe.firstChild, cs = getComputedStyle(face);
      var room = face.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      function fits(d) { var sh = paper(d)(); sh.style.height = 'auto'; face.replaceChildren(sh); return sh.offsetHeight <= room; }
      var tokens = (p.description || '').split(/(\s+)/), out = [], i = 0, head = true;
      while (out.length < 160) {
        var n = tokens.length - i, d = { head: head, link: false, n: out.length + 1 };
        d.text = tokens.slice(i, i + n).join('').trim();
        if (!d.text && !head) break;
        if (!fits(d)) {
          var lo = 0, hi = n;
          while (lo < hi) {
            var mid = Math.ceil((lo + hi) / 2);
            d.text = tokens.slice(i, i + mid).join('').trim();
            if (fits(d)) lo = mid; else hi = mid - 1;
          }
          n = Math.max(lo, 1);
          d.text = tokens.slice(i, i + n).join('').trim();
        }
        out.push(d);
        i += n; head = false;
        if (i >= tokens.length) break;
      }
      if (p.link) {
        var tail = out[out.length - 1];
        tail.link = true;
        if (!fits(tail)) { tail.link = false; out.push({ head: false, text: '', link: true, n: out.length + 1 }); }
      }
      probe.remove();
      return out;
    }

    function update() {
      var to = Math.min(s + per, pages.length);
      count.textContent = pages.length > 1 ? (s + 1) + (to > s + 1 ? '-' + to : '') + ' / ' + pages.length : '';
      prev.style.visibility = s > 0 ? '' : 'hidden';
      next.style.visibility = s + per < pages.length ? '' : 'hidden';
    }
    // Lays the folder open at sheet t (and t + 1 beside it).
    function place(t) {
      spread.replaceChildren();
      if (!narrow) { L = leaf(t, 'left'); spread.appendChild(L); }
      R = leaf(narrow ? t : t + 1, 'right');
      spread.appendChild(R);
      s = t; busy = false; last = Date.now();
      update();
    }
    // The curl. "front" is the right-hand sheet being lifted; "back" is what is printed on its other side,
    // which ends up lying on the left. The bottom-right corner travels in an arc to the bottom-left; the
    // paper folds along the line halfway between where the corner was and where it is now. Everything on
    // the far side of that line is hidden and drawn again mirrored, as the underside rolling over.
    function curl(front, back, from, to, ms, end) {
      var w = spread.clientWidth / 2, ht = spread.clientHeight, W = 2 * w;
      var shade = h('div', { class: 'shade' }), wrap = h('div', { class: 'curlw' }, back, shade);
      spread.appendChild(wrap);
      function poly(pts) {
        if (pts.length < 3) return 'polygon(0 0, 0 0, 0 0)';
        return 'polygon(' + pts.map(function (q) { return q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px'; }).join(',') + ')';
      }
      function draw(e) {
        // The corner swings round the foot of the spine, so the sheet always stays attached along the fold of the folder.
        var cx = w + w * Math.cos(Math.PI * e), cy = ht - w * Math.sin(Math.PI * e);
        var vx = cx - W, vy = cy - ht, len = Math.sqrt(vx * vx + vy * vy);
        if (len < 1) { front.style.clipPath = ''; back.style.clipPath = shade.style.clipPath = poly([]); return; }
        var dx = vx / len, dy = vy / len, mx = (W + cx) / 2, my = (ht + cy) / 2;
        function side(q) { return (q[0] - mx) * dx + (q[1] - my) * dy; }
        function mirror(q) { var k = 2 * side(q); return [q[0] - k * dx, q[1] - k * dy]; }
        function cut(keep) {
          var pts = [[w, 0], [W, 0], [W, ht], [w, ht]], out = [];
          for (var i = 0; i < 4; i++) {
            var a = pts[i], b = pts[(i + 1) % 4], fa = side(a), fb = side(b);
            var ia = keep ? fa >= 0 : fa <= 0, ib = keep ? fb >= 0 : fb <= 0;
            if (ia) out.push(a);
            if (ia !== ib) { var k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
          }
          return out;
        }
        var lifted = cut(false);
        front.style.clipPath = poly(cut(true).map(function (q) { return [q[0] - w, q[1]]; }));
        back.style.clipPath = poly(lifted.map(function (q) { return [W - q[0], q[1]]; }));
        // Where a point of the left-hand sheet sits right now: flipped across the spine, then across the fold.
        function at(x, y) { return mirror([W - x, y]); }
        var o = at(0, 0), ax = at(1, 0), ay = at(0, 1);
        back.style.transform = 'matrix(' + [ax[0] - o[0], ax[1] - o[1], ay[0] - o[0], ay[1] - o[1], o[0], o[1]].map(function (n) { return n.toFixed(5); }).join(',') + ')';
        // Shading that hugs the fold, so the paper reads as rounded rather than creased.
        var glen = Math.abs(W * dx) + Math.abs(ht * dy), g0 = (mx - W / 2) * dx + (my - ht / 2) * dy + glen / 2;
        shade.style.clipPath = poly(lifted.map(mirror));
        shade.style.background = 'linear-gradient(' + (Math.atan2(dx, -dy) * 180 / Math.PI).toFixed(2) + 'deg, rgba(0,0,0,.34) ' + g0.toFixed(1) + 'px, rgba(0,0,0,.12) ' + (g0 + 14).toFixed(1) + 'px, rgba(0,0,0,.03) ' + (g0 + 46).toFixed(1) + 'px, rgba(255,255,255,.5) ' + (g0 + 70).toFixed(1) + 'px, rgba(255,255,255,0) ' + (g0 + 150).toFixed(1) + 'px)';
      }
      var t0 = performance.now();
      draw(from);
      requestAnimationFrame(function frame(now) {
        var k = Math.min(Math.max((now - t0) / ms, 0), 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        draw(from + (to - from) * e);
        if (k < 1) return requestAnimationFrame(frame);
        end();
      });
    }
    function turn(dir) {
      var t = s + dir * per;
      if (busy || t < 0 || t >= pages.length) return;
      last = Date.now();
      if (still || narrow || document.hidden) { place(t); return; }
      busy = true;
      var front, back;
      if (dir > 0) {
        // The sheet after next is already lying underneath on the right. Curl the right-hand sheet over.
        var under = leaf(t + 1, 'right');
        spread.insertBefore(under, R);
        front = R; back = leaf(t, 'left');
        curl(front, back, 0, 1, 900, function () { place(t); });
      } else {
        // Going back: the left-hand sheet curls back over to the right.
        back = L;
        L = leaf(t, 'left');
        spread.insertBefore(L, spread.firstChild);
        front = leaf(t + 1, 'right');
        spread.appendChild(front);
        curl(front, back, 1, 0, 900, function () { place(t); });
      }
    }    // Scrolling never moves anything: one wheel gesture or swipe is one page.
    function wheel(e) {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 6 || Date.now() - last < 420) return;
      turn(e.deltaY > 0 ? 1 : -1);
    }
    var touch = null;
    function touchStart(e) { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    function touchMove(e) { if (e.cancelable) e.preventDefault(); }
    function touchEnd(e) {
      if (!touch) return;
      var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
      turn((Math.abs(dx) > Math.abs(dy) ? dx : dy) < 0 ? 1 : -1);
    }
    function key(e) {
      if (e.key === 'Escape') return done();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); turn(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); turn(-1); }
    }
    function done() {
      document.removeEventListener('keydown', key);
      document.documentElement.classList.remove('locked');
      overlay.classList.add('out');
      setTimeout(function () { overlay.remove(); }, 220);
      if (opener) opener.focus();
    }

    if (probe) { overlay.style.visibility = 'hidden'; overlay.style.animation = 'none'; overlay.style.pointerEvents = 'none'; }
    document.body.appendChild(overlay);
    // Order of the sheets: first image, then the writing on as many sheets as it needs, then the other images.
    if (p.images[0]) pages.push(pic(p.images[0]));
    paginate().forEach(function (d) { pages.push(paper(d)); });
    p.images.slice(1).forEach(function (r) { pages.push(pic(r)); });
    if (probe) { overlay.remove(); return pages.length; } // only counting the pages

    document.addEventListener('keydown', key);
    overlay.addEventListener('wheel', wheel, { passive: false });
    spread.addEventListener('touchstart', touchStart, { passive: true });
    spread.addEventListener('touchmove', touchMove, { passive: false });
    spread.addEventListener('touchend', touchEnd);
    document.documentElement.classList.add('locked'); // the page behind stays still while a folder is open
    place(0);
    close.focus();

    // Opening: the folder that was clicked turns upright into portrait while it grows into place, closed.
    // Then it opens in half: the front cover lifts away from the right, and the left half folds down flat.
    var dossier = overlay.querySelector('.dossier'), from = opener && opener.querySelector('.fwrap');
    if (!still && !narrow && !document.hidden && from) {
      dossier.style.animation = 'none';
      var a = from.getBoundingClientRect(), b = dossier.getBoundingClientRect(), cw = b.width / 2;
      if (!a.width || !cw) return;
      var shut = h('div', { class: 'shut', style: tint(color) + ';left:' + (b.left + cw) + 'px;top:' + b.top + 'px;width:' + cw + 'px;height:' + b.height + 'px' }, h('i'), h('b'));
      var tidied = false;
      function tidy() {
        if (tidied) return;
        tidied = true;
        dossier.style.visibility = '';
        dossier.style.clipPath = '';
        Array.prototype.forEach.call(overlay.querySelectorAll('.shut, .twin'), function (el) { el.remove(); });
      }
      overlay.appendChild(shut);
      dossier.style.visibility = 'hidden';
      var dx = a.left + a.width / 2 - (b.left + cw * 1.5), dy = a.top + a.height / 2 - (b.top + b.height / 2);
      shut.animate([
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(-90deg) scale(' + (a.height / cw).toFixed(4) + ',' + (a.width / b.height).toFixed(4) + ')' },
        { transform: 'translate(0px,0px) rotate(0deg) scale(1,1)' }
      ], { duration: 620, easing: 'cubic-bezier(.4, 0, .2, 1)' }).onfinish = function () {
        if (tidied) return;
        // The pages wait underneath on the right; the left half is not there until the cover comes over.
        dossier.style.visibility = '';
        dossier.style.clipPath = 'inset(-60px -40px -20px 50%)';
        shut.style.transformOrigin = '0 50%';
        shut.animate([{ transform: 'perspective(2200px) rotateY(0deg)' }, { transform: 'perspective(2200px) rotateY(-90deg)' }],
          { duration: 340, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'forwards' }).onfinish = function () {
          if (tidied) return;
          shut.remove();
          var twin = dossier.cloneNode(true);
          twin.classList.add('twin');
          twin.style.cssText = tint(color) + ';left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px';
          overlay.appendChild(twin);
          twin.animate([{ transform: 'perspective(2200px) rotateY(90deg)' }, { transform: 'perspective(2200px) rotateY(0deg)' }],
            { duration: 420, easing: 'cubic-bezier(.1, .5, .3, 1)' }).onfinish = tidy;
        };
      };
      setTimeout(tidy, 2600);
    }
  }  function projects() {
    var s = C.site;
    var render = { graphic: graphic, video: video, uiux: uiux, developer: developer };
    var flow = heroIcons(); // the tool icons drift across behind the title
    app.append(h('header', { class: 'phero' }, flow.back, nav(), h('div', { class: 'pmid' }, h('h1', { class: 'ptitle', text: s.projectsTitle })),
      h('nav', { class: 'catnav', 'aria-label': 'Project categories' }, CATS.map(function (c, i) {
        return h('a', { href: '#' + c }, s.roles[i], h('span', { class: 'arrow' }, UI.arrow('down')), h('span', { class: 'bar b' + (i + 1) }));
      }))));
    flow.start();
    CATS.forEach(function (c, i) {
      var list = byCat(c);
      var body;
      if (c === 'uiux') body = uiux(list, s.roles[i]);
      else if (!list.length && c !== 'developer') body = h('p', { class: 'empty', text: 'New work coming soon.' });
      else body = render[c](list);
      app.append(h('section', { class: 'section' + (c === 'developer' ? ' dev' : ''), id: c },
        c === 'uiux' ? h('h2', { class: 'sr-only', text: s.roles[i] }) : h('h2', { text: s.roles[i] }), body));
    });
    app.append(footer(), toTop());
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 60);
    }
  }

  /* ---------- contact ---------- */
  // The calling card has two sides. The front is the card itself; "Message me" turns it over to a short
  // form on the back. Whatever is sent lands in the admin's Messages page.
  function callingCard(s) {
    var note = h('p', { class: 'note', role: 'status' });
    var name = h('input', { type: 'text', name: 'name', autocomplete: 'name', placeholder: 'Juan dela Cruz' });
    var email = h('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'name@company.com' });
    var msg = h('textarea', { name: 'message', placeholder: 'Tell me about your project' });
    var turnBtn = h('button', { class: 'btn cc-turn', type: 'button', text: 'Message me', onclick: function () { flip(true); } });

    var front = h('div', { class: 'ccard front' },
      h('div', { class: 'cc-logo' }, h('img', { src: 'assets/footer-logo.png', alt: 'narsheessho' })),
      h('div', { class: 'cc-body' },
        h('p', { class: 'cc-name', text: s.cardName }),
        h('p', { class: 'cc-roles', text: s.roles.join(' / ') }),
        h('div', { class: 'cc-lines' },
          h('a', { href: 'mailto:' + s.email, text: s.email }),
          h('a', { text: s.handle }),
          h('span', { class: 'cc-social' }, link('Linkedin', s.linkedin), link('Facebook', s.facebook), link('Instagram', s.instagram))),
        turnBtn),
      h('div', { class: 'cc-bars', 'aria-hidden': 'true' }, [1, 2, 3, 4].map(function (n) { return h('span', { class: 'b' + n }); })));

    var back = h('form', { class: 'ccard back', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      note.className = 'note err';
      if (!name.value.trim()) { note.textContent = 'Enter your name.'; name.focus(); return; }
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { note.textContent = 'Enter a valid email.'; email.focus(); return; }
      if (!msg.value.trim()) { note.textContent = 'Write a message first.'; msg.focus(); return; }
      Store.addMessage({ name: name.value.trim(), email: email.value.trim(), message: msg.value.trim() }).then(function () {
        back.reset();
        note.className = 'note';
        note.textContent = 'Message sent. Thank you.';
        setTimeout(function () { flip(false); note.textContent = ''; }, 1700);
      }, function () {
        note.textContent = "Couldn't send your message. Try again in a moment.";
      });
    } },
      h('div', { class: 'cb-head' }, h('span', { class: 'cb-title', text: s.contactBlurb }), h('img', { src: 'assets/flower.png', alt: '' })),
      h('div', { class: 'cb-row' }, h('label', { class: 'field' }, 'Name', name), h('label', { class: 'field' }, 'Email', email)),
      h('label', { class: 'field cb-msg' }, 'Message', msg),
      h('div', { class: 'cb-foot' }, note,
        h('button', { class: 'btn ghost', type: 'button', text: 'Back', onclick: function () { flip(false); } }),
        h('button', { class: 'btn', type: 'submit', text: 'Send' })));

    var flipper = h('div', { class: 'flipper' }, front, back);
    var wrap = h('div', { class: 'card-wrap' }, h('div', { class: 'floaty' }, flipper));
    var flipped = false, turning = 0;
    back.inert = true;

    function flip(to) {
      flipped = to;
      turning = Date.now();
      flipper.style.transition = '';
      flipper.style.transform = '';
      flipper.classList.toggle('flipped', flipped);
      wrap.classList.toggle('is-flipped', flipped);
      front.inert = flipped;
      back.inert = !flipped;
      setTimeout(function () { (flipped ? name : turnBtn).focus({ preventScroll: true }); }, 450);
    }
    // The front leans toward the pointer, like turning a real card in your hand. The back stays still for typing.
    if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
      wrap.addEventListener('mousemove', function (e) {
        if (flipped || Date.now() - turning < 900) return;
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        flipper.style.transition = 'transform .12s linear';
        flipper.style.transform = 'rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg)';
      });
      wrap.addEventListener('mouseleave', function () {
        if (flipped) return;
        flipper.style.transition = '';
        flipper.style.transform = '';
      });
    }
    return wrap;
  }

  function contact() {
    var s = C.site;
    app.append(nav(), h('h1', { class: 'chead', text: s.contactHeading }),
      h('div', { class: 'contact-page' }, callingCard(s)),
      footer(), toTop());
  }
  // Elements ease into place as they scroll into view.
  function animate() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add('in');
        setTimeout(function () { el.classList.remove('reveal', 'in'); el.style.transitionDelay = ''; }, 1600);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    var counts = new Map();
    var pick = '.hero-foot, .about > *, .tools-flow, .ptitle, .section > h2, .gd > *, .section > div:not(.gd):not(.folders), .folders > *, .chead, .card-wrap, .contact-page > .blurb, .contact-page > .win, .footer .row';
    Array.prototype.forEach.call(document.querySelectorAll(pick), function (el) {
      var n = counts.get(el.parentNode) || 0;
      counts.set(el.parentNode, n + 1);
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(n * 70, 490) + 'ms';
      io.observe(el);
    });
  }

  Store.load().then(function (content) {
    C = content;
    ({ home: home, about: about, projects: projects, contact: contact })[page]();
    animate();
  });
})();
