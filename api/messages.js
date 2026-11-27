// POST   /api/messages          { name, email, message }  from the contact form (public)
// GET    /api/messages          -> all messages, newest first                   admin only
// DELETE /api/messages?url=...  -> removes one                                  admin only
const s = require('../lib/server');

module.exports = s.handler(async function (req, res) {
  if (!s.configured()) return s.send(res, 503, { error: 'Not set up' });

  if (req.method === 'POST') {
    const b = await s.readJson(req, 20000);
    const name = String(b.name || '').trim().slice(0, 100);
    const email = String(b.email || '').trim().slice(0, 200);
    const message = String(b.message || '').trim().slice(0, 5000);
    if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) return s.send(res, 400, { error: 'Fill in every field' });
    await s.put('messages/' + String(Date.now()).padStart(15, '0') + '.json',
      JSON.stringify({ name: name, email: email, message: message, date: new Date().toISOString() }),
      { access: 'public', addRandomSuffix: true, contentType: 'application/json' });
    return s.send(res, 200, { ok: true });
  }

  if (!s.authed(req)) return s.send(res, 401, { error: 'Sign in again' });

  if (req.method === 'GET') {
    const blobs = (await s.listAll('messages/')).sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; }).slice(0, 200);
    const out = await Promise.all(blobs.map(async function (blob) {
      try {
        const m = await (await fetch(blob.url)).json();
        m.id = blob.url;
        return m;
      } catch (e) {
        return null;
      }
    }));
    return s.send(res, 200, { messages: out.filter(Boolean) });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    if (!s.ownBlob(url, 'messages')) return s.send(res, 400, { error: 'Not a message' });
    await s.del(url);
    return s.send(res, 200, { ok: true });
  }

  s.send(res, 405, { error: 'Method not allowed' });
});
