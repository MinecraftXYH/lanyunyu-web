const { ok, fail, isAdmin, readJSON } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');
  if (!isAdmin(req)) return fail(res, 401, '未登录');
  const list = await readJSON('contacts.json', []);
  return ok(res, list);
};