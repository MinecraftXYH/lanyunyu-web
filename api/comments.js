const { ok, fail, readBody, verifyUserToken, readData, writeData } = require('./_lib');

const CONTENT_MAX = 1000;

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
  const postId = (body.postId || '').trim();
  const content = (body.content || '').trim();

  if (!postId) return fail(res, 400, '缺少帖子 ID');
  if (!content) return fail(res, 400, '请输入评论内容');
  if (content.length > CONTENT_MAX) return fail(res, 400, '评论最多 1000 字');

  const pdata = await readData('posts');
  const post = pdata.posts.find(p => p.id === postId);
  if (!post) return fail(res, 404, '帖子不存在');

  const cdata = await readData('comments');
  const comment = {
    id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    postId,
    content,
    author: user.username,
    createdAt: Date.now(),
    likes: 0
  };
  cdata.comments.push(comment);
  await writeData('comments', cdata, 'comment on ' + postId);

  post.comments = (post.comments || 0) + 1;
  await writeData('posts', pdata, 'incr comments ' + postId);

  return ok(res, { ok: true, comment });
};
