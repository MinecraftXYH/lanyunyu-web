/**
 * 聚合社区接口：帖子 / 帖子详情 / 评论 / 点赞 / 公告 / 用户评论列表
 * 减少 Vercel Serverless Functions 数量
 */
const { ok, fail, isAdmin, readBody, verifyUserToken, readData, writeData, readUsers } = require('./_lib');

const TITLE_MAX = 80;
const CONTENT_MAX = 5000;
const COMMENT_MAX = 1000;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const action = (url.searchParams.get('action') || '').trim();

  try {
    switch (action) {
      case 'posts': return handlePosts(req, res, url);
      case 'comments': return handleComments(req, res, url);
      case 'likes': return handleLikes(req, res);
      case 'announcements': return handleAnnouncements(req, res);
      default: return fail(res, 400, '缺少 action 参数');
    }
  } catch (e) {
    console.error('[community]', e);
    return fail(res, 500, e.message || '服务器错误');
  }
};

async function avatarMap() {
  const { users } = await readUsers();
  const map = {};
  users.forEach(u => map[u.username] = u.avatar || 'assets/images/default-avatar.jpeg');
  return map;
}

async function handlePosts(req, res, url) {
  const id = url.searchParams.get('id') || '';

  if (req.method === 'GET') {
    // 列表
    if (!id) {
      const { posts } = await readData('posts');
      const avatars = await avatarMap();
      const list = posts.slice().reverse().map(p => ({
        id: p.id,
        title: p.title,
        summary: p.content.slice(0, 120).replace(/\n/g, ' '),
        author: p.author,
        avatar: avatars[p.author] || 'assets/images/default-avatar.jpeg',
        category: p.category || '闲聊',
        cover: (Array.isArray(p.images) && p.images[0]) || '',
        imageCount: Array.isArray(p.images) ? p.images.length : 0,
        createdAt: p.createdAt,
        likes: p.likes || 0,
        comments: p.comments || 0,
        views: p.views || 0
      }));
      return ok(res, { ok: true, posts: list });
    }

    // 详情
    const data = await readData('posts');
    const post = data.posts.find(p => p.id === id);
    if (!post) return fail(res, 404, '帖子不存在');

    post.views = (post.views || 0) + 1;
    await writeData('posts', data, 'view post ' + id);

    const auth = req.headers.authorization || '';
    const me = auth.startsWith('Bearer ') ? await verifyUserToken(auth.slice(7)) : null;
    const ldata = await readData('likes');

    const avatars = await avatarMap();
    const commentsData = await readData('comments');
    const comments = commentsData.comments
      .filter(c => c.postId === id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(c => ({
        id: c.id,
        content: c.content,
        author: c.author,
        avatar: avatars[c.author] || 'assets/images/default-avatar.jpeg',
        createdAt: c.createdAt,
        likes: c.likes || 0,
        liked: !!(me && ldata.likes.find(l => l.type === 'comment' && l.targetId === c.id && l.username === me.username))
      }));

    return ok(res, {
      ok: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        avatar: avatars[post.author] || 'assets/images/default-avatar.jpeg',
        category: post.category || '闲聊',
        images: Array.isArray(post.images) ? post.images : [],
        liked: !!(me && ldata.likes.find(l => l.type === 'post' && l.targetId === post.id && l.username === me.username)),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        views: post.views,
        likes: post.likes || 0,
        comments: post.comments || 0
      },
      comments
    });
  }

  if (req.method === 'POST' && !id) {
    const user = await requireAuth(req, res);
    if (!user) return;
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
      images: Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string' && /^assets\/images\//.test(x)).slice(0, 9) : [],
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

  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res);
    if (!user) return;
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
}

async function handleComments(req, res, url) {
  if (req.method === 'GET') {
    const username = (url.searchParams.get('u') || '').trim();
    if (!username) return fail(res, 400, '缺少用户名参数 u');

    const { comments } = await readData('comments');
    const { posts } = await readData('posts');
    const avatars = await avatarMap();

    const userComments = comments
      .filter(c => c.author === username)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(c => {
        const post = posts.find(p => p.id === c.postId);
        return {
          id: c.id,
          postId: c.postId,
          postTitle: post ? post.title : '未知帖子',
          content: c.content,
          author: c.author,
          avatar: avatars[c.author] || 'assets/images/default-avatar.jpeg',
          createdAt: c.createdAt,
          likes: c.likes || 0
        };
      });

    return ok(res, { ok: true, comments: userComments });
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const postId = (body.postId || '').trim();
    const content = (body.content || '').trim();

    if (!postId) return fail(res, 400, '缺少帖子 ID');
    if (!content) return fail(res, 400, '请输入评论内容');
    if (content.length > COMMENT_MAX) return fail(res, 400, '评论最多 1000 字');

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
  }

  return fail(res, 405, '不支持的方法');
}

async function handleLikes(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const targetId = (url.searchParams.get('targetId') || '').trim();
    const type = url.searchParams.get('type') === 'comment' ? 'comment' : 'post';
    if (!targetId) return fail(res, 400, '缺少目标 ID');

    const ldata = await readData('likes');
    const count = ldata.likes.filter(l => l.type === type && l.targetId === targetId).length;

    let liked = false;
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const me = await verifyUserToken(auth.slice(7));
      if (me) liked = !!ldata.likes.find(l => l.type === type && l.targetId === targetId && l.username === me.username);
    }
    return ok(res, { ok: true, liked, count });
  }

  if (req.method !== 'POST') return fail(res, 405, '不支持的方法');
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readBody(req);
  const type = body.type === 'comment' ? 'comment' : 'post';
  const targetId = (body.targetId || '').trim();
  if (!targetId) return fail(res, 400, '缺少目标 ID');

  const ldata = await readData('likes');
  const existing = ldata.likes.find(l => l.type === type && l.targetId === targetId && l.username === user.username);

  if (existing) {
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
}

async function handleAnnouncements(req, res) {
  if (req.method === 'GET') {
    const { announcements } = await readData('announcements');
    const avatars = await avatarMap();
    const list = announcements.slice().reverse().map(a => ({
      id: a.id,
      title: a.title,
      summary: a.content.slice(0, 120).replace(/\n/g, ' '),
      author: a.author,
      avatar: avatars[a.author] || 'assets/images/default-avatar.jpeg',
      pinned: !!a.pinned,
      createdAt: a.createdAt
    }));
    return ok(res, { ok: true, announcements: list });
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return fail(res, 403, '仅管理员可发布公告');
    const body = await readBody(req);
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();

    if (!title) return fail(res, 400, '请输入标题');
    if (title.length > TITLE_MAX) return fail(res, 400, '标题最多 80 字');
    if (!content) return fail(res, 400, '请输入内容');
    if (content.length > CONTENT_MAX) return fail(res, 400, '内容最多 5000 字');

    const data = await readData('announcements');
    const ann = {
      id: 'a' + Date.now().toString(36),
      title,
      content,
      author: 'admin',
      pinned: !!body.pinned,
      createdAt: Date.now()
    };
    data.announcements.push(ann);
    await writeData('announcements', data, 'announcement: ' + title);
    return ok(res, { ok: true, announcement: ann });
  }

  return fail(res, 405, '不支持的方法');
}

async function requireAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { fail(res, 401, '请先登录'); return null; }
  const user = await verifyUserToken(auth.slice(7));
  if (!user) { fail(res, 401, '登录已过期'); return null; }
  return user;
}
