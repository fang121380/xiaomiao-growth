#!/usr/bin/env bash
# 上传最新 APK 到蒲公英 (pgyer.com)
# 用法: 把 _api_key 填到下面，跑 ./upload-to-pgyer.sh
#
# 获取 key: 登录 pgyer.com → 「设置」→「API」→ 复制 _api_key

set -euo pipefail

# ========== 在这里填 ==========
API_KEY="__YOUR_PGYER_API_KEY__"
INSTALL_PASSWORD=""            # 留空 = 公开安装；填了 = 需要密码才能装
APP_NAME="小喵成长记"
# ==============================

# 自动找最新 APK（按文件名版本号排序，取最大）
APK_DIR="$(cd "$(dirname "$0")/../www" && pwd)"
APK_FILE="$(ls -1 "$APK_DIR"/xiaomiao-v*.apk 2>/dev/null | sort -V | tail -1)"

if [[ -z "$APK_FILE" ]]; then
  echo "❌ 没找到 APK，请先 cd android && ./gradlew assembleRelease"
  exit 1
fi

if [[ "$API_KEY" == "__YOUR_PGYER_API_KEY__" ]]; then
  echo "❌ 请先在脚本顶部填 _api_key"
  echo "   登录 pgyer.com → 设置 → API 拿 key"
  exit 1
fi

echo "📦 上传: $APK_FILE ($(du -h "$APK_FILE" | cut -f1))"

# 从文件名解析 versionName (xiaomiao-vX.Y.Z.apk)
VERSION_NAME="$(basename "$APK_FILE" .apk | sed -E 's/^xiaomiao-v(.*)$/\1/')"
echo "🏷  版本: $VERSION_NAME"

# 取 apk-version.json 里的 changelog 当更新说明
CHANGELOG=""
if [[ -f "$APK_DIR/apk-version.json" ]]; then
  CHANGELOG="$(node -e 'console.log(require("fs").readFileSync(process.argv[1],"utf8").match(/"changelog"\s*:\s*"([^"]*)"/)[1])' "$APK_DIR/apk-version.json" 2>/dev/null || true)"
fi

# 蒲公英：1=密码安装 2=公开安装
BUILD_INSTALL_TYPE=2
if [[ -n "$INSTALL_PASSWORD" ]]; then
  BUILD_INSTALL_TYPE=1
fi

# 构造 curl 命令
CURL_ARGS=(
  -sS
  -X POST "https://upload.pgyer.com/apiv2/app/upload"
  -F "_api_key=$API_KEY"
  -F "file=@$APK_FILE"
  -F "buildInstallType=$BUILD_INSTALL_TYPE"
  -F "buildName=$APP_NAME"
  -F "buildVersion=$VERSION_NAME"
)

if [[ -n "$INSTALL_PASSWORD" ]]; then
  CURL_ARGS+=( -F "buildPassword=$INSTALL_PASSWORD" )
fi
if [[ -n "$CHANGELOG" ]]; then
  # 中文 + 特殊字符安全处理
  CURL_ARGS+=( -F "buildUpdateDescription=$CHANGELOG" )
fi

RESPONSE="$(curl "${CURL_ARGS[@]}")"

# 解析返回
CODE="$(echo "$RESPONSE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).code)}catch(e){console.log(-1)}})')"

if [[ "$CODE" == "0" ]]; then
  echo ""
  echo "✅ 上传成功"
  echo "$RESPONSE" | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const d=JSON.parse(s).data;
      console.log("📱 短链: https://www.pgyer.com/" + d.appShortcutUrl);
      console.log("🔑 BuildKey: " + d.buildKey);
      console.log("📲 二维码: " + d.buildQRCodeURL);
    })'
else
  echo ""
  echo "❌ 上传失败 (code=$CODE)"
  echo "$RESPONSE"
  exit 1
fi