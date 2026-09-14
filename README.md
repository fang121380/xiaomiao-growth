# 🐱 小喵成长记

一款为小猫主人打造的本地化成长记录 Android APP。

记录小猫的出生天数、品种、生活点滴（喂食、体重、用药、疫苗、驱虫、日常…）和形象相册，全部数据存在本地，不联网也能用。

## ✨ 功能特性

- 🎂 **自动算生日**：输入出生日期，自动显示陪伴天数 / 月龄
- 🐾 **11 种记录类型**：喂食、体重、排便、排尿、用药、生病、疫苗、驱虫、洗澡、剪甲、日常
- 🐱 **品种选择器**：80+ 猫品种本地库 + 在线补充（基于学名模糊搜索）
- 📷 **形象相册**：网格瀑布流，每张照片记录当时的月龄
- 📱 **完全离线**：IndexedDB 存照片，localStorage 存数据，**零云端依赖**
- 📤 **导入 / 导出**：随时备份数据为 JSON 文件
- 🎨 **iOS 风格 UI**：毛玻璃 + 弹簧动画 + 自定义日期/品种选择器

## 🛠️ 技术栈

- **前端**：原生 HTML/CSS/JS（无框架）
- **打包**：Capacitor 8.5（Android）
- **存储**：IndexedDB（照片 Blob）+ localStorage（元数据）
- **PWA**：Service Worker（已弃用，主程序不依赖）
- **在线 API**：[catfact.ninja](https://catfact.ninja)（品种补充，可选）

## 🚀 本地运行 / 打包 APK

```bash
# 安装依赖
npm install

# 同步 Web 资源到 Android 工程
npx cap sync android

# 构建 APK
cd android
./gradlew assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

## 📂 项目结构

```
小喵/
├── index.html        # 入口
├── styles.css        # 主题样式（CSS 变量驱动）
├── app.js            # 主程序（含 DatePicker / BreedPicker）
├── breeds.js         # 80+ 猫品种数据库 + 模糊搜索算法
├── manifest.json     # PWA 清单
├── icon.svg          # 应用图标（金渐层卡通小猫）
└── android/          # Capacitor Android 工程
```

## 🎨 主题

| 变量 | 颜色 | 用途 |
|------|------|------|
| `--primary` | #F5A86B | 主色（橘金） |
| `--gold-deep` | #C9A058 | 品牌色（金渐层） |
| `--bg` | #FFFAF0 | 背景（奶油） |
| `--text` | #3A2A1F | 正文（深棕） |

支持系统深色模式自动适配。

## 📦 APK 安装

下载 Release 页面最新的 APK，传输到 Android 手机后打开安装（需在系统设置里允许"安装未知应用"）。

> ⚠️ 自签名证书仅供个人使用，请勿上架应用商店。

## 📜 许可

MIT License

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

---

## ⚠️ 重要警告：DeepSeek API Key

本项目使用 **DeepSeek API** 提供 AI 宠物医生对话功能。

`config.js` 文件中**默认包含一个硬编码的 API key**（仅供原作者个人使用），**该 key 已在 `.gitignore` 中被排除，不会进入 Git 历史**。

### 如果你要 fork / 二次分发：

1. **必须删除 `config.js` 中的默认 key**——这是原作者的私人凭据
2. **必须用自己的 DeepSeek key** 替换（[申请地址](https://platform.deepseek.com/)）
3. 或者改为运行时让用户输入 key 的方案

### 安全提醒

- APK 文件可以被反编译，任何下载者都能提取 key
- 硬编码 key 意味着**任何人都能用你的额度**
- **绝对不要**把含真实 key 的 `config.js` commit 到公开仓库
- 建议去 [DeepSeek 控制台](https://platform.deepseek.com/) 设置月消费上限