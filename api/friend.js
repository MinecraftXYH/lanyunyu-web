const { ok, fail, readBody, verifyUserToken, readUsers, writeUsers, ensureArray } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return fail(res, 401, '请先登录');
  const user = await verifyUserToken(auth.slice(7));
  if (!user) return fail(res, 401, '登录已过期');

  if (req.method === 'GET') {
    const data = await readUsers();
    const me = data.users.find(u => u.username === user.username);
    const friends = ensureArray(me, 'friends');
    const list = friends.map(name => {
      const u = data.users.find(x => x.username === name);
      return u ? { username: u.username, avatar: u.avatar || 'assets/images/default-avatar.jpeg', bio: u.bio || '' } : { username: name };
    });
    return ok(res, { ok: true, friends: list });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const target = (body.username || '').trim();
    const action = body.action === 'remove' ? 'remove' : 'add';
    if (!target) return fail(res, 400, '缺少目标用户');
    if (target === user.username) return fail(res, 400, '不能加自己为好友');

    const data = await readUsers();
    const meIdx = data.users.findIndex(u => u.username === user.username);
    const targetIdx = data.users.findIndex(u => u.username === target);
    if (meIdx < 0 || targetIdx < 0) return fail(res, 404, '用户不存在');

    const myFriends = ensureArray(data.users[meIdx], 'friends');
    const theirFriends = ensureArray(data.users[targetIdx], 'friends');

    if (action === 'add') {
      if (!myFriends.includes(target)) myFriends.push(target);
      if (!theirFriends.includes(user.username)) theirFriends.push(user.username);
    } else {
      const i1 = myFriends.indexOf(target); if (i1 >= 0) myFriends.splice(i1, 1);
      const i2 = theirFriends.indexOf(user.username); if (i2 >= 0) theirFriends.splice(i2, 1);
    }

    data.users[meIdx].updatedAt = Date.now();
    data.users[targetIdx].updatedAt = Date.now();
    await writeUsers(data, action + ' friend ' + target + ' by ' + user.username);

    return ok(res, { ok: true, isFriend: action === 'add' });
  }

  return fail(res, 405, '不支持的方法');
};
