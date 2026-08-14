/**
 * 聚合用户接口：注册 / 登录 / 当前用户 / 改密 / 登出 / 更新资料 / 个人主页 / 关注 / 好友
 * 减少 Vercel Serverless Functions 数量
 */
const {
  ok, fail, readBody, hashPassword, verifyPassword, verifyUserToken,
  readUsers, writeUsers, readData, ensureArray
} = require('./_lib');
const crypto = require('crypto');

const USER_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
const BIO_MAX = 200;
const AVATAR_RE = /^assets\/images\/[\w.-]+$/;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const action = (url.searchParams.get('action') || '').trim();

  try {
    switch (action) {
      case 'register': return handleRegister(req, res);
      case 'auth': return handleAuth(req, res);
      case 'me': return handleMe(req, res);
      case 'change-pwd': return handleChangePwd(req, res);
      case 'logout': return handleLogout(req, res);
      case 'update-profile': return handleUpdateProfile(req, res);
      case 'profile': return handleProfile(req, res, url);
      case 'follow': return handleFollow(req, res);
      case 'friend': return handleFriend(req, res);
      case 'friend-requests': return handleFriendRequests(req, res);
      default: return fail(res, 400, '缺少 action 参数');
    }
  } catch (e) {
    console.error('[users]', e);
    return fail(res, 500, e.message || '服务器错误');
  }
};

async function currentUser(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { fail(res, 401, '请先登录'); return null; }
  const user = await verifyUserToken(auth.slice(7));
  if (!user) { fail(res, 401, '登录已过期'); return null; }
  return user;
}

function safeUser(u) {
  return {
    username: u.username,
    qq: u.qq || '',
    avatar: u.avatar || 'assets/images/default-avatar.jpeg',
    bio: u.bio || '',
    createdAt: u.createdAt,
    following: Array.isArray(u.following) ? u.following : [],
    friends: Array.isArray(u.friends) ? u.friends : []
  };
}

async function handleRegister(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  const username = (body.username || '').trim();
  const pwd = body.pwd || '';
  const qq = (body.qq || '').trim();

  if (!USER_RE.test(username)) return fail(res, 400, '用户名需 3-20 位（字母/数字/中文/下划线）');
  if (pwd.length < 6) return fail(res, 400, '密码至少 6 位');
  if (qq && !/^\d{5,15}$/.test(qq)) return fail(res, 400, 'QQ 号格式不正确（留空可不填）');

  const data = await readUsers();
  if (data.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return fail(res, 409, '该用户名已被注册');
  }
  if (qq && data.users.some(u => u.qq && u.qq === qq)) {
    return fail(res, 409, '该 QQ 号已绑定其他账号');
  }

  const user = {
    username,
    pwdHash: hashPassword(pwd),
    qq: qq || '',
    avatar: 'assets/images/default-avatar.jpeg',
    bio: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  data.users.push(user);
  await writeUsers(data, 'register user ' + username);
  return ok(res, { ok: true, username });
}

async function handleAuth(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  const username = (body.username || '').trim();
  const pwd = body.pwd || '';

  const data = await readUsers();
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(pwd, user.pwdHash)) {
    return fail(res, 401, '用户名或密码错误');
  }

  const token = crypto.randomBytes(24).toString('hex');
  user.token = token;
  user.tokenExp = Date.now() + 30 * 24 * 3600 * 1000;
  user.updatedAt = Date.now();
  await writeUsers(data, 'login user ' + username);

  return ok(res, Object.assign({ ok: true, token }, safeUser(user)));
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');
  const user = await currentUser(req, res);
  if (!user) return;
  return ok(res, Object.assign({ ok: true }, safeUser(user)));
}

