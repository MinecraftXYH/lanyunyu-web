const { ok, fail, readBody, verifyUserToken, readData, writeData } = require('./_lib');

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
  const type = body.type === 'comment' ? 'comment' : 'post';
  const targetId = (body.targetId || '').trim();
  if (!targetId) return fail(res, 400, '缺少目标 ID');

  const ldata = await readData('likes');
  const existing = ldata.likes.find(l => l.type === type && l.targetId === targetId && l.username === user.username);

  if (existing) {
    // 取消赞
    ldata.likes = ldata.likes.filter(l => l !== existing);
    await writeData('likes', ldata, 'unlike ' + type + ' ' + targetId);
  } else {
    ldata.likes.push({
      id: 'l' + Date.now().toString(36),
      type,
      targetId,
      username: user.username,
      createdAt: Date.now()
    });
    await writeData('likes', ldata, 'like ' + type + ' ' + targetId);
  }

  // 重新统计点赞数
  const count = ldata.likes.filter(l => l.type === type && l.targetId === targetId).length;
  const liked = !existing;

  if (type === 'post') {
    const pdata = await readData('posts');
    const p = pdata.posts.find(p => p.id === targetId);
    if (p) { p.likes = count; await writeData('posts', pdata, 'update like count ' + targetId); }
  } else {
    const cdata = await readData('comments');
    const c = cdata.comments.find(c => c.id === targetId);
    if (c) { c.likes = count; await writeData('comments', cdata, 'update comment like ' + targetId); }
  }

  return ok(res, { ok: true, liked, count });
};
