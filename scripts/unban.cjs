#!/usr/bin/env node
// 解封脚本：列出 / 清除 KV 中的 IP 黑名单（键名 ban:*）
//
// 背景：站点对「多次输错密码」和「访问 /admin、/login 等诱饵地址」的 IP 临时拉黑 24h。
//       误触诱饵或输错次数过多会导致正常 IP 也被锁，本脚本用于自助解封。
//
// 用法（二选一）：
//   A. 环境变量方式（推荐）
//      KV_REST_API_URL=https://xxx.upstash.io KV_REST_API_TOKEN=xxxxx \
//        node scripts/unban.cjs            # 仅列出
//      KV_REST_API_URL=https://xxx.upstash.io KV_REST_API_TOKEN=xxxxx \
//        node scripts/unban.cjs --delete   # 全部清除
//
//   B. 命令行参数方式
//      node scripts/unban.cjs <KV_REST_API_URL> <KV_REST_API_TOKEN> [--delete]
//
//   KV_REST_API_URL / KV_REST_API_TOKEN 可在 Vercel 项目
//   Settings -> Environment Variables 复制（前缀 KV，Upstash Redis REST）。

const url = process.env.KV_REST_API_URL || process.argv[2];
const token = process.env.KV_REST_API_TOKEN || process.argv[3];
const doDelete = process.argv.includes('--delete');

if (!url || !token) {
  console.error('缺少 KV_REST_API_URL / KV_REST_API_TOKEN。');
  console.error('用法: node scripts/unban.cjs <KV_REST_API_URL> <KV_REST_API_TOKEN> [--delete]');
  process.exit(1);
}

const auth = { Authorization: 'Bearer ' + token };
const base = url.replace(/\/$/, '');

async function kv(command, args) {
  const path = [command, ...(args || []).map(a => encodeURIComponent(a))].join('/');
  const r = await fetch(base + '/' + path, { headers: auth });
  return r.json();
}

(async () => {
  try {
    const res = await kv('keys', ['ban:*']);
    const keys = Array.isArray(res) ? res : (res.result || []);
    if (!keys.length) {
      console.log('黑名单为空，无需解封。');
      return;
    }
    console.log('当前被封锁的键 (' + keys.length + ' 个):');
    keys.forEach(k => console.log('  ' + k));
    if (!doDelete) {
      console.log('\n如需全部解封，末尾加 --delete 重新运行。');
      return;
    }
    for (const k of keys) {
      const r = await kv('del', [k]);
      console.log('已删除', k, '->', JSON.stringify(r));
    }
    console.log('\n全部解封完成，被误封的 IP 现在可以重新登录了。');
  } catch (e) {
    console.error('执行失败:', e.message);
    console.error('请确认 KV_REST_API_URL 与 KV_REST_API_TOKEN 正确，且为 Upstash Redis REST 地址。');
  }
})();
