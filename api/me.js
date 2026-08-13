const { ok, fail } = require('./_lib');
const { readUsers, findUser, verifyToken, bearer } = require('./users');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); return res.statusCode = 204, res.end(); }
  const username = verifyToken(bearer(req));
  if (!username) return fail(res, 401, '未登录或登录已过期');

  if (req.method === 'GET') {
    const data = await readUsers();
    const user = findUser(data, username);
    if (!user) return fail(res, 404, '用户不存在');
    return ok(res, { ok: true, username: user.username, qq: user.qq || '', createdAt: user.createdAt });
  }

  if (req.method === 'PUT') {
    const { password, newPassword, qq } = await readBody(req);
    const data = await readUsers();
    const user = findUser(data, username);
    if (!user) return fail(res, 404, '用户不存在');
    // 改密码：需校验旧密码
    if (newPassword) {
      if (!verifyPassword(password || '', user.salt, user.hash)) return fail(res, 401, '原密码错误');
      if (String(newPassword).length < 6) return fail(res, 400, '新密码至少 6 位');
      const { salt, hash } = hashPassword(newPassword);
      user.salt = salt; user.hash = hash;
    }
    if (typeof qq === 'string') user.qq = qq.trim();
    await writeUsers(data, 'update profile ' + username);
    return ok(res, { ok: true, msg: '已保存' });
  }
  return fail(res, 405, '不支持的方法');
};
