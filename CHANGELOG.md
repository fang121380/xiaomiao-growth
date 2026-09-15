# 版本演进历史

## v2.2.3（2026-09-15）— 当前版本

- 🐛 体重单位统一：输入仍为 g，所有显示处统一除以 1000 显示 kg（趋势图/stat
  卡/最近记录/时间线列表）
- 🐛 首页去重：删除「最近体重」stat 卡，体重完全交给趋势图展示（避免 4 次重复）
- 🐛 设置页健康提醒改为折叠 accordion（3 组：疫苗/体内驱虫/体外驱虫），
  头部状态徽章实时显示「上次 X」或「下次 X」或「未设置」
- 🐛 首页 stat 卡点击可跳转：出生天数 → 设置页；生活记录 → 记录 tab；
  照片 → 相册 tab
- 🐛 AI 医生改用 CF Pages Functions 同源代理（`/api/deepseek`），解决
  Android WebView 跨域 POST 拦截导致的「Failed to fetch」（curl 测试 API
  key 和 CORS 都正常，但 WebView 仍会拒，所以走同源代理最稳）
- 🐛 子页面（sheet/modal）支持 Android 返回键/边缘手势返回：通过
  `history.pushState` + `popstate` 监听实现
- ➕ 新增文件 `functions/api/deepseek.js`（CF Pages 自动部署）

## v2.2.2（2026-09-15）

- 🐛 修复首页浮动 + 按钮不显示的 bug

  根因：`ensureFab()` 用 `document.querySelector('.fab')` 判断是否已存在 FAB，
  但 timeline 页的静态 `<button class="fab" id="fabAdd">` 也匹配 `.fab`，所以
  home 页调用 ensureFab 时直接 return，永远不创建。

  修复：动态 FAB 加独特 class `fab-home`，early-return 改为只查 `.fab-home`；
  新增 `updateFabVisibility()` 在 switchTab 时同步两个 FAB 的显示/隐藏（home
  显示 fab-home，timeline 显示 #fabAdd，其他页都不显示）。

## v2.2.1（2026-09-15）

**里程碑：远程热更新架构上线**

- 🔄 **远程热更新**：APK 改远程加载，CF Pages 自动部署，所有用户 30 秒收到新版
- ☁️ 部署到 Cloudflare Pages：`https://xiaomiao-toh.pages.dev/`
- 📊 体重趋势图（首页 Canvas）
- 💉 疫苗/驱虫自动到期提醒
- 📤📥 完整数据导出/导入（照片 base64 内嵌）
- ➕ 首页浮动 + 按钮（一键喂食/排便/体重/健康）

## v2.2.0（2026-09-15）— 内部版本，未对外

5 个新功能开发完成，但当时还未配置远程部署，所以没真正分发。后续直接合并到 v2.2.1。

## v2.1.0（2026-09-15）

**集成 Codex 优良实践**

- 🔍 品种搜索升级：4 级评分（完全匹配 100 / 包含 80+ / 反向 55+ / 编辑距离 ≤2 → 30 / 拆字 25 / 学名首字母 20）
- 📐 加 Levenshtein 编辑距离算法
- 🌐 在线品种搜索换源：catfact.ninja → 中文维基百科 API（搜"金渐层"能搜到本地中文条目）
- 🚨 AI 紧急信号检测：30+ 词紧急词表（尿不出/无尿/张口呼吸/抽搐/昏迷/误食/血便等），命中前置红色横幅
- 🛡️ AI system prompt 强化：明确不做诊断/不给药量/temperature 0.7→0.2 更稳

## v2.0.0（2026-09-14）

**UI 完全重写（iOS 风格）**

- 🎨 iOS 风格 UI（毛玻璃 + 弹簧动画）
- 🐱 80+ 猫品种数据库 + 模糊搜索
- 📱 自定义 DatePicker / BreedPicker / Sheet / Modal
- 🤖 接入 DeepSeek AI 宠物医生
- 📚 26 条养猫知识库（6 类：疾病/症状/护理/营养/行为/紧急）
- 🏠 5 个 tab 导航：首页 / 记录 / 助手 / 相册 / 设置

## v1.0.0（更早）

- 基础 CRUD 记录功能
- IndexedDB 存照片
- 自签名 APK

---

## 版本号约定

```
v2.2.1
│ │ │
│ │ └── patch:  bug 修复 / 小调整（用户无感）
│ └──── minor:  新功能（用户能感知，但要打开 App）
└────── major:  架构变更 / 重新设计（用户必须重新适应）
```

## 配套文件

每个版本对应：

| 文件 | 内容 |
|---|---|
| `android/app/build.gradle` | `versionCode` / `versionName` |
| `app.js` 顶部 | `APP_VERSION` 字符串 |
| `app.js` 中段 | `LOCAL_BUILD` 数字（必须 = version.json 的 build） |
| `www/version.json` | `build` / `version` / `changelog` / `force` / `min_supported_build` |
| `index.html` | `.about-ver` 文案 |

发布新版的完整流程见 [UPDATE.md](UPDATE.md)。
