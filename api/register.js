const { ok, fail, readBody } = require('./_lib');
const { readUsers, writeUsers, hashPassword, findUser } = require('./users');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.statusCode = 204, res.end(); }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const { username, password, qq } = await readBody(req);

  const name = String(username || '').trim();
  if (name.length < 3 || name.length > 20) return fail(res, 400, '用户名需 3-20 个字符');
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(name)) return fail(res, 400, '用户名只能含中英文、数字和下划线');
  if (String(password || '').length < 6) return fail(res, 400, '密码至少 6 位');

  const data = await readUsers();
  if (findUser(data, name)) return fail(res, 409, '该用户名已被注册');

  const { salt, hash } = hashPassword(password);
  data.users = data.users || [];
  data.users.push({
    username: name,
    salt, hash,
    qq: String(qq || '').trim() || '',
    createdAt: new Date().toISOString()
  });
  await writeUsers(data, 'register user ' + name);
  return ok(res, { ok: true, msg: '注册成功' });
};
