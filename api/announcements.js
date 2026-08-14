const { ok, fail, readBody, isAdmin, verifyUserToken, readData, writeData, readUsers } = require('./_lib');

const TITLE_MAX = 80;
const CONTENT_MAX = 5000;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === 'GET') {
    const { announcements } = await readData('announcements');
    const { users } = await readUsers();
    const avatarMap = {};
    users.forEach(u => avatarMap[u.username] = u.avatar || 'assets/images/default-avatar.jpeg');

    const list = announcements.slice().reverse().map(a => ({
      id: a.id,
      title: a.title,
      summary: a.content.slice(0, 120).replace(/\n/g, ' '),
      author: a.author,
      avatar: avatarMap[a.author] || 'assets/images/default-avatar.jpeg',
      pinned: !!a.pinned,
      createdAt: a.createdAt
    }));
    return ok(res, { ok: true, announcements: list });
  }

  if (req.method === 'POST') {
    // 公告仅管理员可发
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
};
