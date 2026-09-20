package com.andrew.xiaomiao;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Native Upload Plugin — Capacitor 自定义插件
 *
 * 背景：Android WebView 83 (Chromium 83, 2020年) 上所有 POST 都不可靠：
 *   - fetch POST：body 被丢 / 整个抛 Failed to fetch
 *   - XHR POST multipart / form-urlencoded：抛错
 *   - iframe + form：跨域被拦
 * GET+base64 在 <50KB URL 时能用，但大图会被 CF Pages Function URL 长度上限挡住。
 *
 * 解决：用原生 Java HttpURLConnection 调 POST，body 是 base64 编码的图片字节。
 * JS 端把 Blob 转 base64 调本插件，绕开 WebView 所有 POST bug。
 *
 * 方法：
 *   post({url, bodyBase64, contentType}) → {status, body}
 *
 * 诊断模式（v2.4.5+）：
 *   post({echoOnly: '1', bodyBase64: 'A'.repeat(N), url: 'https://x'}) → {receivedLength, decodedLength}
 *   用于探测 Capacitor 桥（WebMessageListener / @JavascriptInterface）对大字符串的处理上限。
 *   不做实际网络请求，直接返回 JS 看到的字符串长度 + Java 解码后的字节数。
 */
@CapacitorPlugin(name = "NativeUpload")
public class NativeUploadPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        android.util.Log.i("NativeUpload", "Plugin loaded, ready to handle POST");
    }

    @PluginMethod
    public void post(final PluginCall call) {
        android.util.Log.i("NativeUpload", "post() called");
        final String url = call.getString("url");
        final String bodyBase64 = call.getString("bodyBase64");
        final String contentType = call.getString("contentType", "application/octet-stream");
        android.util.Log.i("NativeUpload", "post() parsed url=" + (url != null ? url.substring(0, Math.min(60, url.length())) : "null") + " bodyBase64.len=" + (bodyBase64 != null ? bodyBase64.length() : "null") + " echoOnly=" + call.getString("echoOnly"));

        if (url == null || bodyBase64 == null) {
            call.reject("url 和 bodyBase64 必填");
            return;
        }

        // ===== 诊断模式：只回显收到的字符串长度，不发 HTTP 请求 =====
        // 用于探测 Capacitor 桥（WebMessageListener / addJavascriptInterface）能传多大字符串。
        if (call.getString("echoOnly") != null) {
            int receivedLength = bodyBase64.length();
            int decodedLength;
            String decodeError = null;
            try {
                byte[] bodyBytes = android.util.Base64.decode(bodyBase64, android.util.Base64.DEFAULT);
                decodedLength = bodyBytes.length;
            } catch (Exception e) {
                decodedLength = -1;
                decodeError = e.getClass().getSimpleName() + ": " + e.getMessage();
                android.util.Log.e("NativeUpload", "诊断模式 Base64 解码失败 receivedLength=" + receivedLength, e);
            }
            android.util.Log.i("NativeUpload",
                "DIAG echoOnly: url=" + url
                + " receivedLength=" + receivedLength
                + " decodedLength=" + decodedLength
                + (decodeError != null ? " decodeError=" + decodeError : ""));

            JSObject ret = new JSObject();
            ret.put("status", 200);
            ret.put("body", "ok");
            ret.put("contentType", "text/plain");
            ret.put("receivedLength", receivedLength);
            ret.put("decodedLength", decodedLength);
            ret.put("echoOnly", true);
            if (decodeError != null) ret.put("decodeError", decodeError);
            call.resolve(ret);
            return;
        }

        // 异步执行（不能在主线程做网络 IO）
        new Thread(() -> {
            try {
                // 用 android.util.Base64（兼容 API 24+，java.util.Base64.getDecoder() 需要 API 26+）
                byte[] bodyBytes = android.util.Base64.decode(bodyBase64, android.util.Base64.DEFAULT);

                // 用 OkHttp 替代 HttpURLConnection（在 Android 7 上稳定，HttpURLConnection 已知 bug）
                OkHttpClient client = new OkHttpClient.Builder()
                        .connectTimeout(15, TimeUnit.SECONDS)
                        .readTimeout(30, TimeUnit.SECONDS)
                        .writeTimeout(30, TimeUnit.SECONDS)
                        .retryOnConnectionFailure(true)
                        .build();

                MediaType mediaType = MediaType.parse(contentType + "; charset=utf-8");
                RequestBody reqBody = RequestBody.create(bodyBytes, mediaType);

                Request request = new Request.Builder()
                        .url(url)
                        .post(reqBody)
                        .build();

                android.util.Log.i("NativeUpload", "OkHttp POST start url=" + url + " bodyLen=" + bodyBytes.length);

                try (Response response = client.newCall(request).execute()) {
                    int status = response.code();
                    ResponseBody respBody = response.body();
                    String respString = respBody != null ? respBody.string() : "";
                    String respContentType = response.header("Content-Type");
                    if (respContentType == null) respContentType = "";

                    android.util.Log.i("NativeUpload", "OkHttp POST done status=" + status + " bodyLen=" + respString.length());

                    JSObject ret = new JSObject();
                    ret.put("status", status);
                    ret.put("body", respString);
                    ret.put("contentType", respContentType);
                    call.resolve(ret);
                }
            } catch (Exception e) {
                android.util.Log.e("NativeUpload", "POST failed: " + e.getClass().getSimpleName() + ": " + e.getMessage(), e);
                call.reject("Native POST failed: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            }
        }).start();
    }
}
