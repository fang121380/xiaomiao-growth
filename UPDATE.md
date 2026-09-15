# 发布新版流程

改完代码 → 30 秒内自动推到所有用户手机的完整流程。

## 整体时序

```
你改代码 (本地)
   │  git add . && git commit -m "..." && git push
   ▼
GitHub 收到推送 (1 秒)
   │
   ▼  CF Pages 监听 webhook
CF 自动拉取并部署 (20-40 秒)
   │
   ▼  www/version.json 的 build 号已更新
所有已装 App 的用户下次打开
   │
   ▼  app.js 里 checkRemoteUpdate() 拉到新 version.json
   │
   ▼  比对 LOCAL_BUILD < remote build
   │
   ▼  顶部弹"✨ v2.x.x 已就绪"横幅
   │
   ▼  用户点"立即更新" → SW 跳过等待 + reload
   │
   ▼  加载新代码 ✓
```

---

## 标准发版步骤

### 1. 改代码

正常编辑 `app.js` / `index.html` / `styles.css` / `breeds.js` / `knowledge.js` 等。

⚠️ **不要改** `config.js`（API key，gitignore）、`android/` 下的工程文件。

### 2. 同步本地符号链接（重要）

`www/` 里 `app.js` / `styles.css` / `index.html` 是符号链接，会自动同步；但 `breeds.js` / `knowledge.js` / `config.js` 是普通文件，需手动：

```bash
cp app.js styles.css index.html sw.js manifest.json breeds.js knowledge.js config.js www/
```

### 3. 改 build 号（关键）

编辑 `www/version.json`：

```json
{
  "build": 5,                        // ← 必须比上次大 1
  "version": "v2.2.2",               // ← 跟实际版本对齐
  "released": "2026-09-16",          // ← 今天的日期
  "changelog": "新增 XX 功能，修复 XX bug",  // ← 给用户看
  "force": false,                    // ← true = 强制更新（不可关闭）
  "min_supported_build": 4           // ← 低于此版本必须更新
}
```

### 4. 同步 LOCAL_BUILD

`app.js` 顶部：

```js
const LOCAL_BUILD = 5;  // 与 www/version.json 同步
```

**build 号必须同时改 `version.json` 和 `app.js`**，否则 App 不知道自己是新版本。

### 5. 提交推送

```bash
git add -A
git commit -m "v2.2.2: XX 功能"
git push origin main
```

### 6. 等 CF 部署（30-90 秒）

到 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → 你的项目 → **Deployments** 看进度。

部署成功后，访问 `https://xiaomiao-toh.pages.dev/version.json` 应该能看到新的 build 号。

### 7. 用户收到更新

用户下次打开 App 就会看到横幅 —— **不用发任何 APK**。

---

## 重打 APK 的时机

只在以下情况需要重打 APK（推新 APK 给用户）：

| 场景 | 要重打？ |
|---|---|
| 改了 web 资源（app.js / html / css） | ❌ 不用，远程热更 |
| 改了 Android 工程（build.gradle / AndroidManifest） | ✅ 要 |
| 改了 Capacitor 配置（capacitor.config.json） | ✅ 要 |
| 改了原生插件 | ✅ 要 |
| 改了 App 图标 / 名称 / 启动屏 | ✅ 要 |

普通功能迭代 **不需要重打 APK**。

---

## 强制更新（重大 bug 修复）

如果某版本有严重问题必须立即全员更新：

```json
// www/version.json
{
  "force": true,
  "min_supported_build": 6
}
```

用户打开 App 会看到强制横幅，**不能关闭**，必须点更新。

⚠️ **慎用** —— 用户体验差，只在数据丢失 / 安全漏洞等紧急情况用。

---

## 回滚

新版出问题 → Cloudflare Dashboard → Deployments → 选上一个成功的 build → **Retry deployment** 或 **Rollback**。

也可以本地回滚 + push：

```bash
git revert HEAD
git push origin main
```

---

## 完整示例：发个 v2.2.2 修复体重图 bug

```bash
# 1. 改代码
vim app.js   # 修复体重图 y 轴标签 bug
vim www/version.json  # build 4 → 5, version "v2.2.1" → "v2.2.2", changelog 改

# 2. 同步
cp app.js www/

# 3. 同步 LOCAL_BUILD
# 编辑 app.js: const LOCAL_BUILD = 5;

# 4. 推送
git add -A
git commit -m "v2.2.2: 修复体重图 y 轴标签"
git push origin main

# 5. 等 30 秒
# 6. 打开 App 应该看到横幅 → 点更新 → 看到修复
```

全程 **5 分钟内**完成，不需要打 APK。

---

## 本地测试热更流程

装好 v2.2.1 APK 后：

1. 本地改 `app.js` 某处文字 → push
2. 等 CF 部署完（看 Dashboard）
3. 杀进程重开 App
4. 顶部应该弹"v2.2.x 已就绪"横幅
5. 点"立即更新" → 看到改动

如果**没弹横幅**：
- 检查 `version.json` 的 build 是否真的大于 `app.js` 里 `LOCAL_BUILD`
- 杀进程重开（不能只切后台）
- 检查 App 是否能访问 `https://xiaomiao-toh.pages.dev/version.json`（手机浏览器打开看看）
