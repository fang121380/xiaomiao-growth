# 本地打 APK 指南

只在以下情况需要打新 APK：

- 改了 Android 工程文件（`android/app/build.gradle` / `AndroidManifest.xml`）
- 改了 Capacitor 配置（`capacitor.config.json`）
- 改了原生插件
- 改了 App 图标 / 名称 / 启动屏

普通 web 资源改动 → 看 [UPDATE.md](UPDATE.md)，**不用打 APK**。

---

## 前置环境

### 1. JDK 21（必需）

Capacitor 8.5 要求 JDK 21（之前 17 会编译报错"无效的源发行版：21"）。

#### 推荐：手动下载 Temurin 21

```bash
# 下载（约 190MB）
curl -L -o /tmp/jdk21.tar.gz "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jdk/aarch64/mac/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.12.1_1.tar.gz"

# 解压
mkdir -p ~/jdk21
tar -xzf /tmp/jdk21.tar.gz -C ~/jdk21 --strip-components=1
```

装好后 JDK 在 `~/jdk21/Contents/Home`。

#### 或用 brew

```bash
brew install --quiet temurin@21
export JAVA_HOME=$(brew --prefix temurin@21)/libexec/openjdk.jdk/Contents/Home
```

### 2. Android SDK 35（必需）

```bash
# 下载 cmdline-tools（约 130MB）
curl -L -o /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip"

# 解压到 SDK 目录
mkdir -p ~/Library/Android/sdk/cmdline-tools
unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdtools
mv /tmp/cmdtools/cmdline-tools ~/Library/Android/sdk/cmdline-tools/latest

# 安装 platform 和 build-tools
export JAVA_HOME=~/jdk21/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

yes | sdkmanager --licenses
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
```

### 3. 配置 Capacitor 指向 SDK

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

⚠️ `local.properties` 已 gitignore，每台机器都要建。

---

## 签名证书（首次）

APK 需要签名才能装到手机。本项目用自签名 keystore，仅个人使用。

```bash
cd android

# 生成 keystore（如果还没有）
keytool -genkey -v \
  -keystore xiaomiao.keystore \
  -alias xiaomiao \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass xiaomiao123 -keypass xiaomiao123 \
  -dname "CN=Andrew, OU=Personal, O=Xiaomiao, L=City, S=State, C=CN"
```

⚠️ `xiaomiao.keystore` 已 gitignore。但 **app/build.gradle** 里写死了密码（也是 `xiaomiao123`），如果换密码要同步改 `signingConfigs.release`。

⚠️ **keystore 千万别丢** —— 丢了意味着再也无法升级这个 App（必须换包名重装）。

---

## 同步 web 资源到 Android 工程

```bash
# 在项目根目录
cp app.js styles.css index.html sw.js manifest.json breeds.js knowledge.js config.js www/
cp app.js styles.css index.html sw.js manifest.json breeds.js knowledge.js config.js version.json android/app/src/main/assets/public/
```

或用 `npx cap sync`（会做同样事 + 生成插件代码）：

```bash
npx cap sync android
```

---

## 升级版本号

每次打 APK 都要升版本号（不然 Play Protect 会警告"未签名升级"，且无法判断是新包）：

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 5        // ← 必须递增（整数）
    versionName "2.2.1"  // ← 给人看的版本
}
```

⚠️ **versionCode 必须递增**，versionName 可以自由。

同步更新 `app.js` 和 `index.html` 里的 `APP_VERSION`：

```js
// app.js 顶部
const APP_VERSION = 'v2.2.1';
```

```html
<!-- index.html -->
<div class="about-ver">v2.2.1 · 自动更新</div>
```

---

## 构建 APK

```bash
cd android
export JAVA_HOME=~/jdk21/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$PATH

./gradlew assembleRelease
```

产物：

```
android/app/build/outputs/apk/release/app-release.apk
```

改名放到根目录：

```bash
cp android/app/build/outputs/apk/release/app-release.apk ../小喵成长记-v2.2.1.apk
```

---

## 调试包（可选）

日常开发用 debug 包更快：

```bash
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

debug 包不能用 release keystore 签名，会被系统当成"未知来源"装不上，需要先卸载正式包。

---

## 故障排查

### `SDK location not found`

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

### `无效的源发行版：21`

JDK 不是 21。检查 `java -version` 是不是 Temurin 21+。

### `BUILD SUCCESSFUL` 但 APK 装不上

- 检查版本号是否 ≥ 当前已装版本（versionCode）
- 卸载旧版本再装（不同 keystore 签名不兼容）

### `OutOfMemoryError`

Gradle 内存不够。改 `android/gradle.properties`：

```
org.gradle.jvmargs=-Xmx4g -Dfile.encoding=UTF-8
```

### 重复任务太多

清缓存：

```bash
cd android
./gradlew clean
```

---

## 完整打 APK 流程（一次性脚本）

```bash
#!/bin/bash
set -e

# 1. 同步 web 资源
cd /Users/andrew/ClaudeProjects/小喵
cp app.js styles.css index.html sw.js manifest.json breeds.js knowledge.js config.js version.json www/
cp app.js styles.css index.html sw.js manifest.json breeds.js knowledge.js config.js version.json android/app/src/main/assets/public/

# 2. 编译
cd android
export JAVA_HOME=~/jdk21/Contents/Home
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$PATH

./gradlew assembleRelease

# 3. 命名 + 拷贝
VERSION=$(grep versionName app/build.gradle | awk '{print $2}' | tr -d '"')
cd ..
cp android/app/build/outputs/apk/release/app-release.apk "小喵成长记-${VERSION}.apk"

echo "✅ Done: 小喵成长记-${VERSION}.apk"
```
