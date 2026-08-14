const { ok, fail, readBody, verifyUserToken, readData, writeData, readUsers } = require('./_lib');

const TITLE_MAX = 80;
const CONTENT_MAX = 5000;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === 'GET') {
    const { posts } = await readData('posts');
    const { users } = await readUsers();
    const avatarMap = {};
    users.forEach(u => avatarMap[u.username] = u.avatar || 'assets/images/default-avatar.jpeg');
    const list = posts.slice().reverse().map(p => ({
      id: p.id,
      title: p.title,
      summary: p.content.slice(0, 120).replace(/\n/g, ' '),
      author: p.author,
      avatar: avatarMap[p.author] || 'assets/images/default-avatar.jpeg',
      category: p.category || '闲聊',
      createdAt: p.createdAt,
      likes: p.likes || 0,
      comments: p.comments || 0,
      views: p.views || 0
    }));
    return ok(res, { ok: true, posts: list });
  }

  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return fail(res, 401, '请先登录');
    const user = await verifyUserToken(auth.slice(7));
    if (!user) return fail(res, 401, '登录已过期');

    const body = await readBody(req);
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();
    const category = (body.category || '闲聊').trim();

    if (!title) return fail(res, 400, '请输入标题');
    if (title.length > TITLE_MAX) return fail(res, 400, '标题最多 80 字');
    if (!content) return fail(res, 400, '请输入内容');
    if (content.length > CONTENT_MAX) return fail(res, 400, '内容最多 5000 字');

    const data = await readData('posts');
    const post = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      content,
      category,
      author: user.username,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      likes: 0,
      comments: 0
    };
    data.posts.push(post);
    await writeData('posts', data, 'post by ' + user.username);
    return ok(res, { ok: true, post });
  }

  return fail(res, 405, '不支持的方法');
};