async function handleChangePwd(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const user = await currentUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const oldPwd = body.oldPwd || '';
  const newPwd = body.newPwd || '';

  if (!verifyPassword(oldPwd, user.pwdHash)) return fail(res, 400, '原密码错误');
  if (newPwd.length < 6) return fail(res, 400, '新密码至少 6 位');

  const data = await readUsers();
  const target = data.users.find(u => u.username === user.username);
  target.pwdHash = hashPassword(newPwd);
  target.updatedAt = Date.now();
  await writeUsers(data, 'change password ' + user.username);
  return ok(res, { ok: true });
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const user = await currentUser(req, res);
  if (!user) return ok(res, { ok: true });

  const data = await readUsers();
  const target = data.users.find(u => u.username === user.username);
  if (target) { target.token = ''; target.tokenExp = 0; }
  await writeUsers(data, 'logout ' + user.username);
  return ok(res, { ok: true });
}

async function handleUpdateProfile(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const user = await currentUser(req, res);
  if (!user) return;

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

  return ok(res, { ok: true, user: safeUser(data.users[idx]) });
}

async function handleProfile(req, res, url) {
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');
  const username = (url.searchParams.get('u') || '').trim();
  if (!username) return fail(res, 400, '缺少用户名');

  const { users } = await readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return fail(res, 404, '用户不存在');

  const meAuth = req.headers.authorization || '';
  let me = null;
  if (meAuth.startsWith('Bearer ')) {
    me = await verifyUserToken(meAuth.slice(7));
  }

  let isFollowing = false;
  if (me && Array.isArray(me.following)) isFollowing = me.following.includes(username);

  const relationship = getRelationship(me, user);

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

  return ok(res, {
    ok: true,
    user: {
      username: user.username,
      avatar: user.avatar || 'assets/images/default-avatar.jpeg',
      bio: user.bio || '',
      qq: user.qq || '',
      createdAt: user.createdAt,
      isFollowing,
      relationship
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
}

async function handleFollow(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '不支持的方法');
  const user = await currentUser(req, res);
  if (!user) return;

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
}

// ---------- 好友系统（带申请/接受流程） ----------

function getRequests(user) {
  if (!Array.isArray(user.friendRequests)) user.friendRequests = [];
  return user.friendRequests;
}

function getRelationship(me, target) {
  if (!me) return 'none';
  const myFriends = Array.isArray(me.friends) ? me.friends : [];
  if (myFriends.includes(target.username)) return 'friend';

  const myRequests = getRequests(me);
  const targetRequests = getRequests(target);

  const sent = myRequests.find(r => r.to === target.username && r.status === 'pending');
  if (sent) return 'pending_sent';

  const received = targetRequests.find(r => r.to === me.username && r.status === 'pending');
  if (received) return 'pending_received';

  return 'none';
}

async function handleFriend(req, res) {
  if (req.method !== 'POST') return fail(res, 405, '不支持的方法');
  const user = await currentUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  const target = (body.username || '').trim();
  const action = body.action || 'add';

  if (!target) return fail(res, 400, '缺少目标用户');
  if (target === user.username) return fail(res, 400, '不能加自己为好友');

  const data = await readUsers();
  const meIdx = data.users.findIndex(u => u.username === user.username);
  const targetIdx = data.users.findIndex(u => u.username === target);
  if (meIdx < 0 || targetIdx < 0) return fail(res, 404, '用户不存在');

  const me = data.users[meIdx];
  const them = data.users[targetIdx];
  const myFriends = ensureArray(me, 'friends');
  const theirFriends = ensureArray(them, 'friends');

  if (action === 'add') {
    // 已经是好友
    if (myFriends.includes(target)) return fail(res, 409, '你们已经是好友了');

    const myRequests = getRequests(me);
    const theirRequests = getRequests(them);

    // 检查是否已有pending
    if (myRequests.find(r => r.to === target && r.status === 'pending')) {
      return fail(res, 409, '已经发送过好友申请');
    }

    // 如果对方已经向我发送过申请，直接互加
    const incoming = theirRequests.find(r => r.to === user.username && r.status === 'pending');
    if (incoming) {
      incoming.status = 'accepted';
      if (!myFriends.includes(target)) myFriends.push(target);
      if (!theirFriends.includes(user.username)) theirFriends.push(user.username);
      me.updatedAt = Date.now();
      them.updatedAt = Date.now();
      await writeUsers(data, 'mutual friend ' + target + ' by ' + user.username);
      return ok(res, { ok: true, relationship: 'friend' });
    }

    // 发送新申请
    myRequests.push({
      id: 'fr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      from: user.username,
      to: target,
      status: 'pending',
      createdAt: Date.now()
    });
    me.updatedAt = Date.now();
    await writeUsers(data, 'friend request to ' + target + ' by ' + user.username);
    return ok(res, { ok: true, relationship: 'pending_sent' });
  }

  if (action === 'accept') {
    const theirRequests = getRequests(them);
    const incoming = theirRequests.find(r => r.to === user.username && r.status === 'pending');
    if (!incoming) return fail(res, 404, '没有待处理的好友申请');
    incoming.status = 'accepted';
    if (!myFriends.includes(target)) myFriends.push(target);
    if (!theirFriends.includes(user.username)) theirFriends.push(user.username);
    me.updatedAt = Date.now();
    them.updatedAt = Date.now();
    await writeUsers(data, 'accept friend ' + target + ' by ' + user.username);
    return ok(res, { ok: true, relationship: 'friend' });
  }

  if (action === 'reject') {
    const theirRequests = getRequests(them);
    const incoming = theirRequests.find(r => r.to === user.username && r.status === 'pending');
    if (!incoming) return fail(res, 404, '没有待处理的好友申请');
    incoming.status = 'rejected';
    me.updatedAt = Date.now();
    await writeUsers(data, 'reject friend ' + target + ' by ' + user.username);
    return ok(res, { ok: true, relationship: 'none' });
  }

  if (action === 'cancel') {
    const myRequests = getRequests(me);
    const idx = myRequests.findIndex(r => r.to === target && r.status === 'pending');
    if (idx < 0) return fail(res, 404, '没有待处理的申请');
    myRequests.splice(idx, 1);
    me.updatedAt = Date.now();
    await writeUsers(data, 'cancel friend request to ' + target + ' by ' + user.username);
    return ok(res, { ok: true, relationship: 'none' });
  }

  if (action === 'remove') {
    const i1 = myFriends.indexOf(target); if (i1 >= 0) myFriends.splice(i1, 1);
    const i2 = theirFriends.indexOf(user.username); if (i2 >= 0) theirFriends.splice(i2, 1);
    me.updatedAt = Date.now();
    them.updatedAt = Date.now();
    await writeUsers(data, 'remove friend ' + target + ' by ' + user.username);
    return ok(res, { ok: true, relationship: 'none' });
  }

  return fail(res, 400, '不支持的操作');
}

async function handleFriendRequests(req, res) {
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');
  const user = await currentUser(req, res);
  if (!user) return;

  const data = await readUsers();
  const me = data.users.find(u => u.username === user.username);
  const allRequests = Array.isArray(me.friendRequests) ? me.friendRequests : [];

  // 我收到的申请：存在对方记录里，to=我
  const received = [];
  data.users.forEach(u => {
    if (u.username === user.username) return;
    const list = Array.isArray(u.friendRequests) ? u.friendRequests : [];
    list.filter(r => r.to === user.username && r.status === 'pending').forEach(r => {
      received.push({
        id: r.id,
        from: u.username,
        to: user.username,
        avatar: u.avatar || 'assets/images/default-avatar.jpeg',
        bio: u.bio || '',
        createdAt: r.createdAt
      });
    });
  });

  // 我发送的申请
  const sent = allRequests
    .filter(r => r.status === 'pending')
    .map(r => {
      const u = data.users.find(x => x.username === r.to);
      return {
        id: r.id,
        from: user.username,
        to: r.to,
        avatar: u ? (u.avatar || 'assets/images/default-avatar.jpeg') : 'assets/images/default-avatar.jpeg',
        bio: u ? (u.bio || '') : '',
        createdAt: r.createdAt
      };
    });

  return ok(res, { ok: true, received, sent });
}
