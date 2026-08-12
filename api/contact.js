const { ok, fail, readJSON, writeJSON, readBody } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') return fail(res, 405, '仅支持 POST');
  const body = await readBody(req);
  if (!body.name || !body.email || !body.content) {
    return fail(res, 400, '昵称、邮箱和内容不能为空');
  }
  try {
    const list = await readJSON('contacts.json', []);
    list.unshift({
      id: Date.now().toString(36),
      name: String(body.name).slice(0, 40),
      email: String(body.email).slice(0, 80),
      subject: String(body.subject || '一般咨询').slice(0, 60),
      content: String(body.content).slice(0, 2000),
      time: new Date().toLocaleString('zh-CN', { hour12: false })
    });
    await writeJSON('contacts.json', list, `contact from ${body.name}`);
    return ok(res, { ok: true });
  } catch (e) {
    return fail(res, 500, e.message || '提交失败');
  }
};