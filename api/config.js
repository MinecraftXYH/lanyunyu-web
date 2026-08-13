const { ok, fail, isAdmin, readJSON, writeJSON, readBody } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method === 'GET') {
    const data = await readJSON('data.json', {});
    // GET 配置允许 Vercel Edge 缓存 30s，减少每次请求都打 GitHub API 的冷启动延迟
    return ok(res, data, 'public, max-age=5, s-maxage=30, stale-while-revalidate=300');
  }
  if (req.method === 'POST') {
    if (!isAdmin(req)) return fail(res, 401, '未登录或密码错误');
    const body = await readBody(req);
    if (!body || typeof body !== 'object') return fail(res, 400, '请求体格式错误');
    try {
      await writeJSON('data.json', body, 'update site config via admin');
      return ok(res, { ok: true });
    } catch (e) {
      return fail(res, 500, e.message || '保存失败');
    }
  }
  return fail(res, 405, '不支持的方法');
};