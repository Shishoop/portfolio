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
    } });
    return h('section', { class: 'about', id: 'about' },
      h('div', null,
        h('h2', null, greeting(s), h('br'), s.greetingLead + ' ', h('b', { text: s.greetingRole })),
        h('p', { class: 'bio' }, s.bio, more),
        roles),
      h('div', { class: 'portrait' }, s.portrait ? img(s.portrait, '', 'Portrait') : null));
  }

  function tools() {
    return h('div', { class: 'tools', 'aria-label': 'Tools I use' }, TOOLS.map(function (t) {
      return h('img', { src: 'assets/tools/' + t + '.png', alt: t, loading: 'lazy' });
    }));
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
    var b = h('button', { class: 'totop', 'aria-label': 'Back to top', text: '↑', onclick: function () { window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    // Stays out of the way of the footer links at the very bottom of the page.
    var place = function () {
      var nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 140;
      b.style.visibility = nearEnd && window.scrollY > 0 ? 'hidden' : '';
    };
    window.addEventListener('scroll', place, { passive: true });
    return b;
  }

  /* ---------- home ---------- */
  function home() {
    var s = C.site;
    if (!sessionStorage.getItem('introSeen')) {
      var intro = h('div', { class: 'intro', role: 'button', tabindex: '0', 'aria-label': 'Enter site' }, h('span', { text: s.introWord }));
      var leave = function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.clientX) { intro.style.setProperty('--x', e.clientX + 'px'); intro.style.setProperty('--y', e.clientY + 'px'); }
        intro.classList.add('leave');
        sessionStorage.setItem('introSeen', '1');
        setTimeout(function () { intro.remove(); }, 1200);
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
        nav(),
        h('div', { class: 'hero-mid' },
          h('div', { class: 'mark' },
            h('h1', { class: 'sr-only', text: 'Portfolio' }),
            h('img', { src: 'assets/portfolio-wordmark.png', alt: 'Portfolio' }),
            s.roles.map(function (r, i) { return h('span', { class: 'tag t' + (i + 1), text: '( ' + (i + 1) + ' )' + r }); }))),
        h('div', { class: 'hero-foot' }, clock)),
      marquee(), aboutBlock(false), tools(), footer(), toTop());
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
      stage.replaceChildren(p.images[0] ? img(p.images[0], '', p.title) : '');
      cap.replaceChildren(h('h3', { text: p.title }), h('p', { text: p.description }));
      Array.prototype.forEach.call(thumbs.children, function (b, n2) { n2 === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    }
    show(0);
    return h('div', { class: 'gd' },
      h('div', { class: 'viewer' },
        h('button', { class: 'chev', 'aria-label': 'Previous', text: '<', onclick: function () { show(i - 1); } }),
        stage,
        h('button', { class: 'chev', 'aria-label': 'Next', text: '>', onclick: function () { show(i + 1); } }),
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
    var pane = h('div', { class: 'pane', tabindex: '0' });
    var side = h('div', { class: 'pane side' }, list.map(function (p, n) {
      return h('button', { 'aria-label': p.title || 'Project ' + (n + 1), onclick: function () { show(n); } }, p.images[0] ? img(p.images[0], '', '') : null);
    }));
    function show(n) {
      var p = list[n];
      pane.replaceChildren(h('div', { class: 'caption' }, h('h3', { text: p.title }), h('p', { text: p.description })));
      p.images.forEach(function (r) { pane.append(img(r, '', p.title)); });
      if (p.link) pane.append(h('a', { class: 'btn', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }));
      pane.scrollTop = 0;
      Array.prototype.forEach.call(side.children, function (b, n2) { n2 === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); });
    }
    if (list.length) show(0);
    return h('div', { class: 'win' },
      h('div', { class: 'win-bar' }, title, h('span', { class: 'ctl', 'aria-hidden': 'true', text: '—□✕' })),
      h('div', { class: 'ux' }, pane, side));
  }

  function developer(list) {
    var grid = h('div', { class: 'folders' });
    list.forEach(function (p, n) {
      grid.append(h('button', { onclick: function (e) { popup(list, n, e.currentTarget); } },
        h('span', { class: 'fwrap', style: 'display:block' }, folder(SHADES[n % 4], { strip: true })),
        h('span', { class: 'name', text: p.title })));
    });
    // The empty "+" folders are an admin shortcut: visitors never see them.
    if (Store.signedIn()) {
      var slots = Math.max(6, Math.ceil((list.length + 1) / 3) * 3);
      for (var k = list.length; k < slots; k++) {
        grid.append(h('a', { href: 'admin.html', 'aria-label': 'Add a project in the admin' }, h('span', { class: 'fwrap', style: 'display:block' }, folder('', { dashed: true, plus: true }))));
      }
    }
    return grid;
  }

  function popup(list, start, opener) {
    var i = start;
    var panel = h('div', { class: 'panel' });
    var close = h('button', { class: 'x', 'aria-label': 'Close', text: '✕', onclick: done });
    var overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project' },
      h('button', { class: 'chev', 'aria-label': 'Previous project', text: '<', onclick: function () { show(i - 1); } }),
      h('div', { class: 'pop' }, close, panel),
      h('button', { class: 'chev', 'aria-label': 'Next project', text: '>', onclick: function () { show(i + 1); } }));
    function show(n) {
      i = (n + list.length) % list.length;
      var p = list[i];
      var pics = h('div', { class: 'pics' });
      var refs = p.images.length ? p.images : ['', ''];
      refs.forEach(function (r) { pics.append(r ? img(r, '', p.title) : h('div')); });
      panel.replaceChildren(pics, h('div', { class: 'text' },
        h('h3', { text: p.title }), h('p', { text: p.description }),
        p.link ? h('a', { class: 'go', href: p.link, target: '_blank', rel: 'noopener', text: 'View project' }) : null));
    }
    function key(e) {
      if (e.key === 'Escape') done();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    }
    function done() {
      document.removeEventListener('keydown', key);
      overlay.remove();
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
    app.append(nav(), h('h1', { class: 'ptitle', text: s.projectsTitle }),
      h('nav', { class: 'catnav', 'aria-label': 'Project categories' }, CATS.map(function (c, i) {
        return h('a', { href: '#' + c }, s.roles[i], h('span', { class: 'arrow', 'aria-hidden': 'true', text: '↓' }), h('span', { class: 'bar b' + (i + 1) }));
      })));
    CATS.forEach(function (c, i) {
      var list = byCat(c);
      var body;
      if (c === 'uiux') body = uiux(list, s.roles[i]);
      else if (!list.length && !(c === 'developer' && Store.signedIn())) body = h('p', { class: 'empty', text: 'New work coming soon.' });
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
      h('div', { class: 'win-bar' }, 'New message', h('span', { class: 'ctl', 'aria-hidden': 'true', text: '—□✕' })),
      h('div', { class: 'form' },
        h('label', { class: 'field' }, 'Name', name),
        h('label', { class: 'field' }, 'Email', email),
        h('label', { class: 'field' }, 'Message', msg),
        note,
        h('div', { style: 'text-align:right' }, h('button', { class: 'btn', type: 'submit', text: 'Send' }))));
    app.append(nav(), h('h1', { class: 'chead', text: s.contactHeading }),
      h('div', { class: 'contact' },
        h('div', null,
          h('p', { class: 'blurb', text: s.contactBlurb }),
          h('div', { class: 'info' },
            h('a', { href: 'mailto:' + s.email, text: s.email }),
            h('a', { text: s.handle }),
            link('Linkedin', s.linkedin), link('Facebook', s.facebook), link('Instagram', s.instagram))),
        form),
      footer(), toTop());
  }

  Store.load().then(function (content) {
    C = content;
    ({ home: home, about: about, projects: projects, contact: contact })[page]();
  });
})();
