const { ok, fail, readBody } = require('./_lib');
const { readUsers, findUser, verifyPassword, signToken } = require('./users');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.statusCode = 204, res.end(); }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const { username, password } = await readBody(req);
  const name = String(username || '').trim();
  const data = await readUsers();
  const user = findUser(data, name);
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return fail(res, 401, '用户名或密码错误');
  }
  return ok(res, { ok: true, token: signToken(user.username), username: user.username });
};
