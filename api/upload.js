// POST   /api/upload         (image bytes as the body)  -> { url }   admin only
// DELETE /api/upload?url=... -> removes an uploaded image             admin only
const s = require('../lib/server');

const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

module.exports = s.handler(async function (req, res) {
  if (!s.configured()) return s.send(res, 503, { error: 'Not set up' });
  if (!s.authed(req)) return s.send(res, 401, { error: 'Sign in again' });

  if (req.method === 'POST') {
    const type = String(req.headers['content-type'] || '').split(';')[0].trim();
    if (!TYPES[type]) return s.send(res, 415, { error: 'Use a PNG, JPG, WebP or GIF image' });
    const bytes = await s.readBody(req, 4400000);
    if (!bytes.length) return s.send(res, 400, { error: 'Empty file' });
    const blob = await s.put('images/' + Date.now() + '.' + TYPES[type], bytes, {
      access: 'public', addRandomSuffix: true, contentType: type, cacheControlMaxAge: 31536000
    });
    return s.send(res, 200, { url: blob.url });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    if (!s.ownBlob(url, 'images')) return s.send(res, 400, { error: 'Not an uploaded image' });
    await s.del(url);
    return s.send(res, 200, { ok: true });
  }

  s.send(res, 405, { error: 'Method not allowed' });
});
