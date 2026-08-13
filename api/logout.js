const { ok, fail, readUsers, writeUsers } = require('./_lib');
const { authUser } = require('./me');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');

  const user = await authUser(req);
  if (!user) return ok(res, { ok: true }); // 未登录直接视为成功

  const data = await readUsers();
  const target = data.users.find(u => u.username === user.username);
  if (target) { target.token = ''; target.tokenExp = 0; }
  await writeUsers(data, 'logout ' + user.username);
  return ok(res, { ok: true });
};
