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

## 两层更新机制（必须区分）

小喵成长记有两套**独立**的更新机制，互不干扰：

| 层 | 检测函数 | 比较对象 | 触发横幅 |
|---|---|---|---|
| **Web 资源**（HTML/JS/CSS） | `checkRemoteUpdate()` | `LOCAL_BUILD` vs `version.json.build` | 橙色"✨ 已就绪" |
| **原生 APK**（Gradle / 插件） | `checkApkUpdate()` | `APK_VERSION_CODE` vs `apk-version.json.versionCode` | 蓝色"📱 已就绪" |

任何"横幅永远不消失"或"永远不出现"的 bug，99% 是这两套的版本号没同步。

---

## ⚠️ 四个版本号必须同步（硬性不变量）

每次发版都要同时改这 4 处，**任何一处漏改都会触发横幅 bug**：

| # | 位置 | 字段 | v2.3.0 当前值 |
|---|---|---|---|
| 1 | `www/app.js:6` | `APP_VERSION` | `'v2.3.0'` |
| 2 | `www/app.js:7` | `APK_VERSION_CODE` | `18` ← 与 build.gradle 同步 |
| 3 | `www/app.js:3050` | `LOCAL_BUILD` | `14` ← 与 version.json.build 同步 |
| 4 | `www/version.json` | `"build"` | `14` |
| 5 | `www/apk-version.json` | `"versionCode"` | `18` ← 与 build.gradle 同步 |
| 6 | `android/app/build.gradle` | `versionCode` | `18` |

发版前先 grep 检查全部一致：

```bash
grep -E "APP_VERSION|APK_VERSION_CODE|LOCAL_BUILD" www/app.js | head -3
grep -E '"build"|"versionCode"' www/version.json www/apk-version.json
grep "versionCode" android/app/build.gradle
```

---

## ⚠️ 文件同步：根目录 vs www/（关键陷阱）

CF Pages 服务的是**仓库根目录**，Capacitor 服务的是 `www/`。所以 `app.js` / `index.html` / `styles.css` 等在两个位置必须字节级同步：

| 位置 | 谁用它 |
|---|---|
| `app.js`（根） | CF Pages 服务根路径 `/app.js`，**WebView 实际加载的是这个** |
| `www/app.js` | Capacitor webDir（构建 APK 时被打进 assets），`npx cap sync` 时源 |

这两个文件**不是 symlink，是两份独立文件**，改了一边必须 cp 到另一边。

### 同步命令

```bash
# 1. 改源（任选一处）
vim www/app.js

# 2. 同步到根目录（CF Pages 用）
cp www/app.js app.js
cp www/index.html index.html
cp www/styles.css styles.css
cp www/sw.js sw.js
cp www/manifest.json manifest.json
cp www/breeds.js breeds.js
cp www/knowledge.js knowledge.js
cp www/config.js config.js  # 也在 gitignore，注意

# 3. 同步到 Android assets（APK 用）
npx cap sync android   # 会自动拷到 android/app/src/main/assets/public/
```

**踩过的坑**：debug 时把 `LOCAL_BUILD=0` 拷到根目录，最终 commit 漏了根目录同步。CF Pages 根路径一直是 `LOCAL_BUILD=0`，远程加载永远"旧于"远端 version.json.build=14 → 横幅永远不消失。debug 半小时。

---

## 标准发版步骤

### 1. 改代码

正常编辑 `app.js` / `index.html` / `styles.css` / `breeds.js` / `knowledge.js` 等。

⚠️ **不要改** `config.js`（API key，gitignore）、`android/` 下的工程文件。

### 2. 同步根目录（重要）

CF Pages 服务根目录，**根目录的 `app.js` 必须和 `www/app.js` 一致**：

```bash
cp www/app.js app.js
cp www/index.html index.html
cp www/styles.css styles.css
cp www/sw.js sw.js
cp www/manifest.json manifest.json
cp www/breeds.js breeds.js
cp www/knowledge.js knowledge.js
```

### 3. 改 4 个版本号

按上方"四个版本号必须同步"清单全部更新。

### 4. 提交推送

```bash
git add -A
git commit -m "v2.3.1: XX 功能"
git push origin main
```

### 5. 等 CF 部署（30-90 秒）

轮询验证部署完成：

```bash
for i in 1 2 3 4 5; do
  sleep 6
  B=$(curl -sS "https://xiaomiao-toh.pages.dev/www/version.json?_=$(date +%s)" | grep '"build"' | head -1)
  echo "[$((i*6))s] $B"
  echo "$B" | grep -q '"build": <新值>' && break
done
```

### 6. 用户收到更新

用户下次打开 App → 自动弹横幅 → 点立即更新。

---

## 重打 APK 的时机

只在以下情况需要重打 APK：

