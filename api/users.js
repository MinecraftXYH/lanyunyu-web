// 前台玩家用户存储与鉴权工具
const crypto = require('crypto');
const { readJSON, writeJSON } = require('./_lib');

const USER_FILE = 'users.json';
const USER_SECRET = process.env.USER_SECRET || 'lanyunyu-user-secret-change-me';

async function readUsers() {
  return readJSON(USER_FILE, { users: [] });
}
async function writeUsers(data, message) {
  return writeJSON(USER_FILE, data, message || 'update users via account');
}

function hashPassword(pwd, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + ':' + pwd).digest('hex');
  return { salt, hash };
}
function verifyPassword(pwd, salt, hash) {
  const h = crypto.createHash('sha256').update(salt + ':' + pwd).digest('hex');
  return h === hash;
}

function findUser(data, username) {
  const u = String(username || '').trim().toLowerCase();
  return (data.users || []).find(x => x.username.toLowerCase() === u) || null;
}

// 无状态签名 token：base64url(payload).hmac，30 天过期
function signToken(username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + 30 * 864e5 }))
    .toString('base64url');
  const sig = crypto.createHmac('sha256', USER_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', USER_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data.u;
  } catch { return null; }
}

function bearer(req) {
  const auth = req.headers.authorization || '';
  return auth.replace(/^Bearer\s+/i, '');
}

module.exports = {
  USER_FILE, readUsers, writeUsers,
  hashPassword, verifyPassword, findUser,
  signToken, verifyToken, bearer
};
