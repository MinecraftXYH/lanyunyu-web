const { ok, fail, readBody, verifyPassword, hashPassword, readUsers, writeUsers } = require('./_lib');
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
  if (!user) return fail(res, 401, '未登录或登录已过期');

  const body = await readBody(req);
  const oldPwd = body.oldPwd || '';
  const newPwd = body.newPwd || '';

  if (!verifyPassword(oldPwd, user.pwdHash)) return fail(res, 400, '原密码错误');
  if (newPwd.length < 6) return fail(res, 400, '新密码至少 6 位');

  const data = await readUsers();
  const target = data.users.find(u => u.username === user.username);
  target.pwdHash = hashPassword(newPwd);
  target.updatedAt = Date.now();
  await writeUsers(data, 'change password ' + user.username);

  return ok(res, { ok: true });
};
