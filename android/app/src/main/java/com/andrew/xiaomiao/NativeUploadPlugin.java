package com.andrew.xiaomiao;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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
        final String url = call.getString("url");
        final String bodyBase64 = call.getString("bodyBase64");
        final String contentType = call.getString("contentType", "application/octet-stream");

        if (url == null || bodyBase64 == null) {
            call.reject("url 和 bodyBase64 必填");
            return;
        }

        // 异步执行（不能在主线程做网络 IO）
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                // 用 android.util.Base64（兼容 API 24+，java.util.Base64.getDecoder() 需要 API 26+）
                byte[] bodyBytes = android.util.Base64.decode(bodyBase64, android.util.Base64.DEFAULT);

                URL u = new URL(url);
                conn = (HttpURLConnection) u.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestProperty("Content-Type", contentType);
                conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setFixedLengthStreamingMode(bodyBytes.length);

                // 写 body
                OutputStream os = conn.getOutputStream();
                try {
                    os.write(bodyBytes);
                    os.flush();
                } finally {
                    os.close();
                }

                int status = conn.getResponseCode();
                InputStream is = (status >= 200 && status < 300)
                        ? conn.getInputStream()
                        : conn.getErrorStream();

                String respBody = readAll(is);
                String respContentType = conn.getContentType() != null ? conn.getContentType() : "";

                JSObject ret = new JSObject();
                ret.put("status", status);
                ret.put("body", respBody);
                ret.put("contentType", respContentType);
                call.resolve(ret);
            } catch (Exception e) {
                android.util.Log.e("NativeUpload", "POST failed: " + e.getMessage(), e);
                call.reject("Native POST failed: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    private String readAll(InputStream is) throws Exception {
        if (is == null) return "";
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = is.read(buf)) > 0) baos.write(buf, 0, n);
        is.close();
        return baos.toString("UTF-8");
    }
}