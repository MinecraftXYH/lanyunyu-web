const { ok, fail, readBody, verifyUserToken, readUsers, writeUsers } = require('./_lib');

const BIO_MAX = 200;
const AVATAR_RE = /^assets\/images\/[\w.-]+$/;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return fail(res, 401, '请先登录');
  const token = auth.slice(7);
  const user = await verifyUserToken(token);
  if (!user) return fail(res, 401, '登录已过期，请重新登录');

  const body = await readBody(req);
  const bio = (body.bio || '').trim();
  const avatar = (body.avatar || '').trim();

  if (bio.length > BIO_MAX) return fail(res, 400, '签名最多 200 字');
  if (avatar && !AVATAR_RE.test(avatar)) return fail(res, 400, '头像路径不合法');

  const data = await readUsers();
  const idx = data.users.findIndex(u => u.username === user.username);
  if (idx < 0) return fail(res, 404, '用户不存在');

  if (bio !== undefined) data.users[idx].bio = bio;
  if (avatar) data.users[idx].avatar = avatar;
  data.users[idx].updatedAt = Date.now();
  await writeUsers(data, 'update profile: ' + user.username);

  const safe = {
    username: data.users[idx].username,
    qq: data.users[idx].qq || '',
    avatar: data.users[idx].avatar || 'assets/images/default-avatar.jpeg',
    bio: data.users[idx].bio || '',
    createdAt: data.users[idx].createdAt
  };
  return ok(res, { ok: true, user: safe });
};
