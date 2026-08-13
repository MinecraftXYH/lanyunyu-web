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
  // 本地兜底：Vercel 打包时通过 includeFiles 把 api/*.json 带进运行目录
  try {
    const candidates = [
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
async function readUsers() {
  const fallback = { users: [] };
  const data = await readJSON('users.json', fallback);
  if (!data || !Array.isArray(data.users)) data.users = [];
  return data;
}
async function writeUsers(obj, message) {
  return writeJSON('users.json', obj, message || 'update users');
}

module.exports = {
  TOKEN, ADMIN_USER, ADMIN_PWD,
  GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN,
  isAdmin, ok, fail, readJSON, writeJSON, readBody,
  cors, hashPassword, verifyPassword, readUsers, writeUsers
};