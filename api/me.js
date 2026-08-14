const { ok, fail, readUsers } = require('./_lib');

// 从 Authorization: Bearer <token> 解析当前玩家
async function authUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const data = await readUsers();
  const user = data.users.find(u => u.token === token && u.tokenExp > Date.now());
  return user || null;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return fail(res, 405, '仅支持 GET');

  const user = await authUser(req);
  if (!user) return fail(res, 401, '未登录或登录已过期');
  return ok(res, {
    ok: true,
    username: user.username,
    qq: user.qq || '',
    avatar: user.avatar || 'assets/images/default-avatar.jpeg',
    bio: user.bio || '',
    createdAt: user.createdAt,
    following: Array.isArray(user.following) ? user.following : []
  });
};

// 供其他接口复用
module.exports.authUser = authUser;
