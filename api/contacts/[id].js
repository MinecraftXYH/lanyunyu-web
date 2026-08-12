const { ok, fail, isAdmin, readJSON, writeJSON } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'DELETE') return fail(res, 405, '仅支持 DELETE');
  if (!isAdmin(req)) return fail(res, 401, '未登录');
  const id = req.query.id;
  if (!id) return fail(res, 400, '缺少 id');
  try {
    const list = await readJSON('contacts.json', []);
    const next = list.filter(c => c.id !== id);
    await writeJSON('contacts.json', next, `delete contact ${id}`);
    return ok(res, { ok: true });
  } catch (e) {
    return fail(res, 500, e.message || '删除失败');
  }
};