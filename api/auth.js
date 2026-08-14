const { ok, fail, readBody, verifyPassword, readUsers, writeUsers } = require('./_lib');

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
  const username = (body.username || '').trim();
  const pwd = body.pwd || '';

  const data = await readUsers();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(pwd, user.pwdHash)) {
    return fail(res, 401, '用户名或密码错误');
  }

  // 生成会话 token（随机，存到用户记录，30 天有效）
  const crypto = require('crypto');
  const token = crypto.randomBytes(24).toString('hex');
  user.token = token;
  user.tokenExp = Date.now() + 30 * 24 * 3600 * 1000;
  user.updatedAt = Date.now();
  await writeUsers(data, 'login user ' + username);

  return ok(res, {
    ok: true, token,
    username: user.username,
    qq: user.qq || '',
    avatar: user.avatar || 'assets/images/default-avatar.jpeg',
    bio: user.bio || '',
    following: Array.isArray(user.following) ? user.following : []
  });
};
