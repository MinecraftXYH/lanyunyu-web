# 蓝云屿官网 · 免费部署指南

本站是 **Node.js 零依赖** 项目（`server.js` 自带所有逻辑，无需 `npm install`）。
启动命令：`node server.js` 或 `npm start`（已在 package.json 配置）。
端口：默认 3000，云平台的 `PORT` 环境变量会自动注入，无需改代码。

> ⚠️ **平台变更（2026）**：Zeabur 新项目必须绑定付费服务器，已不再免费，请勿使用。
> 下面推荐 **Render.com（免费 · 免信用卡）**。

---

## 推荐方案：Render.com（免费 · 免信用卡）

- 免费 Web Service，**免信用卡**，每月 5GB 流量。
- 15 分钟无访问会休眠；用免费 **UptimeRobot** 每 5 分钟 ping 一次即可实现「永远在线」。
- 需要把项目推到 GitHub（本机需装 Git，免费）。

### 教程视频已改为外链（已就绪）

视频不再进仓库、也不占 Render 流量。下载页的播放器读取 `data.json` 里的 `tutorial.url` 字段自动渲染：
- **B站链接**（含 `BVxxxx`）：自动内嵌播放器，最干净。
- **通用 mp4 直链**：直接内嵌 `<video>` 播放。
- **网盘等其它链接**：显示「▶ 去外部观看」跳转按钮。

**你只需做一步**：把视频传到 B站 / 腾讯微云 / 百度网盘，拿到分享链接后，编辑 `data.json` 把
```json
"tutorial": { "url": "", "provider": "bilibili" }
```
里的 `url` 填上链接，重新部署即可。链接为空时页面显示「教程视频即将上线」，不影响其它功能。

> 注：本地 `assets/downloads/服务器安装教程-新手必看.mp4` 已被 `.gitignore` 忽略，不会提交，可留作备份。

### 部署步骤

1. 装 Git（如未安装）：下载 Git for Windows，一路默认安装。
2. GitHub 新建空仓库（免费、免信用卡）。
3. 本地已 `git init` 且暂存完成（视频已排除）→ 设置身份 → `git commit` → `git push` 到 GitHub。
4. 注册 render.com（免信用卡；**若被要求填信用卡请停下告诉我**）→ New → Web Service → 关联该仓库。
5. Build Command 留空，Start Command 填 `npm start`。
6. 部署完成得到 `xxx.onrender.com` 网址。
7. 注册免费 UptimeRobot → Add New Monitor → URL 填你的 onrender 网址 → 间隔选 5 分钟，防休眠。

### 后台与域名

- 后台：`你的网址/admin.html`，账号 `admin`，密码 `lyy20260701`（可用环境变量 `LYY_ADMIN_USER` / `LYY_ADMIN_PWD` 覆盖）。
- 自定义域名：上线后在 Render 控制台 **Domains** 添加，按提示到域名 DNS 处加记录，自动签发 SSL。
  若你的 Minecraft 服务器也用同一个域名当连接地址，请勿直接把根域名 A 记录指向 Render，否则 MC 会连不上；
  用子域名（如 `www.mclyy.top`）放网站，或根域名给网站 + 给 MC 加 `_minecraft._tcp` 的 SRV 记录。

---

## 备选方案：Replit（免装 Git，文件夹直传）

- replit.com 注册（免信用卡）→ New Repl → 选 Node.js → 上传项目文件夹 → 设启动命令 `node server.js` → 得到 `xxx.replit.app` 公网网址。
- 优点：不用 Git、最省事；教程视频已走外链，不受影响。
- 缺点：免费版空闲会休眠，**不是真正长久在线**（UptimeRobot 探活对 Replit 免费版效果有限）。

---

## ⚠️ 流量提醒（重要）

教程视频已走外链，服务器零流量负担，最稳。仓库仅含代码与图片/整合包（整合包 5.3MB，下载走 Render 流量，免费层 5GB/月足够日常使用）。

---

## 本地运行（给自己看 / 调试）

```bash
node server.js
# 浏览器打开 http://localhost:3000
# 后台：http://localhost:3000/admin.html
```
