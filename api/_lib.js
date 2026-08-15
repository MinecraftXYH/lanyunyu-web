/**
 * Vercel serverless shared utilities
 * 用 GitHub Contents API 读写 data.json / contacts.json
 * 这样部署后数据持久化、还能在 GitHub 历史里查看所有变更
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


const GITHUB_REPO = process.env.GITHUB_REPO || 'MinecraftXYH/lanyunyu-web';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'master';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const ADMIN_USER = process.env.LYY_ADMIN_USER || 'admin';
const ADMIN_PWD = process.env.LYY_ADMIN_PWD || 'lyy20260701';

const TOKEN = crypto.createHash('sha256').update(ADMIN_USER + ADMIN_PWD + ':lanyunyu').digest('hex');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function ok(res, data, cacheControl) {
  cors(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl || 'no-store, no-cache, must-revalidate, max-age=0');
  res.end(JSON.stringify(data));
}

function fail(res, code, msg) {
  cors(res);
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, msg }));
}

function isAdmin(req) {
  const auth = req.headers.authorization || '';
  return auth === 'Bearer ' + TOKEN;
}

async function readRepoFile(path) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN 未配置');
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURI(path).replace(/%2F/g, '/')}?ref=${GITHUB_BRANCH}`;
  const r = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'lanyunyu-web'
    }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub 读失败: ' + r.status);
  return await r.json();
}

async function writeRepoFile(path, contentObj, message, sha) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURI(path).replace(/%2F/g, '/')}`;
  const body = {
    message,
    branch: GITHUB_BRANCH,
    content: Buffer.from(JSON.stringify(contentObj, null, 2), 'utf8').toString('base64'),
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'lanyunyu-web'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const text = await r.text();
    let hint = '';
    if (r.status === 404) hint = '（请检查 Vercel 环境变量 GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH 是否正确，并重新 Deploy）';
    if (r.status === 401 || r.status === 403) hint = '（GITHUB_TOKEN 无效或权限不足，请确认 token 勾选了 repo 权限）';
    throw new Error('GitHub 写失败: ' + r.status + ' ' + text.slice(0, 200) + ' ' + hint);
  }
  return await r.json();
}

async function readJSON(file, fallback) {
  try {
    if (GITHUB_TOKEN) {
      const f = await readRepoFile(file);
      if (f) {
        const raw = Buffer.from(f.content, 'base64').toString('utf8');
        return JSON.parse(raw);
      }
    }
  } catch (e) {
    console.error('GitHub read failed for', file, e.message);
  }
  // 本地兜底：Vercel 打包时通过 includeFiles 把数据文件带进运行目录
  try {
    const candidates = [
      path.join(process.cwd(), file),
      path.join(process.cwd(), 'api', file),
      path.join(__dirname, file)
    ];
    for (const local of candidates) {
      if (fs.existsSync(local)) {
        return JSON.parse(fs.readFileSync(local, 'utf8'));
      }
    }
  } catch (e) {
    console.error('Local read failed for', file, e.message);
  }
  return fallback;
}

async function writeJSON(path, obj, message) {
  const existing = await readRepoFile(path);
  const sha = existing ? existing.sha : undefined;
  return writeRepoFile(path, obj, message, sha);
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
  });
}

// ---------- 用户（前台玩家账号）密码哈希 ----------
function hashPassword(pwd, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + ':' + pwd).digest('hex');
  return salt + '$' + hash;
}
function verifyPassword(pwd, stored) {
  if (!stored || stored.indexOf('$') < 0) return false;
  const [salt, hash] = stored.split('$');
  const calc = crypto.createHash('sha256').update(salt + ':' + pwd).digest('hex');
  // 常量时间比较，避免计时攻击
  const a = Buffer.from(calc);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------- 用户存储 ----------
const USERS_FILE = 'data/users.json';
async function readUsers() {
  const fallback = { users: [] };
  const data = await readJSON(USERS_FILE, fallback);
  if (!data || !Array.isArray(data.users)) data.users = [];
  return data;
}
async function writeUsers(obj, message) {
  return writeJSON(USERS_FILE, obj, message || 'update users');
}

const DATA_FILES = {
  posts: 'data/posts.json',
  comments: 'data/comments.json',
  likes: 'data/likes.json',
  announcements: 'data/announcements.json'
};

async function readData(name) {
  const fallback = { [name]: [] };
  const data = await readJSON(DATA_FILES[name], fallback);
  if (!data || !Array.isArray(data[name])) data[name] = [];
  return data;
}
async function writeData(name, obj, message) {
  return writeJSON(DATA_FILES[name], obj, message || 'update ' + name);
}

async function verifyUserToken(token) {
  if (!token) return null;
  const data = await readUsers();
  const u = data.users.find(u => u.token === token && u.tokenExp > Date.now());
  return u || null;
}

function ensureArray(user, key) {
  if (!Array.isArray(user[key])) user[key] = [];
  return user[key];
}

// ---------- 安全：登录失败限流 + IP 拉黑（防暴力破解 / 扫描） ----------
// Vercel 函数无状态、多实例，真·按 IP 持久拉黑需要集中存储。
// 优先用 Vercel KV / Upstash Redis（REST API，零额外依赖）；未配置则降级为单实例内存（不持久）。
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN || '';
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

// 限流参数
const FAIL_THRESHOLD = 5;   // 失败次数阈值
const FAIL_WINDOW = 900;    // 失败计数窗口（秒）：15 分钟
const BAN_TTL = 86400;      // 拉黑时长（秒）：24 小时

// 内存降级（仅在未配置 KV 时使用，函数实例内有效，重启/扩容后失效）
const _memFail = new Map(); // ip -> { count, ts }
const _memBan = new Map();  // ip -> expireTs

async function kvExec(commands) {
  try {
    const r = await fetch(KV_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands),
      cache: 'no-store'
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.result; // Upstash/Vercel KV 批处理返回 { result: [...] }
  } catch (e) {
    console.error('[kv] exec failed', e.message);
    return null;
  }
}

async function kvGet(key) {
  if (!kvEnabled) return undefined;
  const j = await kvExec([['GET', key]]);
  return j && j[0] && j[0].result !== null ? j[0].result : undefined;
}

async function kvSet(key, value, ttl) {
  if (!kvEnabled) return;
  await kvExec([['SETEX', key, String(ttl), String(value)]]);
}

function getClientIp(req) {
  const xff = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-vercel-forwarded-for']);
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function isBanned(ip) {
  if (!ip || ip === 'unknown') return false;
  const exp = _memBan.get(ip);
  if (exp) {
    if (exp > Date.now()) return true;
    _memBan.delete(ip);
  }
  if (kvEnabled) {
    const v = await kvGet(`ban:${ip}`);
    if (v) return true;
  }
  return false;
}

async function banIp(ip, ttl = BAN_TTL) {
  if (!ip || ip === 'unknown') return;
  _memBan.set(ip, Date.now() + ttl * 1000);
  if (kvEnabled) await kvSet(`ban:${ip}`, '1', ttl);
}

async function recordFail(ip) {
  if (!ip || ip === 'unknown') return false;
  let count = 1;
  if (kvEnabled) {
    const v = await kvGet(`fail:${ip}`);
    count = (parseInt(v, 10) || 0) + 1;
    await kvSet(`fail:${ip}`, String(count), FAIL_WINDOW);
  } else {
    const now = Date.now();
    const rec = _memFail.get(ip);
    if (rec && rec.ts > now - FAIL_WINDOW * 1000) count = rec.count + 1;
    _memFail.set(ip, { count, ts: now });
    count = _memFail.get(ip).count;
  }
  if (count >= FAIL_THRESHOLD) {
    await banIp(ip);
    return true;
  }
  return false;
}

// 诱饵陷阱：访问者触碰假后台即视为恶意扫描，直接拉黑 + 人为延迟消耗其资源
async function handleTrap(req, res) {
  const ip = getClientIp(req);
  await banIp(ip);
  await new Promise(r => setTimeout(r, 1500));
  return fail(res, 404, 'Not Found');
}

module.exports = {
  TOKEN, ADMIN_USER, ADMIN_PWD,
  GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN,
  isAdmin, ok, fail, readJSON, writeJSON, readBody,
  cors, hashPassword, verifyPassword, readUsers, writeUsers, verifyUserToken,
  readData, writeData, ensureArray,
  kvEnabled, FAIL_THRESHOLD, FAIL_WINDOW, BAN_TTL,
  getClientIp, isBanned, recordFail, banIp, handleTrap
};