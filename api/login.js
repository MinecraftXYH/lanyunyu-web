const { ok, fail, readBody, ADMIN_USER, ADMIN_PWD, TOKEN } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  if (body.user === ADMIN_USER && body.pwd === ADMIN_PWD) {
    return ok(res, { ok: true, token: TOKEN });
  }
  return fail(res, 401, '账号或密码错误');
};