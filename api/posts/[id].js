const { ok, fail, verifyUserToken, readData, writeData, readUsers } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  const id = (req.query && req.query.id) || req.url.split('/').pop();

  if (req.method === 'GET') {
    const data = await readData('posts');
    const post = data.posts.find(p => p.id === id);
    if (!post) return fail(res, 404, '帖子不存在');

    post.views = (post.views || 0) + 1;
    await writeData('posts', data, 'view post ' + id);

    const { users } = await readUsers();
    const avatarMap = {};
    users.forEach(u => avatarMap[u.username] = u.avatar || 'assets/images/default-avatar.jpeg');

    const commentsData = await readData('comments');
    const comments = commentsData.comments
      .filter(c => c.postId === id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(c => ({
        id: c.id,
        content: c.content,
        author: c.author,
        avatar: avatarMap[c.author] || 'assets/images/default-avatar.jpeg',
        createdAt: c.createdAt,
        likes: c.likes || 0
      }));

    return ok(res, {
      ok: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        avatar: avatarMap[post.author] || 'assets/images/default-avatar.jpeg',
        category: post.category || '闲聊',
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        views: post.views,
        likes: post.likes || 0,
        comments: post.comments || 0
      },
      comments
    });
  }

  if (req.method === 'DELETE') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return fail(res, 401, '请先登录');
    const user = await verifyUserToken(auth.slice(7));
    if (!user) return fail(res, 401, '登录已过期');

    const data = await readData('posts');
    const idx = data.posts.findIndex(p => p.id === id);
    if (idx < 0) return fail(res, 404, '帖子不存在');
    if (data.posts[idx].author !== user.username) return fail(res, 403, '只能删除自己的帖子');

    data.posts.splice(idx, 1);
    await writeData('posts', data, 'delete post ' + id);

    const cdata = await readData('comments');
    cdata.comments = cdata.comments.filter(c => c.postId !== id);
    await writeData('comments', cdata, 'clean comments for ' + id);

    return ok(res, { ok: true });
  }

  return fail(res, 405, '不支持的方法');
};
