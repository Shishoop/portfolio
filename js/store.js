/* Data layer. Everything the admin edits is read and written through Store,
   so swapping the browser database for a hosted backend later only touches this file. */
(function () {
  var DB_NAME = 'portfolio-db';
  var SHADES = ['#000000', '#474747', '#8a8a8a', '#b0b0b0'];
  var CATEGORIES = ['graphic', 'video', 'uiux', 'developer'];
  var LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

  function defaults() {
    var projects = [];
    for (var i = 1; i <= 9; i++) {
      projects.push({ id: 'seed-g' + i, category: 'graphic', title: 'Poster 0' + i, description: '', images: ['assets/posters/poster-0' + i + '.png'], link: '', published: true });
    }
    projects.push({ id: 'seed-v1', category: 'video', title: 'New demo reel', description: '', images: [], link: '', published: true });
    for (var d = 1; d <= 4; d++) {
      projects.push({ id: 'seed-d' + d, category: 'developer', title: 'Project 0' + d, description: LOREM, images: [], link: '', published: true });
    }
    return {
      site: {
        introWord: 'Ciao',
        roles: ['Graphic Designer', 'Video Editor', 'UI & UX Designer', 'Developer'],
        marquee: 'ABOUT ME',
        greeting: 'Hi, my name is Shiso',
        greetingLead: "and i'm a",
        greetingRole: 'Graphic Designer',
        bio: 'I am a creative and detail-oriented Web Designer, Graphic Designer, Virtual Assistant, and Advertising enthusiast based in the Philippines. I specialize in creating visually appealing and user-friendly designs while also providing reliable remote support for administrative and digital tasks. I am passionate about combining creativity, communication, and strategy to deliver effective and engaging digital solutions.',
        whatElse: 'what else?',
        portrait: '',
        projectsTitle: 'PROJECTS',
        reelLabel: 'NEW DEMO REEL',
        contactHeading: 'Lets Connect',
        contactBlurb: 'Have a project in mind? Send a message.',
        email: 'narcisolontoc@gmail.com',
        handle: '@narsheessho',
        linkedin: '', facebook: '', instagram: '',
        copyright: 'narciso lontoc 2026©'
      },
      projects: projects
    };
  }

  var dbPromise;
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore('kv');
          req.result.createObjectStore('images');
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }
  function run(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(store, mode);
        var rq = fn(t.objectStore(store));
        t.oncomplete = function () { resolve(rq ? rq.result : undefined); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }
  function kvGet(key) { return run('kv', 'readonly', function (s) { return s.get(key); }); }
  function kvSet(key, val) { return run('kv', 'readwrite', function (s) { return s.put(val, key); }); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  var urlCache = {};
  function url(ref) {
    if (!ref) return Promise.resolve('');
    if (ref.indexOf('idb:') !== 0) return Promise.resolve(ref);
    if (urlCache[ref]) return Promise.resolve(urlCache[ref]);
    return run('images', 'readonly', function (s) { return s.get(ref.slice(4)); }).then(function (blob) {
      if (!blob) return '';
      urlCache[ref] = URL.createObjectURL(blob);
      return urlCache[ref];
    });
  }

  // Large photos are scaled down before saving so the browser database stays small.
  function shrink(file) {
    var MAX = 2000;
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
      var img = new Image();
      var src = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(src);
        var scale = Math.min(1, MAX / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 1500000) return resolve(file);
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        c.toBlob(function (b) { resolve(b || file); }, type, 0.9);
      };
      img.onerror = function () { URL.revokeObjectURL(src); resolve(file); };
      img.src = src;
    });
  }

  function hash(password, salt) {
    var text = salt + ':' + password;
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('x' + h);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.readAsDataURL(blob);
    });
  }

  var Local = {
    SHADES: SHADES,
    CATEGORIES: CATEGORIES,
    uid: uid,
    url: url,
    shade: function (category) { return SHADES[Math.max(0, CATEGORIES.indexOf(category))]; },

    load: function () {
      return kvGet('content').then(function (c) {
        var d = defaults();
        if (!c) return d;
        for (var k in d.site) if (c.site[k] === undefined) c.site[k] = d.site[k];
        return c;
      });
    },
    save: function (content) { return kvSet('content', content); },

    putImage: function (file) {
      return shrink(file).then(function (blob) {
        var key = uid();
        return run('images', 'readwrite', function (s) { return s.put(blob, key); }).then(function () { return 'idb:' + key; });
      });
    },
    deleteImage: function (ref) {
      if (!ref || ref.indexOf('idb:') !== 0) return Promise.resolve();
      return run('images', 'readwrite', function (s) { return s.delete(ref.slice(4)); });
    },

    messages: function () { return kvGet('messages').then(function (m) { return m || []; }); },
    addMessage: function (msg) {
      return Local.messages().then(function (list) {
        msg.id = uid(); msg.date = new Date().toISOString();
        list.unshift(msg);
        return kvSet('messages', list);
      });
    },
    deleteMessage: function (m) {
      return Local.messages().then(function (list) { return kvSet('messages', list.filter(function (x) { return x.id !== m.id; })); });
    },

    hasPassword: function () { return kvGet('auth').then(function (a) { return !!a; }); },
    setPassword: function (password) {
      var salt = uid();
      return hash(password, salt).then(function (h) { return kvSet('auth', { salt: salt, hash: h }); });
    },
    signIn: function (password) {
      return kvGet('auth').then(function (a) {
        if (!a) return false;
        return hash(password, a.salt).then(function (h) {
          if (h === a.hash) { sessionStorage.setItem('admin', '1'); return true; }
          return false;
        });
      });
    },
    signedIn: function () { return sessionStorage.getItem('admin') === '1'; },
    signOut: function () { sessionStorage.removeItem('admin'); },

    exportAll: function () {
      return Promise.all([Local.load(), Local.messages(), run('images', 'readonly', function (s) { return s.getAllKeys(); })]).then(function (r) {
        var out = { content: r[0], messages: r[1], images: {} };
        return Promise.all(r[2].map(function (key) {
          return run('images', 'readonly', function (s) { return s.get(key); }).then(blobToDataUrl).then(function (d) { out.images[key] = d; });
        })).then(function () { return out; });
      });
    },
    importAll: function (data) {
      if (!data || !data.content || !data.content.site || !Array.isArray(data.content.projects)) return Promise.reject(new Error('Not a backup file'));
      var keys = Object.keys(data.images || {});
      return Promise.all(keys.map(function (key) {
        return fetch(data.images[key]).then(function (r) { return r.blob(); }).then(function (blob) {
          return run('images', 'readwrite', function (s) { return s.put(blob, key); });
        });
      })).then(function () { return kvSet('content', data.content); }).then(function () { return kvSet('messages', data.messages || []); });
    }
  };

  /* ---------- online storage (Vercel) ----------
     When the site runs on Vercel with storage set up, /api/content answers
     { configured: true } and everything below is used instead of the browser database,
     so edits made in the admin are seen by every visitor. */
  var TOKEN = 'adminToken';
  var isAdmin = document.body && document.body.getAttribute('data-page') === 'admin';
  var isRemote = false;
  var first = null;
  var mode = fetch('/api/content' + (isAdmin ? '?fresh=' + Date.now() : ''))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      isRemote = !!(j && j.configured);
      first = isRemote ? { content: j.content } : null;
      return isRemote;
    })
    .catch(function () { return false; });

  function token() { return sessionStorage.getItem(TOKEN) || ''; }
  function tokenValid() { return Number(token().split('.')[0]) > Date.now(); }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (token()) opts.headers.Authorization = 'Bearer ' + token();
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.ok) return data;
        if (r.status === 401) sessionStorage.removeItem(TOKEN);
        var err = new Error(data.error || 'Request failed');
        err.status = r.status;
        throw err;
      });
    });
  }
  function withDefaults(c) {
    var d = defaults();
    if (!c) return d;
    for (var k in d.site) if (c.site[k] === undefined) c.site[k] = d.site[k];
    return c;
  }
  function toJpeg(blob) {
    return new Promise(function (resolve) {
      var img = new Image();
      var src = URL.createObjectURL(blob);
      img.onload = function () {
        URL.revokeObjectURL(src);
        var c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        var g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0);
        c.toBlob(function (b) { resolve(b || blob); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(src); resolve(blob); };
      img.src = src;
    });
  }
  function uploaded(ref) { return /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/images\//.test(ref || ''); }

  var Remote = {
    load: function () {
      if (first) { var c = first.content; first = null; return Promise.resolve(withDefaults(c)); }
      return api('/api/content?fresh=' + Date.now()).then(function (j) { return withDefaults(j.content); });
    },
    save: function (content) {
      return api('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
    },
    putImage: function (file) {
      return shrink(file)
        .then(function (blob) { return blob.size > 4000000 ? toJpeg(blob) : blob; })
        .then(function (blob) { return api('/api/upload', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }); })
        .then(function (j) { return j.url; });
    },
    deleteImage: function (ref) {
      if (!uploaded(ref)) return Promise.resolve();
      return api('/api/upload?url=' + encodeURIComponent(ref), { method: 'DELETE' }).catch(function () {});
    },
    messages: function () { return api('/api/messages').then(function (j) { return j.messages; }); },
    addMessage: function (msg) {
      return api('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
    },
    deleteMessage: function (m) { return api('/api/messages?url=' + encodeURIComponent(m.id), { method: 'DELETE' }); },
    hasPassword: function () { return Promise.resolve(true); },
    setPassword: function () { return Promise.reject(new Error('The password is set in Vercel')); },
    signIn: function (password) {
      return api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password }) })
        .then(function (j) { sessionStorage.setItem(TOKEN, j.token); return true; })
        .catch(function (e) { if (e.status === 401) return false; throw e; });
    },
    exportAll: function () {
      return Promise.all([Remote.load(), Remote.messages()]).then(function (r) { return { content: r[0], messages: r[1], images: {} }; });
    },
    importAll: function (data) {
      if (!data || !data.content || !data.content.site || !Array.isArray(data.content.projects)) return Promise.reject(new Error('Not a backup file'));
      return Remote.save(data.content);
    }
  };

  var Store = window.Store = {
    SHADES: SHADES,
    CATEGORIES: CATEGORIES,
    uid: uid,
    url: url,
    shade: Local.shade,
    remote: function () { return isRemote; },
    ready: function () { return mode; },
    signedIn: function () { return isRemote ? tokenValid() : Local.signedIn(); },
    signOut: function () { sessionStorage.removeItem(TOKEN); Local.signOut(); }
  };
  ['load', 'save', 'putImage', 'deleteImage', 'messages', 'addMessage', 'deleteMessage', 'hasPassword', 'setPassword', 'signIn', 'exportAll', 'importAll'].forEach(function (name) {
    Store[name] = function () {
      var args = arguments;
      return mode.then(function (remote) { return (remote ? Remote : Local)[name].apply(null, args); });
    };
  });

  /* Small DOM helpers shared by the site and the admin. */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  }
  function append(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(e, x); }); return; }
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function img(ref, cls, alt) {
    var e = h('img', { class: cls || '', alt: alt || '', loading: 'lazy' });
    url(ref).then(function (u) { if (u) e.src = u; });
    return e;
  }
  var NS = 'http://www.w3.org/2000/svg';
  function folder(shade, opts) {
    opts = opts || {};
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 120');
    svg.setAttribute('class', 'folder-svg');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', opts.dashed ? 'M1 1H62L80 15H159V119H1Z' : 'M0 0H62L80 14H160V120H0Z');
    if (opts.dashed) {
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#555'); p.setAttribute('stroke-width', '1'); p.setAttribute('stroke-dasharray', '3 2');
    } else p.setAttribute('fill', shade);
    svg.appendChild(p);
    if (opts.strip) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', '86'); r.setAttribute('y', '21'); r.setAttribute('width', '68'); r.setAttribute('height', '7'); r.setAttribute('fill', '#fff');
      svg.appendChild(r);
    }
    if (opts.plus) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', '80'); t.setAttribute('y', '80'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '34'); t.setAttribute('fill', '#bbb');
      t.textContent = '+';
      svg.appendChild(t);
    }
    return svg;
  }
  window.UI = { h: h, img: img, folder: folder };
})();
