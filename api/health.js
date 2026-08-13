const { ok, fail, isAdmin } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return fail(res, 405, '不支持的方法');

  // 只有管理员能看到完整配置状态
  const admin = isAdmin(req);
  const repo = process.env.GITHUB_REPO || 'MinecraftXYH/lanyunyu-web';
  const branch = process.env.GITHUB_BRANCH || 'master';
  const hasToken = Boolean(process.env.GITHUB_TOKEN);

  if (!admin) {
    return ok(res, { ok: true, githubConfigured: hasToken });
  }

  // 尝试连一下 GitHub API，验证 token 是否能读仓库
  let githubOk = false;
  let githubMsg = '';
  if (hasToken) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'lanyunyu-web'
        }
      });
      githubOk = r.ok;
      if (!r.ok) {
        const txt = await r.text();
        githubMsg = r.status + ' ' + txt.slice(0, 120);
      }
    } catch (e) {
      githubMsg = e.message;
    }
  }

  return ok(res, {
    ok: true,
    githubConfigured: hasToken,
    githubReadable: githubOk,
    githubRepo: repo,
    githubBranch: branch,
    githubMsg: githubMsg || undefined
  });
};
