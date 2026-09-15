# 🐱 小喵成长记

一款为小猫主人打造的本地化成长记录 Android APP。

记录小猫的出生天数、品种、生活点滴（喂食、体重、用药、疫苗、驱虫、日常…）和形象相册，
全部数据存本地，离线可用，且通过 **Cloudflare Pages 远程热更新** — 改完代码 30 秒内推送到所有用户。

## ✨ 功能特性

- 🎂 **自动算生日**：输入出生日期，自动显示陪伴天数 / 月龄
- 🐾 **11 种记录类型**：喂食、体重、排便、排尿、用药、生病、疫苗、驱虫、洗澡、剪甲、日常
- 🐱 **智能品种选择**：80+ 猫品种本地库 + 4 级评分（完全匹配 / 包含 / 反向 / 编辑距离）+ 维基百科中文搜索
- 📷 **形象相册**：IndexedDB 存原图，按月分组
- 📊 **体重趋势图**：纯 Canvas 折线图，自动标最高/最低
- 💉 **健康提醒**：疫苗 / 体内驱虫 / 体外驱虫到期日提醒（首页红/橙横幅）
- ➕ **首页浮动按钮**：一键喂食/排便/体重/健康
- 📤📥 **完整数据导出/导入**：照片 base64 内嵌，单 JSON 文件可备份到网盘
- 🤖 **AI 宠物医生**：接入 DeepSeek API，含紧急信号检测（尿不出/无尿/抽搐/血便等 30+ 词自动前置警示横幅）
- 📚 **养猫知识库**：26 条知识覆盖 6 类（疾病/症状/护理/营养/行为/紧急）
- 🔄 **远程热更新**：所有 App 打开时自动检测新版，弹横幅提示刷新
- 🎨 **iOS 风格 UI**：毛玻璃 + 弹簧动画 + 自定义 DatePicker / BreedPicker / Sheet / Modal

## 🛠️ 技术栈

| 层 | 选型 |
|---|---|
| 前端 | 原生 HTML/CSS/JS（无框架） |
| 打包 | Capacitor 8.5（Android） |
| 存储 | IndexedDB（照片 Blob）+ localStorage（元数据） |
| 远程更新 | Cloudflare Pages + Service Worker（network-first + 缓存兜底） |
| AI | DeepSeek API（硬编码 key，`config.js` gitignore） |
| 在线品种搜索 | 中文维基百科 API（兜底 catfact.ninja） |

## 📂 项目结构

```
小喵/
├── README.md           # 本文件
├── CHANGELOG.md        # 版本演进历史
├── DEPLOY.md           # Cloudflare Pages 部署指南
├── UPDATE.md           # 发布新版流程（推送用户更新）
├── BUILD.md            # 本地打 APK 指南
│
├── www/                # 远程部署的源码根目录
│   ├── index.html      # 单页应用入口
│   ├── styles.css      # iOS 风格主题
│   ├── app.js          # 主程序（~2200 行）
│   ├── breeds.js       # 80+ 品种数据库 + 4 级评分搜索
│   ├── knowledge.js    # 26 条养猫知识
│   ├── config.js       # ⚠️ DeepSeek API key（gitignore）
│   ├── sw.js           # Service Worker（network-first）
│   ├── manifest.json   # PWA 清单
│   ├── version.json    # 🔑 版本检测文件（每次发版必改）
│   └── icon.svg / icon-*.png
│
├── android/            # Capacitor Android 工程
│   ├── app/
│   │   ├── build.gradle       # 版本号 / 签名配置
│   │   └── src/main/assets/public/  # APK 内置 fallback 资源
│   ├── local.properties       # SDK 路径（gitignore）
│   ├── xiaomiao.keystore      # 自签名证书（gitignore）
│   └── gradlew
│
├── capacitor.config.json       # 指向远程 server.url
├── package.json
└── .gitignore
```

## 🔄 远程热更新架构

```
[ 你编辑代码 ]
      │
      ▼
[ git push ]
      │
      ▼ (CF 自动监听 GitHub repo)
[ Cloudflare Pages 自动部署 ]  ← 30 秒
      │
      ▼
[ App 启动时 ]
      │
      ├─→ 加载 https://xiaomiao-toh.pages.dev/  (主入口)
      │
      └─→ 拉取 /version.json 比对本地 LOCAL_BUILD
            │
            └─→ 新版？→ 顶部弹横幅"立即更新" → SW 强制刷新
```

**用户始终装同一个 APK**，新功能通过 WebView 远程加载。

## 🚀 快速上手

| 任务 | 文档 |
|---|---|
| 部署 / 修改远程站点 | [DEPLOY.md](DEPLOY.md) |
| 发布新版本（推到用户手机） | [UPDATE.md](UPDATE.md) |
| 本地打 APK | [BUILD.md](BUILD.md) |
| 看历史版本变更 | [CHANGELOG.md](CHANGELOG.md) |

## 📦 当前 APK

`小喵成长记-v2.2.1.apk`（3.3 MB）—— 远程拉 `https://xiaomiao-toh.pages.dev/`

## ⚠️ 关于 DeepSeek API Key

`config.js` 默认包含硬编码 API key（**仅供原作者个人使用**），已在 `.gitignore` 中排除。

**如果你 fork 本仓库**：

1. **删除 `config.js` 的默认 key** —— 这是原作者私人凭据
2. 换成自己的 DeepSeek key（[申请](https://platform.deepseek.com/)）
3. 或者改为运行时让用户输入 key

详细安全说明见 [DEPLOY.md](DEPLOY.md#%E5%85%B3%E4%BA%8E-api-key)。

## 📜 许可

MIT License

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
