// 蓝云屿后台图片上传接口
// 接收 base64 图片 -> 提交到 GitHub 仓库 public/assets/images/ -> 返回相对路径
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ok, fail, isAdmin, readBody, verifyUserToken, GITHUB_REPO, GITHUB_BRANCH, GITHUB_TOKEN } = require('./_lib');

// GitHub Contents API 单文件上限约 1MB（base64 后），这里限制原始图不超过 1MB
const MAX_BYTES = 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '不支持的方法');

  const body = await readBody(req);
  const authHeader = req.headers.authorization || '';
  const userToken = body.token || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');

  // 校验权限：管理员 或 已登录玩家
  let uploader = null;
  if (isAdmin(req)) {
    uploader = 'admin';
  } else {
    const user = await verifyUserToken(userToken);
    if (!user) return fail(res, 401, '未登录或无权限');
    uploader = user.username;
  }
  const dataUrl = body.dataUrl || '';
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!m) return fail(res, 400, '请选择有效的图片文件');

  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) {
    return fail(res, 400, '图片过大（超过 1MB），请用更小的图或先压缩');
  }

  const ext = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
  const base = (body.name || 'image').replace(/\.[^.]+$/, '').replace(/[^\w-]/g, '_').slice(0, 24);
  const fname = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${base}.${ext}`;
  const repoPath = `public/assets/images/${fname}`;

  // 本地开发兜底（未配置 GITHUB_TOKEN 时写本地目录，便于 node server.js 调试）
  if (!GITHUB_TOKEN) {
    try {
      const dir = path.join(process.cwd(), 'public', 'assets', 'images');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, fname), buf);
      return ok(res, { ok: true, url: `assets/images/${fname}`, local: true });
    } catch (e) {
      return fail(res, 500, 'GITHUB_TOKEN 未配置且本地写入失败：' + e.message);
    }
  }

  try {
    const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`;
    const r = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'lanyunyu-web'
      },
      body: JSON.stringify({
        message: `upload image ${fname} via ${uploader}`,
        branch: GITHUB_BRANCH,
        content: buf.toString('base64')
      })
    });
    if (!r.ok) {
      const text = await r.text();
      let hint = '';
      if (r.status === 404) hint = '（请检查 Vercel 环境变量 GITHUB_REPO / GITHUB_BRANCH 是否正确，并重新 Deploy）';
      if (r.status === 401 || r.status === 403) hint = '（GITHUB_TOKEN 无效或权限不足，请确认 token 勾选了 repo 权限）';
      return fail(res, r.status, 'GitHub 上传失败: ' + r.status + ' ' + text.slice(0, 200) + ' ' + hint);
    }
    return ok(res, { ok: true, url: `assets/images/${fname}` });
  } catch (e) {
    return fail(res, 500, e.message || '上传失败');
  }
};
