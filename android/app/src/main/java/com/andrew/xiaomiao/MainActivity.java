package com.andrew.xiaomiao;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {

  private long currentDownloadId = -1;

  /**
   * 重写系统返回按钮 / 边缘滑动返回手势：
   * 1. 先调 JS 的 window.__xiaomiaoBack() —— JS 内部按层级返回
   * 2. JS 返回 false 才走默认退出 App
   */
  @Override
  public void onBackPressed() {
    WebView webView = this.bridge.getWebView();
    if (webView != null) {
      webView.evaluateJavascript(
        "(function() { " +
        "  try { " +
        "    if (window.__xiaomiaoBack) { " +
        "      return window.__xiaomiaoBack() ? '1' : '0'; " +
        "    } " +
        "  } catch (e) {} " +
        "  return '0'; " +
        "})()",
        value -> {
          if ("\"0\"".equals(value) || "0".equals(value)) {
            MainActivity.super.onBackPressed();
          }
        }
      );
      return;
    }
    super.onBackPressed();
  }

  /**
   * 给 WebView 加下载监听：JS 里 <a download href="apk-url"> 触发这里
   * → 用系统 DownloadManager 下载到 /Download/
   * → 下载完成后自动调起系统安装
   *
   * 这是用户期望的"App 内一键更新"的关键：
   *   - 弹"有新版本"提示（JS 处理）
   *   - 用户点"立即更新"（JS 处理）
   *   - 后台下载 APK（这里）
   *   - 下载完调起安装（这里）
   *   - 用户点"安装"完成升级（系统强制要求）
   */
  @Override
  public void onStart() {
    super.onStart();
    WebView webView = this.bridge.getWebView();
    if (webView == null) return;

    webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
      // 只处理 APK 下载，其他文件类型交给系统默认行为
      if (!"application/vnd.android.package-archive".equals(mimetype)
          && !url.toLowerCase().endsWith(".apk")) {
        return;
      }

      try {
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setMimeType("application/vnd.android.package-archive");

        // 提取文件名
        final String fileName;
        String fn = "xiaomiao-update.apk";
        if (contentDisposition != null) {
          int idx = contentDisposition.indexOf("filename=");
          if (idx >= 0) {
            String raw = contentDisposition.substring(idx + 9).replace("\"", "").trim();
            int semi = raw.indexOf(';');
            if (semi > 0) raw = raw.substring(0, semi);
            fn = raw;
          }
        }
        fileName = fn;

        request.setTitle("小喵成长记 更新");
        request.setDescription("下载完成后会自动安装");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
        // Android 11+ 需要这一行才允许在 DownloadManager 里直接访问
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          request.setAllowedOverMetered(true);
        }

        // 带 cookie（CF Pages 不需要，但保留通用性）
        String cookies = CookieManager.getInstance().getCookie(url);
        request.addRequestHeader("Cookie", cookies);
        request.addRequestHeader("User-Agent", userAgent);

        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (dm == null) return;
        currentDownloadId = dm.enqueue(request);

        // 注册广播：下载完成时调起安装
        BroadcastReceiver receiver = new BroadcastReceiver() {
          @Override
          public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id == currentDownloadId) {
              Uri apkUri;
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Android 7+ 用 content:// URI
                apkUri = dm.getUriForDownloadedFile(id);
              } else {
                File apkFile = new File(Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS), fileName);
                apkUri = Uri.fromFile(apkFile);
              }
              Intent install = new Intent(Intent.ACTION_VIEW);
              install.setDataAndType(apkUri, "application/vnd.android.package-archive");
              install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                  | Intent.FLAG_GRANT_READ_URI_PERMISSION);
              try {
                context.startActivity(install);
              } catch (Exception e) {
                android.util.Log.e("XiaomiaoUpdate", "安装 Intent 失败: " + e.getMessage());
              }
            }
            try {
              context.unregisterReceiver(this);
            } catch (Exception ignored) {}
          }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
          registerReceiver(receiver, filter);
        }
      } catch (Exception e) {
        android.util.Log.e("XiaomiaoUpdate", "下载失败: " + e.getMessage(), e);
      }
    });
  }
}
