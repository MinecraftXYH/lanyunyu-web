const { ok, fail, verifyUserToken, readUsers, readData } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return fail(res, 405, '不支持的方法');

  const url = new URL(req.url, 'http://localhost');
  const username = (url.searchParams.get('u') || '').trim();
  if (!username) return fail(res, 400, '缺少用户名');

  const { users } = await readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return fail(res, 404, '用户不存在');

  // 当前登录者是否已关注该用户
  let isFollowing = false;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const me = await verifyUserToken(auth.slice(7));
    if (me && Array.isArray(me.following)) isFollowing = me.following.includes(username);
  }

  const { posts } = await readData('posts');
  const userPosts = posts.filter(p => p.author === username).sort((a, b) => b.createdAt - a.createdAt);

  const { comments } = await readData('comments');
  const userComments = comments.filter(c => c.author === username).length;

  const { likes } = await readData('likes');
  const receivedLikes = likes.filter(l => {
    if (l.type === 'post') {
      const p = posts.find(x => x.id === l.targetId);
      return p && p.author === username;
    }
    return false;
  }).length;

  const isFriend = Array.isArray(user.friends) && currentUser && user.friends.includes(currentUser.username);

  return ok(res, {
    ok: true,
    user: {
      username: user.username,
      avatar: user.avatar || 'assets/images/default-avatar.jpeg',
      bio: user.bio || '',
      qq: user.qq || '',
      createdAt: user.createdAt,
      isFollowing,
      isFriend
    },
    stats: {
      posts: userPosts.length,
      comments: userComments,
      receivedLikes,
      friends: Array.isArray(user.friends) ? user.friends.length : 0
    },
    posts: userPosts.map(p => ({
      id: p.id,
      title: p.title,
      summary: p.content.slice(0, 120).replace(/\n/g, ' '),
      category: p.category || '闲聊',
      createdAt: p.createdAt,
      likes: p.likes || 0,
      comments: p.comments || 0,
      views: p.views || 0
    }))
  });
};
