/**
 * 聚合站点级接口：配置 / 留言 / 后台登录 / 健康检查 / 留言管理
 * 减少 Vercel Serverless Functions 数量
 */
const {
  ok, fail, isAdmin, readJSON, writeJSON, readBody,
  ADMIN_USER, ADMIN_PWD, TOKEN,
  GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN,
  getClientIp, isBanned, recordFail, handleTrap
} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  const ip = getClientIp(req);
  // 被拉黑的 IP：任何请求一律 404，不暴露后台 / 接口是否存在
  if (await isBanned(ip)) return fail(res, 404, 'Not Found');

  const url = new URL(req.url, 'http://localhost');
  const action = (url.searchParams.get('action') || '').trim();

  try {
    switch (action) {
      case 'config': return handleConfig(req, res);
      case 'contact': return handleContact(req, res);
      case 'login': return handleLogin(req, res);
      case 'health': return handleHealth(req, res);
      case 'contacts': return handleContacts(req, res, url);
      case 'trap': return handleTrap(req, res);
      default: return fail(res, 404, 'Not Found');
    }
  } catch (e) {
    console.error('[site]', e);
    return fail(res, 500, e.message || '服务器错误');
  }
};

async function handleConfig(req, res) {
  if (req.method === 'GET') {
    const data = await readJSON('data.json', {});
    return ok(res, data, 'public, max-age=5, s-maxage=30, stale-while-revalidate=300');
  }
  if (req.method === 'POST') {
    if (!isAdmin(req)) return fail(res, 401, '未登录或密码错误');
    const body = await readBody(req);
    if (!body || typeof body !== 'object') return fail(res, 400, '请求体格式错误');
    await writeJSON('data.json', body, 'update site config via admin');
    return ok(res, { ok: true });
  }
  return fail(res, 405, '不支持的方法');
}

async function handleContact(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  if (!body.name || !body.email || !body.content) {
    return fail(res, 400, '昵称、邮箱和内容不能为空');
  }
  const list = await readJSON('contacts.json', []);
  list.unshift({
    id: Date.now().toString(36),
    name: String(body.name).slice(0, 40),
    email: String(body.email).slice(0, 80),
    subject: String(body.subject || '一般咨询').slice(0, 60),
    content: String(body.content).slice(0, 2000),
    time: new Date().toLocaleString('zh-CN', { hour12: false })
  });
  await writeJSON('contacts.json', list, `contact from ${body.name}`);
  return ok(res, { ok: true });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  const ip = getClientIp(req);
  if (body.user === ADMIN_USER && body.pwd === ADMIN_PWD) {
    return ok(res, { ok: true, token: TOKEN });
  }
  // 登录失败：记录失败次数，超阈值直接拉黑该 IP（之后访问一律 404）
  const banned = await recordFail(ip);
  return fail(res, banned ? 404 : 401, banned ? 'Not Found' : '账号或密码错误');
}

async function handleHealth(req, res) {
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');
  const admin = isAdmin(req);
  const repo = GITHUB_REPO;
  const branch = GITHUB_BRANCH;
  const hasToken = Boolean(GITHUB_TOKEN);

  if (!admin) {
    return ok(res, { ok: true, githubConfigured: hasToken });
  }

  let githubOk = false;
  let githubMsg = '';
  if (hasToken) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'lanyunyu-web'
        }
      });
      githubOk = r.ok;
      if (!r.ok) {
        const txt = await r.text();
        githubMsg = r.status + ' ' + txt.slice(0, 120);
      }
    } catch (e) {
      githubMsg = e.message;
    }
  }

  return ok(res, {
    ok: true,
    githubConfigured: hasToken,
    githubReadable: githubOk,
    githubRepo: repo,
    githubBranch: branch,
    githubMsg: githubMsg || undefined
  });
}

async function handleContacts(req, res, url) {
  if (req.method === 'GET') {
    if (!isAdmin(req)) return fail(res, 401, '未登录');
    const list = await readJSON('contacts.json', []);
    return ok(res, list);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(req)) return fail(res, 401, '未登录');
    const id = url.searchParams.get('id');
    if (!id) return fail(res, 400, '缺少 id');
    const list = await readJSON('contacts.json', []);
    const next = list.filter(c => c.id !== id);
    await writeJSON('contacts.json', next, `delete contact ${id}`);
    return ok(res, { ok: true });
  }

  return fail(res, 405, '不支持的方法');
}
