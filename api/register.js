const { ok, fail, readBody, hashPassword, readUsers, writeUsers } = require('./_lib');

// 用户名规则：3-20 位，字母/数字/中文/下划线
const USER_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;

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
  const qq = (body.qq || '').trim();

  if (!USER_RE.test(username)) return fail(res, 400, '用户名需 3-20 位（字母/数字/中文/下划线）');
  if (pwd.length < 6) return fail(res, 400, '密码至少 6 位');
  if (qq && !/^\d{5,15}$/.test(qq)) return fail(res, 400, 'QQ 号格式不正确（留空可不填）');

  const data = await readUsers();
  if (data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return fail(res, 409, '该用户名已被注册');
  }
  if (qq && data.users.some(u => u.qq && u.qq === qq)) {
    return fail(res, 409, '该 QQ 号已绑定其他账号');
  }

  const user = {
    username,
    pwdHash: hashPassword(pwd),
    qq: qq || '',
    avatar: 'assets/images/default-avatar.jpeg',
    bio: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  data.users.push(user);
  await writeUsers(data, 'register user ' + username);

  return ok(res, { ok: true, username });
};
