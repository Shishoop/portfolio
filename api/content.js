// GET  /api/content  -> the site's texts and projects (public)
// PUT  /api/content  -> save them (admin only)
const s = require('../lib/server');

const KEEP = 5; // older saves are kept as a short history, then removed

module.exports = s.handler(async function (req, res) {
  if (!s.configured()) return s.send(res, 200, { configured: false });

  if (req.method === 'GET') {
    const saves = (await s.listAll('data/content-')).sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; });
    let content = null;
    if (saves.length) {
      const r = await fetch(saves[0].url);
      if (!r.ok) throw new Error('read failed');
      content = await r.json();
    }
    const fresh = (req.url || '').indexOf('fresh=') >= 0;
    return s.send(res, 200, { configured: true, content: content }, fresh ? 'no-store' : 'public, s-maxage=20, stale-while-revalidate=120');
  }

  if (req.method === 'PUT') {
    if (!s.authed(req)) return s.send(res, 401, { error: 'Sign in again' });
    const content = await s.readJson(req, 1000000);
    if (!content || typeof content.site !== 'object' || !Array.isArray(content.projects)) return s.send(res, 400, { error: 'Invalid content' });
    await s.put('data/content-' + String(Date.now()).padStart(15, '0') + '.json', JSON.stringify(content), {
      access: 'public', addRandomSuffix: true, contentType: 'application/json'
    });
    const saves = (await s.listAll('data/content-')).sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; });
    const old = saves.slice(KEEP).map(function (b) { return b.url; });
    if (old.length) await s.del(old);
    return s.send(res, 200, { ok: true });
  }

  s.send(res, 405, { error: 'Method not allowed' });
});
