(function () {
  var h = UI.h, img = UI.img, folder = UI.folder;
  var CATS = Store.CATEGORIES, SHADES = Store.SHADES;
  var app = document.getElementById('app');
  var C, view = 'projects', cat = 'graphic';
  var status = h('p', { class: 'toast', role: 'status' });

  function say(text, bad) {
    status.textContent = text;
    status.className = 'toast show' + (bad ? ' err' : '');
    clearTimeout(say.t);
    say.t = setTimeout(function () { status.className = 'toast'; }, 2600);
  }
  function persist(text) {
    return Store.save(C).then(function () { say(text || 'Saved'); }, function (e) {
      if (e && e.status === 401) { say('Your session ended. Sign in again.', true); start(); }
      else say("Couldn't save. Check your connection and try again.", true);
      throw e;
    });
  }
  function bar(title, onClose) {
    return h('div', { class: 'win-bar' }, title,
      onClose ? h('button', { class: 'ctl', type: 'button', 'aria-label': 'Close', text: '✕', onclick: onClose })
        : UI.controls());
  }
  function field(label, control) { return h('label', { class: 'field' }, label, control); }

  /* ---------- sign in ---------- */
  function auth(hasPassword) {
    var note = h('p', { class: 'note err', role: 'alert' });
    var pass = h('input', { type: 'password', autocomplete: hasPassword ? 'current-password' : 'new-password' });
    var again = h('input', { type: 'password', autocomplete: 'new-password' });
    var form = h('form', { class: 'win auth', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      note.textContent = '';
      if (hasPassword) {
        Store.signIn(pass.value).then(function (ok) {
          if (ok) boot(); else { note.textContent = "That password doesn't match. Try again."; pass.select(); }
        }).catch(function () { note.textContent = "Couldn't reach the server. Try again in a moment."; });
        return;
      }
      if (pass.value.length < 8) { note.textContent = 'Use at least 8 characters.'; pass.focus(); return; }
      if (pass.value !== again.value) { note.textContent = "The two passwords don't match."; again.focus(); return; }
      Store.setPassword(pass.value).then(function () { return Store.signIn(pass.value); }).then(boot);
    } },
      bar('Admin'),
      h('div', { class: 'form' },
        h('img', { class: 'flower', src: 'assets/flower.png', alt: '' }),
        h('h1', { text: hasPassword ? 'Sign in' : 'Create your admin password' }),
        hasPassword ? null : h('p', { class: 'note', text: 'First time here. Choose the password you will use to sign in.' }),
        field('Password', pass),
        hasPassword ? null : field('Repeat password', again),
        note,
        h('button', { class: 'btn', type: 'submit', text: hasPassword ? 'Sign in' : 'Create password' }),
        h('a', { class: 'back', href: 'index.html', text: 'Back to site' })));
    app.replaceChildren(form);
    pass.focus();
  }

  /* ---------- shell ---------- */
  var VIEWS = [['projects', 'Projects'], ['texts', 'Site texts'], ['contact', 'Contact info'], ['messages', 'Messages'], ['backup', 'Backup']];
  function render() {
    var body = ({ projects: projectsView, texts: textsView, contact: contactView, messages: messagesView, backup: backupView })[view]();
    app.replaceChildren(
      h('header', { class: 'top' },
        h('a', { class: 'brand', href: 'index.html' }, h('img', { src: 'assets/flower.png', alt: '' }), 'Admin'),
        h('div', null,
          h('a', { href: 'index.html', target: '_blank', rel: 'noopener', text: 'View site' }),
          h('button', { type: 'button', text: 'Sign out', onclick: function () { Store.signOut(); start(); } }))),
      h('div', { class: 'shell' },
        h('nav', { class: 'side', 'aria-label': 'Admin sections' }, VIEWS.map(function (v) {
          return h('button', { type: 'button', 'aria-current': view === v[0] ? 'page' : null, text: v[1], onclick: function () { view = v[0]; render(); } });
        })),
        h('section', { class: 'main' }, body)),
      status);
  }

  /* ---------- projects ---------- */
  function inCat() { return C.projects.filter(function (p) { return p.category === cat; }); }
  function move(p, dir) {
    var list = inCat(), i = list.indexOf(p), other = list[i + dir];
    if (!other) return;
    var a = C.projects.indexOf(p), b = C.projects.indexOf(other);
    C.projects[a] = other; C.projects[b] = p;
    persist('Order saved').then(render);
  }
  function projectsView() {
    var list = inCat(), dragged = null;
    var tabs = h('div', { class: 'tabs', role: 'tablist' }, CATS.map(function (c, i) {
      return h('button', { type: 'button', role: 'tab', 'aria-selected': String(c === cat), onclick: function () { cat = c; render(); } },
        C.site.roles[i], h('span', { class: 'bar', style: 'background:' + SHADES[i] }));
    }));
    var grid = h('div', { class: 'grid' });
    list.forEach(function (p, i) {
      var card = h('div', { class: 'card' + (p.published ? '' : ' draft'), draggable: 'true' },
        h('button', { type: 'button', class: 'open', 'aria-label': 'Edit ' + (p.title || 'project'), onclick: function () { editor(p); } },
          h('span', { class: 'fwrap' }, folder(Store.shade(cat), p.published ? {} : { dashed: true }),
            p.images[0] ? img(p.images[0], 'cover', '') : null),
          h('span', { class: 'name', text: (p.title || 'Untitled') + (p.published ? '' : ' (draft)') })),
        h('div', { class: 'order' },
          h('button', { type: 'button', 'aria-label': 'Move earlier', disabled: i === 0, text: '◀', onclick: function () { move(p, -1); } }),
          h('button', { type: 'button', 'aria-label': 'Move later', disabled: i === list.length - 1, text: '▶', onclick: function () { move(p, 1); } })));
      card.addEventListener('dragstart', function () { dragged = p; });
      card.addEventListener('dragover', function (e) { e.preventDefault(); });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragged || dragged === p) return;
        C.projects.splice(C.projects.indexOf(dragged), 1);
        C.projects.splice(C.projects.indexOf(p), 0, dragged);
        persist('Order saved').then(render);
      });
      grid.append(card);
    });
    grid.append(h('div', { class: 'card' },
      h('button', { type: 'button', class: 'open', onclick: function () { editor(null); } },
        h('span', { class: 'fwrap' }, folder('', { dashed: true, plus: true })),
        h('span', { class: 'name', text: 'New project' }))));
    return h('div', null, h('h1', { text: 'Projects' }), tabs, grid,
      h('p', { class: 'note', text: 'Click a folder to edit it. Drag folders, or use the arrows, to change their order on the site.' }));
  }

  function editor(original) {
    var isNew = !original;
    var p = original ? JSON.parse(JSON.stringify(original)) : { id: Store.uid(), category: cat, title: '', description: '', images: [], link: '', published: true };
    var added = [], opener = document.activeElement;
    var note = h('p', { class: 'note err', role: 'alert' });
    var thumbs = h('div', { class: 'thumbs' });
    var title = h('input', { type: 'text', value: p.title, placeholder: 'Brand identity for a local cafe' });
    var role = h('input', { type: 'text', value: p.role || '', placeholder: 'Front-end developer' });
    var category = h('select', null, CATS.map(function (c, i) { return h('option', { value: c, selected: c === p.category, text: C.site.roles[i] }); }));
    var desc = h('textarea', { placeholder: 'What the project was and what you did' });
    desc.value = p.description;
    var linkLabel = h('span');
    var link = h('input', { type: 'url', value: p.link, placeholder: 'https://' });
    var published = h('input', { type: 'checkbox' });
    published.checked = p.published;
    function label() { linkLabel.textContent = category.value === 'video' ? 'Video link (YouTube, Vimeo or .mp4)' : 'Project link (optional)'; }
    category.addEventListener('change', label); label();

    function drawThumbs() {
      thumbs.replaceChildren();
      p.images.forEach(function (ref, i) {
        thumbs.append(h('div', { class: 'thumb' + (i === 0 ? ' first' : '') }, img(ref, '', ''),
          h('button', { type: 'button', class: 'rm', 'aria-label': 'Remove image', text: '✕', onclick: function () { p.images.splice(i, 1); drawThumbs(); } }),
          i > 0 ? h('button', { type: 'button', class: 'mv', 'aria-label': 'Move image earlier', text: '◀', onclick: function () { p.images.splice(i - 1, 0, p.images.splice(i, 1)[0]); drawThumbs(); } }) : h('span', { class: 'tagc', text: 'cover' })));
      });
    }
    function addFiles(files) {
      var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
      if (!imgs.length) return;
      note.textContent = '';
      Promise.all(imgs.map(function (f) { return Store.putImage(f); })).then(function (refs) {
        refs.forEach(function (r) { p.images.push(r); added.push(r); });
        drawThumbs();
      }).catch(function () { note.textContent = "Couldn't save that image. Try a smaller file."; });
    }
    var file = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', onchange: function () { addFiles(file.files); file.value = ''; } });
    var drop = h('label', { class: 'drop' }, file, h('span', { class: 'big', text: '+' }), 'Drop images here or click to upload');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });

    function close() {
      document.removeEventListener('keydown', key);
      overlay.remove();
      if (opener && opener.focus) opener.focus();
    }
    function cancel() {
      added.forEach(function (r) { Store.deleteImage(r); });
      close();
    }
    function key(e) { if (e.key === 'Escape') cancel(); }
    var del = h('button', { class: 'btn ghost', type: 'button', text: 'Delete project', onclick: function () {
      if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Confirm delete'; return; }
      original.images.concat(added).forEach(function (r) { Store.deleteImage(r); });
      C.projects.splice(C.projects.indexOf(original), 1);
      close();
      persist('Project deleted').then(render);
    } });
    var form = h('form', { class: 'win edit', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      if (!title.value.trim()) { note.textContent = 'Give the project a title.'; title.focus(); return; }
      if (link.value.trim() && !/^https?:\/\//i.test(link.value.trim())) { note.textContent = 'Links need to start with https://'; link.focus(); return; }
      p.title = title.value.trim(); p.role = role.value.trim(); p.category = category.value; p.description = desc.value.trim();
      p.link = link.value.trim(); p.published = published.checked;
      if (isNew) C.projects.push(p);
      else {
        original.images.forEach(function (r) { if (p.images.indexOf(r) < 0) Store.deleteImage(r); });
        C.projects[C.projects.indexOf(original)] = p;
      }
      cat = p.category;
      close();
      persist('Project saved').then(render);
    } },
      bar(isNew ? 'New project' : 'Edit project', cancel),
      h('div', { class: 'cols' },
        h('div', null, drop, thumbs, h('p', { class: 'note', text: 'The first image is the cover.' })),
        h('div', { class: 'form' },
          field('Title', title), field('Your role on it', role), field('Category', category), field('Description', desc),
          h('label', { class: 'field' }, linkLabel, link),
          h('label', { class: 'check' }, published, 'Published (visible on the site)'),
          note,
          h('div', { class: 'actions' }, isNew ? h('span') : del, h('button', { class: 'btn', type: 'submit', text: 'Save' })))));
    var overlay = h('div', { class: 'overlay-admin', role: 'dialog', 'aria-modal': 'true', 'aria-label': isNew ? 'New project' : 'Edit project' }, form);
    document.addEventListener('keydown', key);
    drawThumbs();
    document.body.appendChild(overlay);
    title.focus();
  }

  /* ---------- text forms ---------- */
  function textForm(heading, fields, extra) {
    var inputs = {};
    var form = h('form', { class: 'form wide', onsubmit: function (e) {
      e.preventDefault();
      fields.forEach(function (f) {
        var v = inputs[f[0]].value.trim();
        if (f[0].indexOf('role') === 0) C.site.roles[+f[0].slice(4)] = v; else C.site[f[0]] = v;
      });
      persist();
    } }, fields.map(function (f) {
      var val = f[0].indexOf('role') === 0 ? C.site.roles[+f[0].slice(4)] : C.site[f[0]];
      var el = f[2] === 'long' ? h('textarea') : h('input', { type: f[2] || 'text' });
      el.value = val || '';
      inputs[f[0]] = el;
      return field(f[1], el);
    }), extra || null, h('div', { class: 'actions' }, h('span'), h('button', { class: 'btn', type: 'submit', text: 'Save' })));
    return h('div', null, h('h1', { text: heading }), form);
  }

  function textsView() {
    var box = h('div', { class: 'portrait-edit' });
    function draw() {
      var file = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', onchange: function () {
        if (!file.files[0]) return;
        Store.putImage(file.files[0]).then(function (ref) {
          Store.deleteImage(C.site.portrait);
          C.site.portrait = ref;
          return persist('Portrait saved');
        }).then(draw);
      } });
      box.replaceChildren(
        h('div', { class: 'pic' }, C.site.portrait ? img(C.site.portrait, '', 'Portrait') : null),
        h('div', null,
          h('label', { class: 'btn ghost' }, file, C.site.portrait ? 'Replace portrait' : 'Upload portrait'),
          C.site.portrait ? h('button', { type: 'button', class: 'linkish', text: 'Remove', onclick: function () {
            Store.deleteImage(C.site.portrait); C.site.portrait = ''; persist('Portrait removed').then(draw);
          } }) : null,
          h('p', { class: 'note', text: 'Shown beside your bio on the cover and About pages.' })));
    }
    draw();
    return textForm('Site texts', [
      ['introWord', 'Intro word'],
      ['role0', 'Role 1 (black)'], ['role1', 'Role 2 (dark gray)'], ['role2', 'Role 3 (mid gray)'], ['role3', 'Role 4 (light gray)'],
      ['marquee', 'Marquee text'],
      ['greeting', 'Greeting, line 1'], ['name', 'Your name inside that line (clicking it opens the admin)'], ['greetingLead', 'Greeting, line 2'], ['greetingRole', 'Greeting, bold role'],
      ['bio', 'Bio', 'long'], ['whatElse', '"What else" link'],
      ['projectsTitle', 'Projects page title'], ['reelLabel', 'Demo reel placeholder'], ['copyright', 'Footer copyright']
    ], h('div', { class: 'field' }, 'Portrait', box));
  }

  function contactView() {
    return textForm('Contact info', [
      ['contactHeading', 'Contact page heading'], ['cardName', 'Name on the calling card'], ['contactBlurb', 'Contact page intro', 'long'],
      ['email', 'Email', 'email'], ['handle', 'Handle'],
      ['linkedin', 'Linkedin link', 'url'], ['facebook', 'Facebook link', 'url'], ['instagram', 'Instagram link', 'url']
    ]);
  }

  /* ---------- messages ---------- */
  function messagesView() {
    var list = h('div', { class: 'msgs' }, h('p', { class: 'note', text: 'Loading…' }));
    function draw() {
      Store.messages().then(function (msgs) {
        list.replaceChildren();
        if (!msgs.length) { list.append(h('p', { class: 'note', text: 'Messages from your contact form will show up here.' })); return; }
        msgs.forEach(function (m) {
          list.append(h('article', { class: 'msg' },
            h('header', null, h('b', { text: m.name }), ' ', h('a', { href: 'mailto:' + m.email, text: m.email }),
              h('time', { text: new Date(m.date).toLocaleString() })),
            h('p', { text: m.message }),
            h('button', { type: 'button', class: 'linkish', text: 'Delete', onclick: function () {
              Store.deleteMessage(m).then(draw);
            } })));
        });
      });
    }
    draw();
    return h('div', null, h('h1', { text: 'Messages' }), list);
  }

  /* ---------- backup ---------- */
  function backupView() {
    var note = h('p', { class: 'note err', role: 'alert' });
    var file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', onchange: function () {
      if (!file.files[0]) return;
      file.files[0].text().then(function (t) { return Store.importAll(JSON.parse(t)); })
        .then(function () { return Store.load(); })
        .then(function (c) { C = c; say('Backup restored'); })
        .catch(function () { say("That file isn't a portfolio backup.", true); });
    } });
    var p1 = h('input', { type: 'password', autocomplete: 'new-password' });
    var p2 = h('input', { type: 'password', autocomplete: 'new-password' });
    return h('div', null, h('h1', { text: 'Backup' }),
      h('p', { class: 'lead', text: Store.remote()
        ? 'Your projects, images and texts are saved online, so every visitor sees your changes. A backup file keeps a copy of the texts and project list.'
        : 'Right now your projects, images and texts are saved in this browser on this computer. Download a backup before clearing browser data or switching computers.' }),
      h('div', { class: 'actions left' },
        h('button', { class: 'btn', type: 'button', text: 'Download backup', onclick: function () {
          Store.exportAll().then(function (data) {
            var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })), download: 'portfolio-backup.json' });
            document.body.appendChild(a); a.click(); a.remove();
          });
        } }),
        h('label', { class: 'btn ghost' }, file, 'Restore from backup')),
      Store.remote() ? h('h2', { text: 'Password' }) : h('h2', { text: 'Change password' }),
      Store.remote() ? h('p', { class: 'lead', text: 'The admin password is the ADMIN_PASSWORD setting in your Vercel project. Change it there, then redeploy.' }) :
      h('form', { class: 'form narrow', onsubmit: function (e) {
        e.preventDefault();
        note.textContent = '';
        if (p1.value.length < 8) { note.textContent = 'Use at least 8 characters.'; return; }
        if (p1.value !== p2.value) { note.textContent = "The two passwords don't match."; return; }
        Store.setPassword(p1.value).then(function () { e.target.reset(); say('Password changed'); });
      } }, field('New password', p1), field('Repeat new password', p2), note,
        h('div', { class: 'actions left' }, h('button', { class: 'btn', type: 'submit', text: 'Change password' }))));
  }

  function boot() { Store.load().then(function (c) { C = c; render(); }); }
  function start() {
    Store.hasPassword().then(function (has) {
      if (has && Store.signedIn()) boot(); else auth(has);
    });
  }
  start();
})();
