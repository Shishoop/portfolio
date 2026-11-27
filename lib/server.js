// Shared helpers for the /api functions. Storage is Vercel Blob; the admin password
// comes from the ADMIN_PASSWORD environment variable set in the Vercel dashboard.
const crypto = require('crypto');
const { put, list, del } = require('@vercel/blob');

const BLOB_HOST = '.public.blob.vercel-storage.com';
const SESSION_MS = 12 * 60 * 60 * 1000;

function configured() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN && process.env.ADMIN_PASSWORD);
}

function secret() {
  return crypto.createHash('sha256')
    .update('portfolio-admin:' + process.env.ADMIN_PASSWORD + ':' + process.env.BLOB_READ_WRITE_TOKEN)
    .digest();
}
function sign(exp) {
  return crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
}
function makeToken() {
  const exp = Date.now() + SESSION_MS;
  return exp + '.' + sign(exp);
}
function authed(req) {
  const header = req.headers.authorization || '';
  const token = header.indexOf('Bearer ') === 0 ? header.slice(7) : '';
  const parts = token.split('.');
  if (parts.length !== 2 || !(Number(parts[0]) > Date.now())) return false;
  const good = sign(parts[0]);
  return parts[1].length === good.length && crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(good));
}
function checkPassword(password) {
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('Too large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function readJson(req, limit) {
  const buf = await readBody(req, limit);
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    const err = new Error('Invalid JSON');
    err.status = 400;
    throw err;
  }
}

function send(res, status, data, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.end(JSON.stringify(data));
}

async function listAll(prefix) {
  let cursor;
  let out = [];
  do {
    const page = await list({ prefix: prefix, cursor: cursor, limit: 1000 });
    out = out.concat(page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

// Only blobs this site created, under the given folder, may be deleted.
function ownBlob(url, folder) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith(BLOB_HOST) && u.pathname.indexOf('/' + folder + '/') === 0;
  } catch (e) {
    return false;
  }
}

// Wraps a handler so every failure becomes a JSON error instead of a crash page.
function handler(fn) {
  return async function (req, res) {
    try {
      await fn(req, res);
    } catch (err) {
      send(res, err.status || 500, { error: err.status ? err.message : 'Server error' });
    }
  };
}

module.exports = { put, del, configured, makeToken, authed, checkPassword, readBody, readJson, send, listAll, ownBlob, handler };
