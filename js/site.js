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

  // The address of a section of the home page, from wherever we are.
  function there(id) { return (page === 'home' ? '' : 'index.html') + '#' + id; }

  function nav() {
    // The whole portfolio is one page: cover, about, projects, contact, in that order. The menu does not
    // load anything; it glides to the section. From another page (privacy) it goes to that section of home.
    var items = [['about', there('about')], ['projects', there('projects')], ['contact', there('contact')]];
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
      // On the home page the menu follows you: it marks whichever section you have scrolled to, and a
      // click glides there instead of jumping.
      var links = { home: glass.querySelector('li.m-only a') }, now = null;
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      items.forEach(function (i) { links[i[0]] = glass.querySelector('a[href$="#' + i[0] + '"]'); });
      var spy = function () {
        var cur = 'home', line = window.innerHeight * 0.55;
        items.forEach(function (i) { var sec = document.getElementById(i[0]); if (sec && sec.getBoundingClientRect().top < line) cur = i[0]; });
        if (cur === now) return;
        now = cur;
        Object.keys(links).forEach(function (k) { if (k === cur) links[k].setAttribute('aria-current', 'true'); else links[k].removeAttribute('aria-current'); });
        glass.dispatchEvent(new Event('navchange'));
      };
      Object.keys(links).forEach(function (k) {
        links[k].addEventListener('click', function (e) {
          var sec = k === 'home' ? null : document.getElementById(k);
          if (k !== 'home' && !sec) return;
          e.preventDefault();
          if (sec) sec.scrollIntoView({ behavior: calm, block: 'start' }); else window.scrollTo({ top: 0, behavior: calm });
          try { history.replaceState(null, '', sec ? '#' + k : location.pathname); } catch (err) {}
        });
      });
      window.addEventListener('scroll', spy, { passive: true });
      setTimeout(spy, 0);
    }    return el;
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
      if (busy || Math.abs(toMid - fromMid) < 30 || window.matchMedia('(pointer: coarse)').matches) return;
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
      return h('a', { class: 'role', href: there(CATS[i]) },
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
          h('a', { href: 'privacy.html', text: 'Privacy & cookies' }),
          h('div', { class: 'copy', text: s.copyright }))),
      h('div', { class: 'bars' }, CATS.map(function (c, i) {
        return h('a', { class: 'b' + (i + 1), href: there(c), 'aria-label': s.roles[i] + ' projects' });
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
    var mid = { x: 0, y: 0, vx: 0, vy: 0 }, ptr = { x: 0, y: 0, on: false }, parked = false, floorY = 1e9, beat = 0, nextBeat = 0, lastT = 0, sim = 0, acc = 0, prev = 0, ink = 1, inkTo = 1, anchor = null, blank = false;
    hero.insertBefore(canvas, hero.firstChild);
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function size() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height; S = Math.min(W, H);
      // a phone gets a slightly softer picture and a coarser grid: it looks the same in motion and costs far less
      var phone = window.matchMedia('(pointer: coarse)').matches;
      dpr = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      G = phone ? Math.max(6, Math.round(S / 70)) : Math.max(4, Math.round(S / 150));
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
      // (on a phone, the way it is being tilted takes the place of the pointer: the liquid runs to the low side)
      var tx = parked ? W * 0.5 : ptr.on ? ptr.x : tilt.on ? W * (0.5 + tilt.x * 0.32) + S * 0.03 * Math.sin(t * 1.3) : W * (0.5 + 0.3 * Math.sin(t * 0.41) + 0.1 * Math.sin(t * 1.07 + 1));
      var ty = parked ? H * 0.5 : ptr.on ? ptr.y : tilt.on ? H * (0.5 + tilt.y * 0.34) + S * 0.03 * Math.cos(t * 1.1) : H * (0.52 + 0.2 * Math.sin(t * 0.53 + 2) + 0.07 * Math.cos(t * 0.93));
      if (anchor) { tx = anchor.x; ty = anchor.y; } // being refilled from the name tube: it stays where the ink is landing
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
      ink += (inkTo - ink) * 0.2; // how much of the liquid is still on the cover; the rest has gone to the name tube
      field.fill(0);
      for (n = 0; n < balls.length; n++) {
        var b = balls[n], rr = b.r * S * grow * ink * (b.big ? 1 + 0.16 * Math.sin(t * 3.4 + b.p) + beat * 0.12 : 1), r2 = rr * rr;
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
      // While every drop of it is away in the name tube there is nothing to move or draw: wipe once and idle.
      if (inkTo <= 0 && ink < 0.01) { if (!blank) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); blank = true; } ink = 0; acc = 0; raf = requestAnimationFrame(frame); return; }
      blank = false;
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
    // Tilt: a phone reports how it is being held. Leaning it left or right, or standing it up or laying it
    // back, slides the liquid that way. The angle it is held at when this starts counts as level. iPhones
    // only share this after asking, and only in answer to a tap, so the first tap anywhere does the asking.
    var tilt = { on: false, x: 0, y: 0, base: null }, asked = false, justAsked = false;
    function lean(e) {
      if (e.gamma === null || e.beta === null) return;
      if (tilt.base === null) tilt.base = e.beta;
      var gx = Math.max(-1, Math.min(1, e.gamma / 28)), gy = Math.max(-1, Math.min(1, (e.beta - tilt.base) / 28));
      tilt.x += (gx - tilt.x) * 0.2; tilt.y += (gy - tilt.y) * 0.2; // smoothed, so a shaky hand does not make it jitter
      tilt.on = true;
    }
    function listen() { window.addEventListener('deviceorientation', lean, { passive: true }); }
    var touchy = window.matchMedia('(hover: none) and (pointer: coarse)').matches, DOE = window.DeviceOrientationEvent;
    if (touchy && DOE && !still) {
      if (typeof DOE.requestPermission === 'function') {
        document.addEventListener('click', function ask() {
          if (asked) return;
          asked = true; justAsked = true; setTimeout(function () { justAsked = false; }, 0);
          document.removeEventListener('click', ask, true);
          try { DOE.requestPermission().then(function (ans) { if (ans === 'granted') listen(); }, function () {}); } catch (err) {}
        }, true);
      } else listen();
    }
    hero.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a, button, .nav')) return;
      if (justAsked) return; // that tap was spent on asking to use the tilt sensor
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
      // where the middle of the liquid is on screen right now, and how much of it should stay on the cover
      where: function () { if (!born) return null; var r = hero.getBoundingClientRect(); return { x: r.left + mid.x, y: r.top + mid.y }; },
      ink: function (v) { inkTo = Math.max(0, Math.min(1, v)); if (!raf) ink = inkTo; },
      // Start the liquid afresh at a point on the screen (where ink coming back from the tube lands) and keep
      // it there until released. Returns the spot actually used, which is kept inside the cover.
      spawn: function (vx, vy) {
        if (!born) return null;
        var r = hero.getBoundingClientRect(), m = S * 0.16;
        anchor = { x: Math.max(m, Math.min(W - m, vx - r.left)), y: Math.max(topY, Math.min(Math.min(H, floorY) - S * 0.2, vy - r.top)) };
        mid.x = anchor.x; mid.y = anchor.y; mid.vx = mid.vy = 0;
        balls.forEach(function (b) { b.x = anchor.x; b.y = anchor.y; b.vx = b.vy = 0; });
        parked = false; ptr.on = false;
        return { x: r.left + anchor.x, y: r.top + anchor.y };
      },
      release: function () { anchor = null; },
      start: function () {
        size();
        born = performance.now() / 1000;
        canvas.classList.add('go');
        if (still) { for (var i = 0; i < 400; i++) step(i / 30); draw(born + 9); return; }
        wake();
      }
    };
  }

  // The name tube: a small glass tube at the top left. When you scroll past the cover, the cover's own black
  // liquid leaves it: a stream of ink runs across the screen and in through the left end of the tube, pools
  // there, then flows along and gathers into the flower and the letters of the name. Scroll back up and it
  // all melts, runs back to the mouth, and pours out to the cover again.
  // It is the cover liquid in miniature: hundreds of tiny drops that merge where they touch, each knowing which
  // part of which shape it belongs to. Nothing in it sits still: the shapes ride a rolling wave, lean when the
  // page scrolls, drip, and every few seconds a ripple runs along and melts them for a moment. Under the
  // pointer it lets go completely and scatters.
  function nameTube(text, cover) {
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = h('canvas', { 'aria-hidden': 'true' }), ctx = canvas.getContext('2d');
    var tube = h('a', { class: 'nametube', href: '#', 'aria-label': text + ', back to the top' }, canvas);
    var pour = h('canvas', { class: 'inkpour', 'aria-hidden': 'true' }), pctx = pour.getContext('2d');
    var W = 0, H = 0, dpr = 1, drops = [], shapes = [], drips = [], raf = 0, last = 0, ptr = null, face = '', size = 0, mouth = 0, fat = 1;
    var want = 0, fill = 0, prog = 0, loose = 0, slosh = 0, sloshV = 0, lastY = window.scrollY, nextDrip = 0, from = null, respawn = false, pouring = false;
    var light = window.matchMedia('(pointer: coarse)').matches; // a phone or tablet: do the same thing with less
    var pace = 0.016, seenFrames = 0, cheap = light; // phones start in the light mode; computers drop to it only if they struggle
    if (cheap) canvas.style.filter = 'none';
    // The lettering. To use another typeface (for example a licensed liquid display font), add it to the
    // page with @font-face and put its name first in this list.
    var FAMILY = 'Jost, sans-serif', WEIGHT = 600;
    var flower = new Image();
    if (!document.getElementById('goo-fine')) {
      var svg = h('div', { 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
      svg.innerHTML = '<svg width="0" height="0"><filter id="goo-fine"><feGaussianBlur in="SourceGraphic" stdDeviation="1"/>' +
        '<feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -5.5"/></filter>' +
        '</svg>';
      document.body.appendChild(svg);
    }
    document.body.append(pour, tube);
    function build() {
      var fs = Math.max(17, Math.min(21, window.innerWidth * 0.046)), pad = fs * 0.95, i;
      face = WEIGHT + ' ' + fs + 'px ' + FAMILY; size = fs; mouth = pad * 0.8;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = face;
      var fl = flower.naturalWidth ? fs * 1.2 : 0, gapF = fl ? fs * 0.42 : 0; // the flower sits first, then the name
      H = Math.round(fs * 2.3); W = Math.ceil(fl + gapF + ctx.measureText(text).width + pad * 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.font = face; // resizing a canvas wipes its settings, so the typeface has to be set again before measuring
      // every shape in the tube: the flower, then each letter, so each can move on its own
      shapes = [];
      if (fl) shapes.push({ img: true, x: pad, w: fl });
      for (i = 0; i < text.length; i++) shapes.push({ ch: text.charAt(i), x: pad + fl + gapF + ctx.measureText(text.slice(0, i)).width, w: ctx.measureText(text.charAt(i)).width });
      // draw them once on a hidden canvas, then read back where the ink is: those are the drops' places
      var k = 3, off = document.createElement('canvas'), o = off.getContext('2d', { willReadFrequently: true });
      off.width = W * k; off.height = H * k;
      o.scale(k, k); o.font = face; o.textBaseline = 'middle';
      shapes.forEach(function (s) { if (s.img) o.drawImage(flower, s.x, H / 2 - s.w / 2, s.w, s.w); else o.fillText(s.ch, s.x, H / 2 + fs * 0.04); });
      // (on a phone the drops are a little larger and fewer: about a third less to move and draw every frame)
      var d = o.getImageData(0, 0, off.width, off.height).data, gap = light ? 1.62 : 1.3;
      fat = gap / 1.3;
      drops = []; drips = [];
      for (var y = gap / 2; y < H; y += gap) for (var x = gap / 2; x < W; x += gap) {
        if (d[(Math.round(y * k) * off.width + Math.round(x * k)) * 4 + 3] < 120) continue;
        var an = Math.random() * 6.283, r = Math.sqrt(Math.random()) * H * 0.3, si = 0;
        for (i = 0; i < shapes.length; i++) if (x >= shapes[i].x - 0.5) si = i;
        drops.push({ tx: x, ty: y, hx: mouth + Math.cos(an) * r, hy: H / 2 + Math.sin(an) * r * 0.8, wait: x / W * 0.62 + Math.random() * 0.1, ph: Math.random() * 6.283, ox: 0, oy: 0, vx: 0, vy: 0, si: si, low: y > H / 2 + fs * 0.12 });
      }
    }
    // How far shape i is riding up or down right now: a wave that keeps rolling along the tube.
    function ride(i, t) { return Math.sin(t * 2.4 - i * 0.62) * size * 0.11 + Math.sin(t * 1.5 + i * 1.9) * size * 0.045; }
    // A ripple that sweeps along the tube every few seconds and melts each shape as it passes.
    function melt(i, t) { var at = ((t * 0.55) % 3.4) / 3.4 * (shapes.length + 6) - 3; return Math.max(0, 1 - Math.abs(i - at) / 1.6); }
    // The ink crossing the screen between the cover and the mouth of the tube: a string of blobs, fat at the
    // cover end and thin where it enters the glass. `amount` runs 0 to 1 over the pour.
    function stream(amount, inward) {
      if (amount <= 0 || amount >= 1 || !from) { if (pouring) { pour.style.display = 'none'; pouring = false; } return; }
      var mx = tube.offsetLeft + mouth, my = tube.offsetTop + H / 2, sx = from.x, sy = from.y;
      var cx2 = mx + (sx - mx) * 0.55, cy2 = Math.min(sy, my) + Math.abs(sy - my) * 0.2 + 46; // the curve it follows
      // Drawn on a canvas only as big as the stream itself, as one smooth shape. (It used to be a row of
      // blobs blurred together across the whole screen, which was far too much work for a phone.)
      var pad = 20, x0 = Math.floor(Math.min(mx, sx, cx2) - pad), y0 = Math.floor(Math.min(my, sy, cy2) - pad);
      var cw = Math.ceil((Math.max(mx, sx, cx2) + pad - x0) / 48) * 48, chh = Math.ceil((Math.max(my, sy, cy2) + pad - y0) / 48) * 48, pd = Math.min(1.5, dpr);
      if (pour.width < Math.round(cw * pd) || pour.height < Math.round(chh * pd)) { // it only ever grows, so scrolling mid-pour never makes it be thrown away and rebuilt
        var gw = Math.max(cw, pour.width / pd), gh = Math.max(chh, pour.height / pd);
        pour.width = Math.round(gw * pd); pour.height = Math.round(gh * pd); pour.style.width = gw + 'px'; pour.style.height = gh + 'px';
      }
      pour.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
      if (!pouring) { pour.style.display = 'block'; pouring = true; }
      pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, pour.width, pour.height);
      pctx.setTransform(pd, 0, 0, pd, -x0 * pd, -y0 * pd);
      var q = inward ? amount : 1 - amount, head = Math.min(1, q * 1.5), tail = Math.max(0, q * 1.5 - 0.5);
      head = head * head * (3 - 2 * head); tail = tail * tail * (3 - 2 * tail);
      var N = 22, L = [], R = [], ends = [];
      for (var j = 0; j <= N; j++) {
        var u = tail + (head - tail) * j / N, w = inward ? u : 1 - u, m = 1 - w; // w runs from the cover (0) to the tube (1)
        var x = m * m * sx + 2 * m * w * cx2 + w * w * mx, y = m * m * sy + 2 * m * w * cy2 + w * w * my;
        var tx = 2 * m * (cx2 - sx) + 2 * w * (mx - cx2), ty = 2 * m * (cy2 - sy) + 2 * w * (my - cy2), tl = Math.sqrt(tx * tx + ty * ty) || 1;
        var half = (12 - 8.5 * w) * (0.78 + 0.22 * Math.sin(j * 1.3 + amount * 18)) * Math.sin(Math.PI * Math.min(1, (j + 0.6) / N * 1.15)) + 1.5; // fat at the cover, thin at the glass, swelling as it runs
        L.push(x - ty / tl * half, y + tx / tl * half); R.push(x + ty / tl * half, y - tx / tl * half);
        if (j === 0 || j === N) ends.push(x, y, half);
      }
      pctx.fillStyle = '#000'; pctx.beginPath();
      pctx.moveTo(L[0], L[1]);
      for (j = 2; j < L.length; j += 2) pctx.lineTo(L[j], L[j + 1]);
      for (j = R.length - 2; j >= 0; j -= 2) pctx.lineTo(R[j], R[j + 1]);
      pctx.closePath();
      pctx.moveTo(ends[0] + ends[2], ends[1]); pctx.arc(ends[0], ends[1], ends[2], 0, 6.2832);       // rounded ends
      pctx.moveTo(ends[3] + ends[5], ends[4]); pctx.arc(ends[3], ends[4], ends[5], 0, 6.2832);
      pctx.fill();
    }    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - last) / 1000 || 0), t = now / 1000, i;
      // Keep an eye on how long frames are really taking. If this device cannot keep up (under about 40 a
      // second for a while), stop blurring the drops together: the name looks slightly grainier but moves smoothly.
      if (last && !cheap) {
        pace = pace * 0.92 + Math.min(0.1, (now - last) / 1000) * 0.08;
        if (++seenFrames > 50 && pace > 0.026) { cheap = true; canvas.style.filter = 'none'; }
      }
      last = now;
      // The order of events. Going in: the ink pours into the tube and pools, and only then gathers into the
      // name. Going out: the name melts back to the pool first, and only then pours away.
      if (want) { if (fill < 1) fill = Math.min(1, fill + dt / 1.9); else prog = Math.min(1, prog + dt / 1.7); }
      else { if (prog > 0) prog = Math.max(0, prog - dt / 1.0); else fill = Math.max(0, fill - dt / 2.3); }
      if (cover) {
        // Coming back out: the liquid does not reappear where it used to be. It starts again as nothing at
        // the spot the stream is aimed at, down and to the right of the tube's mouth, and is held there.
        if (!want && prog <= 0 && respawn) {
          respawn = false;
          cover.spawn(tube.offsetLeft + mouth + window.innerWidth * 0.3, tube.offsetTop + H / 2 + window.innerHeight * 0.3);
        }
        // The stream always runs to wherever the cover liquid is at this moment, even as the page scrolls.
        var at = cover.where();
        if (at) from = { x: Math.max(20, Math.min(window.innerWidth - 20, at.x)), y: Math.max(-30, Math.min(window.innerHeight + 30, at.y)) };
        // How much is on the cover follows the stream, not a switch. Going in, the blob shrinks steadily as
        // ink leaves it and is gone by the time the tail of the stream sets off. Coming out, it stays
        // empty until the head of the stream arrives, then swells as the rest pours in.
        var lvl = want ? 1 - Math.min(1, fill / 0.8) : Math.max(0, (1 - fill - 0.3) / 0.7);
        cover.ink(lvl * lvl * (3 - 2 * lvl));
        if (!want && fill <= 0) cover.release(); // all back: it is free to wander again
      }
      stream(fill, !!want);
      // scrolling the page throws the liquid: it leans against the direction of travel, then swings back
      sloshV += (-slosh * 60 - sloshV * 7) * dt; slosh += sloshV * dt;
      var lean = Math.max(-0.5, Math.min(0.5, slosh));
      // While the pointer is over the tube it stops being shapes and is just liquid again.
      loose = Math.max(0, Math.min(1, loose + (ptr ? dt * 7 : -dt * 2.2)));
      // every so often a drop hangs off the bottom of a shape, stretches, and is drawn back up
      if (prog >= 1 && !loose && t > nextDrip && drops.length) {
        nextDrip = t + 0.2 + Math.random() * 0.7;
        for (var tries = 0; tries < 12; tries++) { var c = drops[Math.floor(Math.random() * drops.length)]; if (c.low && !c.fall) { drips.push({ d: c, t0: t, len: H * (0.18 + Math.random() * 0.18) }); break; } }
      }
      for (i = drips.length - 1; i >= 0; i--) if (t - drips[i].t0 > 1.4) { drips[i].d.fall = 0; drips.splice(i, 1); }
      drips.forEach(function (dr) { var u = (t - dr.t0) / 1.4; dr.d.fall = Math.sin(Math.PI * Math.pow(u, 0.7)) * dr.len; });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      // Behind the front of the flow the shapes have set, so the name is readable. Each one rides the wave
      // and leans with the slosh on its own; where the ripple is passing, or under the pointer, it is unset.
      var front = (prog - 0.28) / 0.62 * W - size * 0.5, soft = [];
      ctx.font = face; ctx.textBaseline = 'middle';
      for (i = 0; i < shapes.length; i++) {
        var s = shapes[i];
        soft[i] = prog >= 1 ? Math.max(loose, melt(i, t)) : loose;
        if (s.x + s.w * 0.5 > front || s.ch === ' ' || soft[i] > 0.3) continue;
        var by = H / 2 + ride(i, t), squash = 1 + Math.sin(t * 2.4 - i * 0.62 + 1.2) * 0.09;
        ctx.setTransform(dpr * (2 - squash), 0, dpr * -lean * 0.5, dpr * squash, dpr * (s.x + s.w / 2 + lean * 3), dpr * by);
        if (s.img) ctx.drawImage(flower, -s.w / 2, -s.w / 2, s.w, s.w); else ctx.fillText(s.ch, -s.w / 2, size * 0.04);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      var pool = Math.min(1, fill * 1.15);
      for (i = 0; i < drops.length; i++) {
        var p = drops[i], e = Math.max(0, Math.min(1, (prog - p.wait) / 0.28)), sf = soft[p.si] || 0;
        e = e * e * (3 - 2 * e);
        // on its way each drop runs along the middle of the tube, then rises or sinks into its place in a shape
        var x = p.hx + (p.tx - p.hx) * e, y = p.hy + (H / 2 - p.hy) * Math.sin(Math.PI * e) * 0.9 + (p.ty - p.hy) * e * e;
        var stir = (1.1 - 0.3 * e) * (1 + 1.6 * sf);
        x += Math.sin(t * 2.8 + p.ph) * stir - lean * (p.ty - H / 2) * 0.5 * e + lean * 3 * e;
        y += Math.cos(t * 2.3 + p.ph * 1.7) * stir + ride(p.si, t) * e + (p.fall || 0) + sf * e * Math.sin(t * 3 + p.ph) * 1.5;
        // Each drop can be knocked away from its place and is pulled back by a spring. Under the pointer the
        // push is hard and the spring is slack, so the liquid scatters and drifts; once the pointer has gone
        // the spring tightens and the drops run home.
        var ax = -p.ox * (ptr ? 5 : 70) - p.vx * (ptr ? 3.2 : 11), ay = -p.oy * (ptr ? 5 : 70) - p.vy * (ptr ? 3.2 : 11);
        if (ptr) {
          var dx = x + p.ox - ptr.x, dy = y + p.oy - ptr.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, reach = size * 2.4;
          if (dist < reach) { var push = (1 - dist / reach) * 2600; ax += dx / dist * push; ay += dy / dist * push; }
          ax += Math.sin(t * 5 + p.ph * 3) * 60; ay += Math.cos(t * 4.3 + p.ph * 2) * 60; // and it never quite settles
        }
        p.vx += ax * dt; p.vy += ay * dt; p.ox += p.vx * dt; p.oy += p.vy * dt;
        var fx = x + p.ox, fy = y + p.oy;
        // the glass keeps it in: drops bounce off the inside of the tube
        if (fx < 3) { p.ox += 3 - fx; p.vx = Math.abs(p.vx) * 0.5; fx = 3; } else if (fx > W - 3) { p.ox -= fx - (W - 3); p.vx = -Math.abs(p.vx) * 0.5; fx = W - 3; }
        if (fy < 3) { p.oy += 3 - fy; p.vy = Math.abs(p.vy) * 0.5; fy = 3; } else if (fy > H - 3) { p.oy -= fy - (H - 3); p.vy = -Math.abs(p.vy) * 0.5; fy = H - 3; }
        // drops are fatter while pooled, and the pool is only as big as the ink that has arrived so far
        var rad = ((1.9 - 0.95 * e) * (p.fall ? 1.4 : 1) + 0.45 * sf * e) * (e > 0 ? 1 : pool) * fat;
        if (rad < 0.15) continue;
        ctx.moveTo(fx + rad, fy);
        ctx.arc(fx, fy, rad, 0, 6.2832);
      }
      ctx.fill();
      if (!want && fill <= 0) { tube.classList.remove('on'); pour.style.display = 'none'; pouring = false; return; } // empty: stop until wanted again
      if (!document.hidden) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && (want || fill > 0)) { last = 0; raf = requestAnimationFrame(frame); } } // (0: the pause before this does not count as a slow frame)
    function check() {
      var y = window.scrollY, now = y > window.innerHeight * 0.5 ? 1 : 0;
      sloshV += Math.max(-40, Math.min(40, y - lastY)) * 0.06; lastY = y;
      if (now === want) return;
      want = now;
      if (!from) from = { x: window.innerWidth / 2, y: -30 };
      if (want) { tube.classList.add('on'); if (cover) cover.release(); }
      else respawn = fill >= 1; // only start afresh if all of it had gone into the tube
      if (still) { fill = prog = want; respawn = false; if (cover) { cover.release(); cover.ink(1 - fill); } if (!want) tube.classList.remove('on'); else { last = performance.now(); frame(last); cancelAnimationFrame(raf); raf = 0; } return; }
      wake();
    }
    function touch(e) {
      var r = canvas.getBoundingClientRect(), first = !ptr;
      ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (first) drops.forEach(function (p) { // the moment it is touched, the name bursts apart from that spot
        var dx = p.tx - ptr.x, dy = p.ty - ptr.y, d = Math.sqrt(dx * dx + dy * dy) || 1, kick = Math.max(0, 1 - d / (W * 0.7)) * 190 + 40;
        p.vx += dx / d * kick + (Math.random() - 0.5) * 70; p.vy += dy / d * kick + (Math.random() - 0.5) * 70;
      });
      wake();
    }
    tube.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' }); });
    tube.addEventListener('pointerenter', touch);
    tube.addEventListener('pointermove', touch);
    tube.addEventListener('pointerdown', touch);
    tube.addEventListener('pointerleave', function () { ptr = null; });
    tube.addEventListener('pointercancel', function () { ptr = null; });
    window.addEventListener('scroll', check, { passive: true });
    document.addEventListener('visibilitychange', wake);
    var timer;
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { build(); wake(); }, 200); });
    var ready = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { build(); check(); }); };
    flower.onload = ready; flower.onerror = ready; // with or without the flower picture, the name still works
    flower.src = 'assets/flower.png';
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
    // One page, top to bottom: cover, about, projects, contact.
    [hero, marquee(), aboutBlock(false)].concat(projectsParts(), [contactPart(), footer(), toTop()]).forEach(function (part) { app.appendChild(part); });
    flow = ferro(hero);
    nameTube(s.cardName, flow);
    // arriving with a section in the address (from an old link, or the privacy page): go straight down to it
    if (location.hash.length > 1) setTimeout(function () { var sec = document.getElementById(location.hash.slice(1)); if (sec) sec.scrollIntoView(); }, 120);
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

  // UI & UX projects are kept like records on a tall open shelf: black uprights, thin boards, and the records
  // standing spine-out in loose groups, a few leaning, some cubbies left empty. Each project is one spine.
  // Click a spine and it is lifted out of the shelf and carried to the stand above, where it opens out from
  // a thin spine into the picture at the picture's own shape (most are 16:9), with a disc sliding out beside it.
  function uiux(list) {
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var phone = window.matchMedia('(max-width: 760px)').matches, cols = phone ? 2 : 3;
    // Until there are ten real projects, placeholder records fill the shelf so it never looks empty. They are
    // only drawn here, never saved: each real project added in the admin takes the place of one.
    list = list.slice();
    for (var ph = list.length; ph < 10; ph++) {
      list.push({ title: 'Project ' + ('0' + (ph + 1)).slice(-2), role: 'UI & UX Design', images: [], link: '',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' });
    }
    var skin = h('i', { class: 'vskin' }), art = h('div', { class: 'vart' });
    var sleeve = h('div', { class: 'vsleeve' }, art, skin), disc = h('div', { class: 'vdisc', 'aria-hidden': 'true' }, h('i'));
    var info = h('div', { class: 'vinfo', 'aria-live': 'polite' });
    var now = h('div', { class: 'vnow' }, disc, sleeve);
    var stage = h('div', { class: 'vstage' }, now, info);
    var recs = [], timer = 0, cur = -1, busy = false;
    function shade(n) { return SHADES[n % SHADES.length]; }
    // Puts a picture on the sleeve and lets the sleeve take that picture's shape. With no picture it is 16:9.
    function put(p, n, ref) {
      sleeve.style.aspectRatio = '16 / 9';
      if (!ref) { art.replaceChildren(h('span', { class: 'vblank', style: 'background:' + shade(n), text: p.title || 'Project ' + (n + 1) })); return; }
      var pic = img(ref, '', p.title);
      var size = function () { if (pic.naturalWidth) sleeve.style.aspectRatio = String(Math.max(0.62, Math.min(2.4, pic.naturalWidth / pic.naturalHeight))); };
      pic.addEventListener('load', size); size();
      art.replaceChildren(pic);
    }
    function show(n, from) {
      if (busy) return;
      var p = list[n];
      cur = n; stage.classList.remove('idle');
      now.setAttribute('aria-label', (p.title || 'This record') + '. Put it back on the shelf');
      put(p, n, p.images[0]);
      info.replaceChildren.apply(info, [
        h('span', { class: 'vno', text: 'No. ' + ('0' + (n + 1)).slice(-2) + ' / ' + ('0' + list.length).slice(-2) }),
        h('h3', { text: p.title }),
        p.role ? h('p', { class: 'vrole', text: p.role }) : null,
        p.description ? h('p', { class: 'vtext', text: p.description }) : null,
        // more pictures of the same project: tap one to put it on the sleeve
        p.images.length > 1 ? h('div', { class: 'vmore' }, p.images.map(function (r, k) {
          return h('button', { type: 'button', 'aria-label': 'Picture ' + (k + 1) + ' of ' + p.images.length, 'aria-pressed': String(k === 0), onclick: function (e) {
            put(p, n, r);
            Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (b) { b.setAttribute('aria-pressed', String(b === e.currentTarget)); });
          } }, img(r, '', ''));
        })) : null,
        p.link ? h('a', { class: 'btn', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }) : null].filter(Boolean));
      recs.forEach(function (b, k) { b.classList.toggle('out', k === n); k === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
      clearTimeout(timer);
      skin.style.background = shade(n);
      if (!from || still) { disc.classList.add('on'); return; }
      // lift the spine straight up out of the shelf, carry it to the stand, and let it open out into the picture.
      // The disc is inside the sleeve the whole way: it goes back in at once, travels with it, and only
      // slides out again after the sleeve has landed.
      disc.style.transition = 'none'; disc.classList.remove('on'); void disc.offsetWidth; disc.style.transition = '';
      var r0 = stage.getBoundingClientRect();
      if (r0.top < 0 || r0.top > window.innerHeight * 0.55) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var a = from.getBoundingClientRect(), b = sleeve.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      var thin = 'scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
      now.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) ' + thin },
        { transform: 'translate(' + dx + 'px,' + (dy - a.height * 0.95) + 'px) ' + thin, offset: 0.3 },
        { transform: 'none' }
      ], { duration: 950, easing: 'cubic-bezier(.4, 0, .2, 1)' });
      skin.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 950, easing: 'ease-in' }); // the plain spine gives way to the picture
      timer = setTimeout(function () { disc.classList.add('on'); }, 860);
    }
    // Clicking the record on the stand puts it away: the disc slides back into the sleeve, the sleeve closes
    // down to a spine again and drops into the gap it left in the shelf. The stand then waits, empty, for the
    // next pick.
    function putBack() {
      if (cur < 0 || busy) return;
      var slot = recs[cur], n = cur, settled = false;
      function rest() {
        if (settled) return; // the animation and its safety timer both end here; only the first one counts
        settled = true;
        slot.classList.remove('out'); slot.removeAttribute('aria-current');
        cur = -1; busy = false;
        stage.classList.add('idle');
        info.replaceChildren(h('p', { class: 'vhint', text: 'Pick a record from the shelf.' }));
        now.setAttribute('aria-label', 'The stand is empty');
      }
      clearTimeout(timer);
      disc.classList.remove('on');
      if (still) { rest(); return; }
      busy = true;
      skin.style.background = shade(n);
      timer = setTimeout(function () { // once the disc is back inside
        var a = slot.getBoundingClientRect(), b = sleeve.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        var thin = 'scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')';
        skin.animate([{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
        now.animate([
          { transform: 'none' },
          { transform: 'translate(' + dx + 'px,' + (dy - a.height * 0.95) + 'px) ' + thin, offset: 0.7 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) ' + thin }
        ], { duration: 900, easing: 'cubic-bezier(.4, 0, .2, 1)' }).onfinish = function () {
          skin.getAnimations().forEach(function (an) { an.cancel(); });
          rest();
        };
        setTimeout(function () { if (busy) rest(); }, 1500); // in case the tab is in the background
      }, 520);
    }
    now.setAttribute('role', 'button'); now.tabIndex = 0;
    now.addEventListener('click', putBack);
    now.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); putBack(); } });
    // The shelf. Projects are shared out three to a cubby, mixed in with plain white records. Cubbies take
    // turns stacking from the left and the right, one record in most groups leans, and one cubby stays bare.
    var per = 3, need = Math.ceil(list.length / per), rowsN = Math.max(2, Math.ceil((need + 1) / cols)), cubs = rowsN * cols;
    var bare = cubs > need ? cubs - 2 : -1; // the cubby left empty, second to last
    var unit = h('div', { class: 'vunit', style: '--cubs:' + cols });
    function plain(lean) { return h('span', { class: 'vrec plain' + (lean ? ' lean' : ''), 'aria-hidden': 'true' }); }
    var next = 0;
    for (var c = 0; c < cubs; c++) {
      var cub = h('div', { class: 'vcub' + (c % 2 ? ' right' : '') + (c >= cubs - cols ? ' floor' : '') });
      if (c !== bare && next < list.length) {
        for (var e = 0; e < 1 + c % 3; e++) cub.appendChild(plain());
        for (var i = 0; i < per && next < list.length; i++, next++) {
          (function (n, p) {
            var b = h('button', { class: 'vrec', type: 'button', style: 'background:' + shade(n), 'aria-label': (p.title || 'Project ' + (n + 1)) + ', take it off the shelf',
              onclick: function () { show(n, b); } }, h('span', { text: p.title || 'Project ' + (n + 1) }));
            recs[n] = b; cub.appendChild(b);
          })(next, list[next]);
          if (i === 0 && c % 2 === 0) cub.appendChild(plain());
        }
        cub.appendChild(plain(true));
      } else if (c !== bare) { for (var q = 0; q < 4; q++) cub.appendChild(plain(q === 3)); }
      unit.appendChild(cub);
    }
    for (var k = 0; k <= cols; k++) unit.appendChild(h('i', { class: 'vpost', style: 'left:' + (k / cols * 100) + '%', 'aria-hidden': 'true' })); // the uprights
    show(0);
    return h('div', { class: 'vshelf' }, stage, unit);
  }  function developer(list) {
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
  }
  // The projects part of the page: its own full-screen cover with the drifting tool icons and the four
  // category links, then one section per category.
  function projectsParts() {
    var s = C.site, parts = [];
    var render = { graphic: graphic, video: video, uiux: uiux, developer: developer };
    var flow = heroIcons(); // the tool icons drift across behind the title
    parts.push(h('header', { class: 'phero', id: 'projects' }, flow.back, h('div', { class: 'pmid' }, h('h2', { class: 'ptitle', text: s.projectsTitle })),
      h('nav', { class: 'catnav', 'aria-label': 'Project categories' }, CATS.map(function (c, i) {
        return h('a', { href: '#' + c }, s.roles[i], h('span', { class: 'arrow' }, UI.arrow('down')), h('span', { class: 'bar b' + (i + 1) }));
      }))));
    setTimeout(function () { flow.start(); }, 0); // once it is on the page and has a size
    CATS.forEach(function (c, i) {
      var list = byCat(c);
      var body;
      if (c === 'uiux') body = uiux(list);
      else if (!list.length && c !== 'developer') body = h('p', { class: 'empty', text: 'New work coming soon.' });
      else body = render[c](list);
      parts.push(h('section', { class: 'section' + (c === 'developer' ? ' dev' : ''), id: c },
        h('h2', { text: s.roles[i] }), body));
    });
    return parts;
  }

  /* ---------- privacy and cookies ---------- */
  // What this page says has to stay true to what the site actually does. If the site starts collecting
  // anything new (analytics, a newsletter, adverts), this page must change with it.
  function privacy() {
    var s = C.site, mail = h('a', { href: 'mailto:' + s.email, text: s.email });
    function block(title) { return h('section', null, h('h2', { text: title }), Array.prototype.slice.call(arguments, 1)); }
    function p() { return h('p', null, Array.prototype.slice.call(arguments)); }
    function list(items) { return h('ul', null, items.map(function (i) { return h('li', null, i); })); }
    app.append(nav(), h('h1', { class: 'chead', text: 'Privacy & cookies' }),
      h('div', { class: 'policy' },
        p('This is the personal portfolio of ' + s.cardName + '. It is a small site and it collects very little. This page explains what it does collect, what it keeps on your device, and how to reach me about any of it.'),
        block('What I collect',
          p(h('b', { text: 'Messages you send me.' }), ' If you use the form on the Contact page, I receive the name, email address and message you type. I use them only to read and answer your message. I do not sell them, share them or add you to any mailing list.'),
          p(h('b', { text: 'Nothing else about you.' }), ' The site has no analytics, no advertising and no tracking. I do not know who visits or what they look at.')),
        block('Cookies and what is kept on your device',
          p('This site does not set any advertising or tracking cookies. It does keep a few small notes in your own browser so that it works properly:'),
          list([
            'that you have already seen the opening greeting, so it does not replay on every page (cleared when you close the tab)',
            'that you have accepted the cookie notice, so it does not keep coming back'
          ]),
          p('These stay on your device. They are not sent to me or to anyone else, and you can remove them at any time by clearing this site’s data in your browser settings.')),

        block('Other companies involved',
          list([
            'Hosting: the site is served by Vercel, which keeps standard technical logs (such as IP address and browser type) to run and protect the service. Messages from the contact form are stored in private storage there.',
            'Fonts: the lettering is loaded from Google Fonts, so your browser contacts Google to fetch it.'
          ])),
        block('Your choices',
          p('You can ask me what I hold from a message you sent, ask me to correct it, or ask me to delete it. Write to ', mail, ' and I will deal with it.')),
        block('Changes',
          p('If the site starts doing anything new with personal information, this page will be updated first. Last updated ' + new Date(2026, 10, 28).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.'))),
      footer(), toTop());
  }
  // A short, one-time notice. There is nothing to accept or refuse, because the site sets no tracking
  // cookies; it only says so, links to the full page, and goes away for good once closed.
  function cookieNote() {
    try { if (localStorage.getItem('cookieNote') === '1') return; } catch (e) { return; }
    if (page === 'privacy') return;
    var bar = h('div', { class: 'cookie-note', role: 'region', 'aria-label': 'Cookie notice' },
      h('p', null, 'This site uses no tracking cookies. It only keeps a few notes in your browser so it works properly. ', h('a', { href: 'privacy.html', text: 'Privacy & cookies' })),
      h('button', { class: 'btn', type: 'button', text: 'Accept', onclick: function () {
        try { localStorage.setItem('cookieNote', '1'); } catch (e) {}
        bar.classList.add('out'); setTimeout(function () { bar.remove(); }, 300);
      } }));
    document.body.appendChild(bar);
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

  function contactPart() {
    var s = C.site;
    return h('section', { class: 'contact-sec', id: 'contact' }, h('h2', { class: 'chead', text: s.contactHeading }),
      h('div', { class: 'contact-page' }, callingCard(s)));
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
    ({ home: home, about: about, privacy: privacy })[page]();
    cookieNote();
    animate();
  });
})();