| 场景 | 要重打？ | 触发横幅 |
|---|---|---|
| 改了 web 资源（app.js / html / css） | ❌ 不用，远程热更 | 橙色（web） |
| 改了 Android 工程（build.gradle / AndroidManifest） | ✅ 要 | 蓝色（APK） |
| 改了 Capacitor 配置（capacitor.config.json） | ✅ 要 | 蓝色（APK） |
| 改了原生插件 / 启动屏 / 图标 | ✅ 要 | 蓝色（APK） |
| 只改了 www/apk-version.json 的 changelog 字段 | ❌ 不用 | （不影响） |

普通功能迭代 **不需要重打 APK**。

### 重打 APK 流程

```bash
# 1. 同步 web 资源到 Android assets
npx cap sync android

# 2. 构建
cd android
export JAVA_HOME=/Users/andrew/tools/jdk-21.0.5+11/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
./gradlew assembleRelease

# 3. 替换归档
cd ..
cp android/app/build/outputs/apk/release/app-release.apk apks/xiaomiao-vX.Y.Z.apk

# 4. 提交
git add apks/xiaomiao-vX.Y.Z.apk
git commit -m "vX.Y.Z: 重打 APK"
git push origin main
```

APK 会通过 CF Pages 的 `apks/xiaomiao-vX.Y.Z.apk` 路径自动可下载。

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

## 故障排查（横幅行为异常时）

### 横幅永远不消失

**症状**：更新完最新代码后打开 App 仍然弹横幅。

**诊断步骤**：
1. 浏览器访问 `https://xiaomiao-toh.pages.dev/www/version.json` —— 看 build 号
2. 在 App 设置页打开 Chrome DevTools（`chrome://inspect` 远程调试）—— 看 `LOCAL_BUILD` 常量
3. 比较：remote build 是否 ≤ LOCAL_BUILD？
4. 如果 remote > LOCAL_BUILD 但横幅还在 → 看是否 SW cache 问题（用 DevTools Application → Clear Storage）
5. 如果 remote < LOCAL_BUILD → 是版本号回退了

**根因**：
- 根目录 `app.js` 没同步（CF Pages 服务根目录路径，WebView 加载的是 `/app.js` 而不是 `/www/app.js`）
- SW cache 了旧版 `app.js`（正常会被 v3 sw.js 自杀 + v2-launched 清理覆盖）
- 部署不完整（CF Pages 还在用旧 build）

### 横幅永远不出现

**症状**：明明改了 `version.json` 的 build 号，App 还是没横幅。

**诊断步骤**：
1. `curl https://xiaomiao-toh.pages.dev/www/version.json` 确认远端是新 build
2. 看 `www/app.js` 的 `LOCAL_BUILD` 是不是真的比远端 build 小
3. 看 fetch URL 用的是绝对路径 `/www/version.json` 还是相对路径（**必须绝对**，相对路径会被 CF Pages SPA fallback 返回 index.html）

**根因**：
- `fetch('version.json')` 没写绝对路径，CF Pages 返回 HTML → `.json()` 解析失败 → 静默忽略
- `LOCAL_BUILD` 已经 ≥ remote build（忘记改）
- App 是离线状态（webview 不能访问远端）

### 横幅出现但 reload 后还是旧代码

**根因**：
- SW cache 没清（罕见，正常 v3 sw.js 会自杀）
- 根目录 `app.js` 没同步（最常见）

---

## 完整示例：发个 v2.3.1 修复 AI 容错 bug

```bash
# 1. 改代码
vim www/app.js  # 修了 AI 超时逻辑

# 2. 同步根目录
cp www/app.js app.js

# 3. 改 4 个版本号
# www/app.js: APP_VERSION='v2.3.1', APK_VERSION_CODE=18, LOCAL_BUILD=15
# www/version.json: build=15
# www/apk-version.json: versionCode=18（没动 native，APK 不重打）
# android/app/build.gradle: versionCode=18（没动）

# 4. 推送
git add -A
git commit -m "v2.3.1: 修复 AI 超时后没清除 loading"
git push origin main

# 5. 等 30 秒 + 验证
curl -sS "https://xiaomiao-toh.pages.dev/www/version.json" | grep build

# 6. 用户下次打开 App 看到橙色横幅 → 点更新 → 看到修复
```

全程 **5 分钟内**完成，不需要打 APK。

---

## 本地测试热更流程

装好 v2.3.0 APK 后：

1. 本地改 `app.js` 某处文字
2. `cp www/app.js app.js`
3. `git add + commit + push`
4. 等 CF 部署完（30-90 秒）
5. 杀进程重开 App（**不能只切后台**）
6. 顶部应该弹"v2.x.x 已就绪"横幅
7. 点"立即更新" → 看到改动

如果**没弹横幅**：
- 看 DevTools Console：`LOCAL_BUILD` 和 `remoteUpdateInfo.build` 的实际值
- 看 Network：`/www/version.json` 的 response 是不是 JSON 而不是 HTML
- 检查根目录 `app.js` 和 `www/app.js` 的 `LOCAL_BUILD` 是否都改了