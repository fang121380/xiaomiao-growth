package com.andrew.xiaomao;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  /**
   * 重写系统返回按钮 / 边缘滑动返回手势：
   * 1. 先调 JS 的 window.__xiaomiaoBack() —— JS 内部按层级返回
   *    (sheet/modal → 关闭；assistant chat → 退出 chat；timeline filter → 重置；
   *     非首页 → 切回首页；首页 → 第一次 toast 提示，第二次才允许退出)
   * 2. JS 返回 false 才走默认退出 App
   *
   * 这样用户在任何层级滑动返回，都能一级一级返回，而不是直接退到桌面。
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
            // JS 没消费 → 走默认（退出 App）
            MainActivity.super.onBackPressed();
          }
          // 否则 JS 已消费，不退出
        }
      );
      return;
    }
    super.onBackPressed();
  }
}
