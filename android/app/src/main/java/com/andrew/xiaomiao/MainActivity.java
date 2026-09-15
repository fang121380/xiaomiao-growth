package com.andrew.xiaomiao;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  /**
   * 重写系统返回按钮 / 边缘滑动返回手势：
   * 1. 先让 WebView 处理（history.back() 会触发 JS 里 sheet/modal 关闭逻辑）
   * 2. WebView 没有可后退历史时再走默认（退出 App）
   *
   * 这样：
   *   - sheet/modal 打开时返回 → 关掉 sheet/modal
   *   - 普通 tab 间 → 切回上一个 tab
   *   - 在首页 → 退出 App（合理）
   */
  @Override
  public void onBackPressed() {
    WebView webView = this.bridge.getWebView();
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
    } else {
      super.onBackPressed();
    }
  }
}
