// 蓝云屿：Vercel Blob 客户端直传授权端点
// 浏览器通过此端点换取「客户端直传令牌」，再直接 PUT 到 Vercel Blob 存储，
// 不经过本函数的请求体（因此不受 Vercel 4.5MB 函数体积限制，可上传大图）。
// 需要 Vercel 环境变量：BLOB_READ_WRITE_TOKEN（建好 Blob store 后自动注入，也可手动配置）。
import { handleUpload } from '@vercel/blob/client';
import { verifyUserToken, isAdmin } from './_lib.js';

const MAX_BYTES = 10 * 1024 * 1024; // 单图上限 10MB（Vercel Blob Hobby 足够）

function json(res, code, obj) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
  });
}

export default async function (req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});

  // Blob 未配置时，前端会回退到 /api/upload（GitHub 方案，仅 1MB）
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(res, 503, { ok: false, msg: 'BLOB_DISABLED' });
  }

  if (req.method !== 'POST') return json(res, 405, { ok: false, msg: '不支持的方法' });

  // 校验登录态：管理员或已登录玩家
  const auth = req.headers.authorization || '';
  let uploader = null;
  if (isAdmin(req)) {
    uploader = 'admin';
  } else {
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const user = await verifyUserToken(token);
    if (!user) return json(res, 401, { ok: false, msg: '请先登录后再上传图片' });
    uploader = user.username;
  }

  const body = await readBody(req);
  if (!body || body.type !== 'blob.generate-client-token') {
    return json(res, 400, { ok: false, msg: '无效的请求' });
  }

  // 约束 pathname：forum/<上传者>/<随机>.<ext>
  const { pathname } = body.payload || {};
  if (typeof pathname !== 'string' || !pathname.startsWith(`forum/${uploader}/`)) {
    return json(res, 400, { ok: false, msg: '非法的上传路径' });
  }

  try {
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: new Request('https://lanyunyu.invalid/blob-upload'),
      body,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: MAX_BYTES,
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        addRandomSuffix: true,
      }),
    });
    return json(res, 200, result);
  } catch (e) {
    console.error('[blob-upload]', e);
    return json(res, 500, { ok: false, msg: '生成上传令牌失败：' + (e.message || e) });
  }
};
