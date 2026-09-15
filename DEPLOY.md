# 部署指南

把小喵成长记的 web 资源部署到 Cloudflare Pages，让所有装过 App 的用户自动收到更新。

## 为什么选 Cloudflare Pages

| 候选 | 国内访问 | 配置难度 | 费用 |
|---|---|---|---|
| **Cloudflare Pages** ✅ | 快（亚太节点） | 低（Git 集成自动部署） | 免费 |
| GitHub Pages | 慢/被墙 | 低 | 免费 |
| Vercel | 中 | 低 | 免费 |
| 腾讯云 / 阿里云 OSS | 最快 | 中（需备案） | 几元/月 |

CF Pages 是唯一同时满足 **国内访问快 + 自动部署 + 免费** 的方案。

## 一次部署流程

### 前置

- 一个 Cloudflare 账号（[注册](https://dash.cloudflare.com/sign-up)）
- GitHub 仓库 `fang121380/xiaomiao-growth`（已配置好）

### 步骤

#### 1. 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧栏 → **Workers & Pages** → **Create application**
3. 选 **Pages** 标签 → **Connect to Git**
4. 选 **GitHub** → 授权 → 选仓库 **`fang121380/xiaomiao-growth`**

#### 2. 配置 Build（最关键）

| 字段 | 填什么 |
|---|---|
| Project name | `xiaomiao`（或别的，CF 会自动加 `-xxx` 后缀） |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | **留空** |
| Build output directory | **`.`**（一个英文句号） |
| Root directory (advanced) | 留空 |
| Environment variables | 留空 |

⚠️ **Build output directory 必须填 `.`** —— 否则 CF 不会识别为静态站点，会默认跑 wrangler 然后失败。

#### 3. 部署

点 **Save and Deploy**。30-90 秒后得到 URL，类似：

```
https://xiaomiao.pages.dev/
或
https://xiaomiao-xxx.pages.dev/  (如果 xiaomiao 已被占用)
```

把这个 URL 填到 `capacitor.config.json` 的 `server.url`：

```json
{
  "server": {
    "url": "https://xiaomiao-xxx.pages.dev"
  }
}
```

---

## 之后自动部署

部署好后 **不用再手动操作**。CF 自动监听 GitHub push：

```
git push → GitHub 通知 CF → CF 拉取仓库 → 30 秒后部署完
```

可以在 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → 你的项目 → **Deployments** 标签查看每次部署历史。

---

## 回滚 / 重新部署某个版本

如果新版出问题：

1. Cloudflare Dashboard → 你的项目 → **Deployments**
2. 找到上一个成功的 build
3. 点 **...** → **Retry deployment** 或 **Rollback to this deployment**

---

## 自定义域名（可选）

如果你有自己的域名（比如 `cat.example.com`）：

1. Cloudflare Dashboard → 你的项目 → **Custom domains** → **Set up a custom domain**
2. 输入域名 → CF 自动配置 DNS（前提是域名 DNS 托管在 CF）
3. 然后改 `capacitor.config.json` 的 `server.url` 为 `https://cat.example.com`

---

## 备选：拖 zip 上传

如果 Git 集成有问题，可以直接拖文件：

```bash
# 在本地准备 www/ 目录的 zip
cd www
zip -r ../xiaomiao-www.zip .
```

然后 Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Upload assets** → 拖 zip。

⚠️ 这个方式 **不会自动部署**，每次改完都要重新打 zip 拖一遍。

---

## 关于 API Key

`config.js` 默认包含硬编码的 DeepSeek API key。

### 原作者使用

- key 已在 `.gitignore`，不会 commit 到 Git
- APK 里包含这个 key，反编译可提取
- 因为只自己用，可接受这个风险
- 建议去 [DeepSeek 控制台](https://platform.deepseek.com/) 设置月消费上限作为保险

### Fork 者使用

1. **必须删除 `config.js` 中的默认 key**
2. 改成自己的 key 或运行时让用户输入
3. **绝对不要** 把含真实 key 的 `config.js` commit 到任何公开仓库
4. CF Pages 部署的也是 www/ —— 同样要小心

```js
// config.js（gitignore）
window.DEEPSEEK_API_KEY = '你自己的key';
window.DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
window.DEEPSEEK_MODEL = 'deepseek-chat';
```
