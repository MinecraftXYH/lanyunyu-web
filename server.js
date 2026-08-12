/**
 * 蓝云屿官网后端
 * 零第三方依赖，使用 Node.js 内置 http + fs
 * 提供：静态文件服务、配置读写、留言提交与查看、管理员登录校验
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.LYY_ADMIN_USER || 'admin';
const ADMIN_PWD = process.env.LYY_ADMIN_PWD || 'lyy20260701';
const DATA_FILE = path.join(__dirname, 'data.json');
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4'
};

function hash(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
const TOKEN = hash(ADMIN_USER + ADMIN_PWD + ':lanyunyu');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function send(res, status, data, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

function serveStatic(req, res) {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const filePath = path.join(__dirname, url);
  const ext = path.extname(filePath).toLowerCase();
  if (!filePath.startsWith(__dirname)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') return send(res, 404, 'Not Found', 'text/plain');
      return send(res, 500, 'Server Error', 'text/plain');
    }
    if (!stats.isFile()) return send(res, 404, 'Not Found', 'text/plain');
    const type = MIME[ext] || 'application/octet-stream';
    const total = stats.size;
    const range = req.headers.range;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      if (start >= total || end >= total || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}`, ...cors });
        return res.end();
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': type,
        ...cors
      });
      fs.createReadStream(filePath, { start, end }).pipe(res).on('error', () => res.destroy());
    } else {
      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        ...cors
      });
      fs.createReadStream(filePath).pipe(res).on('error', () => res.destroy());
    }
  });
}

function parseBody(req, cb) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try { cb(JSON.parse(body || '{}')); } catch { cb({}); }
  });
}

function isAdmin(req) {
  const auth = req.headers.authorization || '';
  return auth === 'Bearer ' + TOKEN;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (req.url.startsWith('/api/')) {
    // 获取配置（公开）
    if (req.url === '/api/config' && req.method === 'GET') {
      const data = readJSON(DATA_FILE, {});
      return send(res, 200, data);
    }
    // 保存配置（需管理员 token）
    if (req.url === '/api/config' && req.method === 'POST') {
      if (!isAdmin(req)) return send(res, 401, { ok: false, msg: '未登录或密码错误' });
      parseBody(req, body => {
        writeJSON(DATA_FILE, body);
        return send(res, 200, { ok: true });
      });
      return;
    }
    // 提交留言（公开）
    if (req.url === '/api/contact' && req.method === 'POST') {
      parseBody(req, body => {
        if (!body.name || !body.email || !body.content) {
          return send(res, 400, { ok: false, msg: '昵称、邮箱和内容不能为空' });
        }
        const list = readJSON(CONTACTS_FILE, []);
        list.unshift({
          id: Date.now().toString(36),
          name: String(body.name).slice(0, 40),
          email: String(body.email).slice(0, 80),
          subject: String(body.subject || '一般咨询').slice(0, 60),
          content: String(body.content).slice(0, 2000),
          time: new Date().toLocaleString('zh-CN')
        });
        writeJSON(CONTACTS_FILE, list);
        return send(res, 200, { ok: true });
      });
      return;
    }
    // 查看留言（需管理员）
    if (req.url === '/api/contacts' && req.method === 'GET') {
      if (!isAdmin(req)) return send(res, 401, { ok: false, msg: '未登录' });
      const list = readJSON(CONTACTS_FILE, []);
      return send(res, 200, list);
    }
    // 删除单条留言（需管理员）
    if (req.url.startsWith('/api/contacts/') && req.method === 'DELETE') {
      if (!isAdmin(req)) return send(res, 401, { ok: false, msg: '未登录' });
      const id = req.url.split('/').pop();
      let list = readJSON(CONTACTS_FILE, []);
      list = list.filter(c => c.id !== id);
      writeJSON(CONTACTS_FILE, list);
      return send(res, 200, { ok: true });
    }
    // 登录校验
    if (req.url === '/api/login' && req.method === 'POST') {
      parseBody(req, body => {
        if (body.user === ADMIN_USER && body.pwd === ADMIN_PWD) return send(res, 200, { ok: true, token: TOKEN });
        return send(res, 401, { ok: false, msg: '账号或密码错误' });
      });
      return;
    }
    return send(res, 404, { ok: false, msg: 'API 不存在' });
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`蓝云屿官网已启动：http://localhost:${PORT}`);
  console.log(`后台地址：http://localhost:${PORT}/admin.html`);
});
