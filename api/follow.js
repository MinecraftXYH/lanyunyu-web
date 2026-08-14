const { ok, fail, readBody, verifyUserToken, readUsers, writeUsers } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '不支持的方法');

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return fail(res, 401, '请先登录');
  const user = await verifyUserToken(auth.slice(7));
  if (!user) return fail(res, 401, '登录已过期');

  const body = await readBody(req);
  const target = (body.username || '').trim();
  const action = body.action === 'unfollow' ? 'unfollow' : 'follow';

  if (!target) return fail(res, 400, '缺少目标用户');
  if (target === user.username) return fail(res, 400, '不能关注自己');

  const data = await readUsers();
  const meIdx = data.users.findIndex(u => u.username === user.username);
  const targetIdx = data.users.findIndex(u => u.username === target);
  if (meIdx < 0) return fail(res, 404, '当前用户不存在');
  if (targetIdx < 0) return fail(res, 404, '目标用户不存在');

  const following = Array.isArray(data.users[meIdx].following) ? data.users[meIdx].following : [];
  const idx = following.indexOf(target);

  if (action === 'follow') {
    if (idx < 0) following.push(target);
  } else {
    if (idx >= 0) following.splice(idx, 1);
  }

  data.users[meIdx].following = following;
  data.users[meIdx].updatedAt = Date.now();
  await writeUsers(data, action + ' ' + target + ' by ' + user.username);

  return ok(res, { ok: true, following, isFollowing: action === 'follow' });
};
