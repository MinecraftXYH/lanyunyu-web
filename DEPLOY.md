# 蓝云屿官网 · 部署指南（Vercel 方案）

## 为什么选 Vercel

- ✅ **完全免费**（Hobby 计划）
- ✅ **无需信用卡**（注册即可用）
- ✅ **不休眠**（不像 Replit / Render 免费层那样睡着）
- ✅ **支持自定义域名 + 自动 HTTPS**
- ✅ **数据持久化**：后台的留言会 commit 到 GitHub 仓库，每次都有历史记录

## 部署步骤

### 1. 准备 GitHub Personal Access Token（PAT）

进入 https://github.com/settings/tokens → **Generate new token (classic)**：
- Note: 填 `vercel-lanyunyu`
- Expiration: No expiration
- Scopes: 勾选 `repo`（完整仓库访问）

点 **Generate token**，**复制保存**那串 `ghp_...` 开头的字符串（关掉页面就再也找不到了）。

### 2. 把代码推上去

你之前已经把代码推到 `https://github.com/MinecraftXYH/lanyunyu-web`，我新增了 `api/`、`vercel.json` 等文件，现在需要把改动推上去：

```bash
cd C:\Users\admin\WorkBuddy\2026-08-12-08-55-57
git add .
git commit -m "feat: vercel serverless api"
git push
```

### 3. Vercel 部署

1. 打开 https://vercel.com → 点 **Sign Up** → 选 **Continue with GitHub**（免信用卡）
2. 授权后回到 Vercel，点 **Add New → Project**
3. 找到 `MinecraftXYH/lanyunyu-web` 仓库，点 **Import**
4. 配置项目：
   - **Project Name**: `lanyunyu-web`（或任意）
   - **Framework Preset**: 选 **Other**
   - **Build & Output Settings**: 全默认（Vercel 自动识别）
5. **展开 Environment Variables**，添加：
   - `GITHUB_TOKEN` = 你刚才生成的 `ghp_...`
   - `GITHUB_REPO` = `MinecraftXYH/lanyunyu-web`
   - `LYY_ADMIN_USER` = `admin`（可选，默认就是 admin）
   - `LYY_ADMIN_PWD` = `lyy20260701`（可选，默认就是这个）
6. 点 **Deploy**

等 1-2 分钟，部署完成会给你一个网址 `lanyunyu-web.vercel.app`，打开看效果。

### 4. 绑定你的域名（可选）

在 Vercel 项目 → **Settings → Domains** → 输入域名 → 按提示去域名服务商加一条 `CNAME` 记录指向 `cname.vercel-dns.com`。

⚠️ **重要提醒（避免搞崩 MC）**：如果你的域名 `mclyy.top` 同时也是 Minecraft 服务器连接地址，把根域名绑给 Vercel 会让 MC 连不上。两种安全做法：
- **用子域名放网站**：比如 `www.mclyy.top` 绑 Vercur，`mclyy.top` 留给 MC 服务器
- **根域名给网站 + MC 用 SRV**：把根域 A 记录指 Vercel，再单独加 `_minecraft._tcp.mclyy.top` 的 SRV 记录指向 MC 服务器真实 IP

需要我帮你写具体 DNS 记录，告诉我你的域名和 MC 服务器真实 IP。

### 5. 后台管理

- 后台地址：`https://你的域名/admin.html`
- 账号：`admin`
- 密码：`lyy20260701`

## 日常修改

- 改网站配置：在后台编辑 → 自动 commit 到 GitHub → Vercel 自动重新部署（约 30 秒生效）
- 改代码：在本地改完 `git push`，Vercel 自动部署

## 文件说明

```
api/
├── _lib.js                  # 共享工具（GitHub API 调用、token 校验）
├── login.js                # POST 登录
├── config.js               # GET/POST 配置
├── contact.js              # POST 联系留言
├── contacts.js             # GET 联系留言列表
└── contacts/[id].js        # DELETE 单条留言
public/                     # 静态文件
├── index.html / about.html / download.html / admin.html
└── assets/                 # CSS / JS / 图片 / 下载文件
data.json                   # 网站配置（用 data.json 里的内容渲染）
vercel.json                 # Vercel 路由配置
server.js                   # 本地测试用（部署到 Vercel 用不到）
DEPLOY.md                   # 本文件
```

## 本地测试

```bash
node server.js
# 访问 http://localhost:3000
```

## 故障排查

- **后台登录提示失败**：检查 Vercel → Settings → Environment Variables 里 `LYY_ADMIN_USER` 和 `LYY_ADMIN_PWD` 是否设置正确（默认 admin / lyy20260701）
- **保存配置失败 / 留言提交失败**：检查 `GITHUB_TOKEN` 是否有效（PAT 没过期、勾了 repo 权限）
- **看不到最新内容**：Vercel 部署会自动跑，重新部署后浏览器硬刷新 `Ctrl+Shift+R`
- **GitHub API 速率限制**：默认 5000 次/小时，远超你站点的用量，无需担心