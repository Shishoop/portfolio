// POST /api/login  { password }  -> { token } valid for 12 hours
const s = require('../lib/server');

module.exports = s.handler(async function (req, res) {
  if (req.method !== 'POST') return s.send(res, 405, { error: 'Method not allowed' });
  if (!s.configured()) return s.send(res, 503, { error: 'Not set up' });
  const body = await s.readJson(req, 2000);
  if (s.checkPassword(body.password)) return s.send(res, 200, { token: s.makeToken() });
  await new Promise(function (r) { setTimeout(r, 700); }); // slows down guessing
  s.send(res, 401, { error: 'Wrong password' });
});
