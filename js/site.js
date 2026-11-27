(function () {
  var h = UI.h, img = UI.img, folder = UI.folder;
  var TOOLS = ['photoshop', 'canva', 'figma', 'excel', 'word', 'powerpoint', 'vscode', 'capcut', 'claude', 'gemini', 'jira', 'chatgpt', 'lightroom'];
  var CATS = Store.CATEGORIES, SHADES = Store.SHADES;
  var app = document.getElementById('app');
  var page = document.body.getAttribute('data-page');
  var C;

  function nav() {
    var items = [['about', 'about.html'], ['projects', 'projects.html'], ['contact', 'contact.html']];
    return h('nav', { class: 'nav', 'aria-label': 'Main' },
      page === 'home' ? h('span') : h('a', { class: 'home', href: 'index.html', 'aria-label': 'Home' }, h('img', { src: 'assets/flower.png', alt: '' })),
      h('ul', null, items.map(function (i) {
        return h('li', null, h('a', { href: i[1], 'aria-current': page === i[0] ? 'page' : null, text: i[0] }));
      })));
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
  // Cover icons: each tool is ONE element, so it can never be on screen twice. Every pass it picks a new
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
      (Math.random() < 0.5 ? front : back).appendChild(el);
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

  /* ---------- home ---------- */
  var HELLOS = ['Hello', 'Hola', 'Bonjour', 'こんにちは', 'Hallo', '안녕하세요', 'Olá', '你好', 'Kumusta', 'Mabuhay'];
  function home() {
    var s = C.site;
    var flow = heroIcons();
    var seen = sessionStorage.getItem('introSeen');
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
            word.textContent = hellos[n++];
            setTimeout(next, n <= 2 ? 300 : n >= hellos.length ? 420 : 170);
            return;
          }
          intro.classList.add('leave');
          flow.start();
          setTimeout(function () { intro.remove(); }, 1200);
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
    app.append(
      h('header', { class: 'hero' },
        flow.back,
        nav(),
        h('div', { class: 'hero-mid' },
          h('div', { class: 'mark' },
            h('h1', { class: 'sr-only', text: 'Portfolio' }),
            h('img', { src: 'assets/portfolio-wordmark.png', alt: 'Portfolio' }),
            s.roles.map(function (r, i) { return h('span', { class: 'tag t' + (i + 1), text: '( ' + (i + 1) + ' )' + r }); }))),
        h('div', { class: 'hero-foot' }, clock), flow.front),
      marquee(), aboutBlock(false), footer(), toTop());
    if (seen) flow.start();
  }

  /* ---------- about ---------- */
  function about() {
    app.append(nav(), h('h1', { class: 'sr-only', text: 'About' }), marquee(), aboutBlock(true), tools(), footer(), toTop());
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
    list.forEach(function (p, n) {
      grid.append(h('button', { onclick: function (e) { popup(list, n, e.currentTarget); } },
        h('span', { class: 'fwrap', style: 'display:block' }, folder(SHADES[n % 4], { strip: true })),
        h('span', { class: 'name', text: p.title })));
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

  function popup(list, start, opener) {
    var i = start;
    var panel = h('div', { class: 'panel' });
    var close = h('button', { class: 'x', 'aria-label': 'Close', text: '✕', onclick: done });
    var overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project' },
      h('button', { class: 'chev', 'aria-label': 'Previous project', onclick: function () { show(i - 1); } }, UI.arrow('left')),
      h('div', { class: 'pop' }, close, panel),
      h('button', { class: 'chev', 'aria-label': 'Next project', onclick: function () { show(i + 1); } }, UI.arrow('right')));
    function show(n) {
      i = (n + list.length) % list.length;
      var p = list[i];
      var pics = h('div', { class: 'pics' });
      var refs = p.images.length ? p.images : ['', ''];
      refs.forEach(function (r) { pics.append(r ? img(r, '', p.title) : h('div')); });
      panel.replaceChildren(pics, h('div', { class: 'text' },
        h('h3', { text: p.title }), h('p', { text: p.description }),
        p.link ? h('a', { class: 'go', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }) : null));
      panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
    }
    function key(e) {
      if (e.key === 'Escape') done();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    }
    function done() {
      document.removeEventListener('keydown', key);
      overlay.classList.add('out');
      setTimeout(function () { overlay.remove(); }, 220);
      if (opener) opener.focus();
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) done(); });
    document.addEventListener('keydown', key);
    show(i);
    document.body.appendChild(overlay);
    close.focus();
  }

  function projects() {
    var s = C.site;
    var render = { graphic: graphic, video: video, uiux: uiux, developer: developer };
    app.append(h('header', { class: 'phero' }, nav(), h('div', { class: 'pmid' }, h('h1', { class: 'ptitle', text: s.projectsTitle })),
      h('nav', { class: 'catnav', 'aria-label': 'Project categories' }, CATS.map(function (c, i) {
        return h('a', { href: '#' + c }, s.roles[i], h('span', { class: 'arrow' }, UI.arrow('down')), h('span', { class: 'bar b' + (i + 1) }));
      }))));
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
  function callingCard(s) {
    var card = h('div', { class: 'ccard' },
      h('div', { class: 'cc-logo' }, h('img', { src: 'assets/footer-logo.png', alt: 'narsheessho' })),
      h('div', { class: 'cc-body' },
        h('p', { class: 'cc-name', text: s.cardName }),
        h('p', { class: 'cc-roles', text: s.roles.join(' / ') }),
        h('div', { class: 'cc-lines' },
          h('a', { href: 'mailto:' + s.email, text: s.email }),
          h('a', { text: s.handle }),
          h('span', { class: 'cc-social' }, link('Linkedin', s.linkedin), link('Facebook', s.facebook), link('Instagram', s.instagram)))),
      h('div', { class: 'cc-bars', 'aria-hidden': 'true' }, [1, 2, 3, 4].map(function (n) { return h('span', { class: 'b' + n }); })));
    var wrap = h('div', { class: 'card-wrap' }, card);
    // The card leans toward the pointer, like turning a real card in your hand.
    if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('tilt');
        card.style.transform = 'rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg)';
      });
      wrap.addEventListener('mouseleave', function () { card.style.transform = ''; card.classList.remove('tilt'); });
    }
    return wrap;
  }

  function contact() {
    var s = C.site;
    var note = h('p', { class: 'note', role: 'status' });
    var name = h('input', { type: 'text', name: 'name', autocomplete: 'name', placeholder: 'Juan dela Cruz' });
    var email = h('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'name@company.com' });
    var msg = h('textarea', { name: 'message', placeholder: 'Tell me about your project' });
    var form = h('form', { class: 'win', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      note.className = 'note err';
      if (!name.value.trim()) { note.textContent = 'Enter your name.'; name.focus(); return; }
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { note.textContent = 'Enter a valid email.'; email.focus(); return; }
      if (!msg.value.trim()) { note.textContent = 'Write a message first.'; msg.focus(); return; }
      Store.addMessage({ name: name.value.trim(), email: email.value.trim(), message: msg.value.trim() }).then(function () {
        form.reset();
        note.className = 'note';
        note.textContent = 'Message sent. Thank you.';
      }, function () {
        note.textContent = "Couldn't send your message. Try again in a moment.";
      });
    } },
      h('div', { class: 'win-bar' }, 'New message', UI.controls()),
      h('div', { class: 'form' },
        h('label', { class: 'field' }, 'Name', name),
        h('label', { class: 'field' }, 'Email', email),
        h('label', { class: 'field' }, 'Message', msg),
        note,
        h('div', { style: 'text-align:right' }, h('button', { class: 'btn', type: 'submit', text: 'Send' }))));
    app.append(nav(), h('h1', { class: 'chead', text: s.contactHeading }),
      h('div', { class: 'contact-page' }, callingCard(s), h('p', { class: 'blurb', text: s.contactBlurb }), form),
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
    var pick = '.mark, .hero-foot, .about > *, .tools-flow, .ptitle, .section > h2, .gd > *, .section > div:not(.gd):not(.folders), .folders > *, .chead, .card-wrap, .contact-page > .blurb, .contact-page > .win, .footer .row';
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
