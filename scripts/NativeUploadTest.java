/*
 * NativeUploadTest.java
 *
 * 离线验证 NativeUploadPlugin 的核心逻辑：
 *   1) Base64 解码（用 java.util.Base64，Android < 8 没有 java.util.Base64 那是另外一回事）
 *   2) HttpURLConnection POST
 *   3) 响应读取（UTF-8 字符串）
 *
 * 这个测试文件用普通 javac 编译，不依赖 Android SDK，
 * 用以在 JS 改版 / 插件改动前快速验证"裸"网络路径仍然 OK。
 *
 * 跑法：
 *   cd /Users/andrew/ClaudeProjects/小喵/scripts
 *   javac NativeUploadTest.java
 *   java NativeUploadTest
 *
 * 不依赖任何测试框架，纯 stdout PASS/FAIL。
 */

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Base64;

public class NativeUploadTest {

    // 真实部署的 Pages Function 端点
    private static final String VISION_URL =
            "https://xiaomiao-toh.pages.dev/api/vision";
    private static final String DEEPSEEK_URL =
            "https://xiaomiao-toh.pages.dev/api/deepseek";

    private static int passCount = 0;
    private static int failCount = 0;
    private static String currentTest = "";

    // --------------------------------------------------------------------
    // 工具：和 NativeUploadPlugin.post() 行为完全一致的 POST
    // （区别：插件用 android.util.Base64；这里用 java.util.Base64）
    // --------------------------------------------------------------------
    static class UploadResult {
        int status;
        String body;
        String contentType;
        String error; // null 表示无 error
        UploadResult(int s, String b, String c, String e) {
            status = s; body = b; contentType = c; error = e;
        }
    }

    static UploadResult doPost(String urlStr, String bodyBase64, String contentType)
            throws Exception {
        HttpURLConnection conn = null;
        try {
            // 关键路径 —— 这里用 java.util.Base64 模拟 android.util.Base64.DEFAULT
            byte[] bodyBytes = Base64.getDecoder().decode(bodyBase64);

            URL u = new URL(urlStr);
            conn = (HttpURLConnection) u.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setUseCaches(false);
            conn.setRequestProperty("Content-Type", contentType);
            conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setFixedLengthStreamingMode(bodyBytes.length);

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
            String respContentType = conn.getContentType() != null
                    ? conn.getContentType() : "";

            return new UploadResult(status, respBody, respContentType, null);
        } catch (Exception e) {
            return new UploadResult(-1, "", "",
                    e.getClass().getSimpleName() + ": " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readAll(InputStream is) throws Exception {
        if (is == null) return "";
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = is.read(buf)) > 0) baos.write(buf, 0, n);
        is.close();
        return baos.toString("UTF-8");
    }

    // --------------------------------------------------------------------
    // 测试框架
    // --------------------------------------------------------------------
    private static void check(String name, boolean cond, String detail) {
        currentTest = name;
        if (cond) {
            passCount++;
            System.out.println("[PASS] " + name + (detail.isEmpty() ? "" : "  -- " + detail));
        } else {
            failCount++;
            System.out.println("[FAIL] " + name + (detail.isEmpty() ? "" : "  -- " + detail));
        }
    }

    private static String truncate(String s, int n) {
        if (s == null) return "(null)";
        s = s.replaceAll("\\s+", " ");
        return s.length() > n ? s.substring(0, n) + "..." : s;
    }

    // --------------------------------------------------------------------
    // 主流程
    // --------------------------------------------------------------------
    public static void main(String[] args) throws Exception {
        System.out.println("==========================================================");
        System.out.println("NativeUploadTest — verifying plugin core logic vs real CF Pages Function");
        System.out.println("Time: " + new java.util.Date());
        System.out.println("Java: " + System.getProperty("java.version"));
        System.out.println("==========================================================\n");

        // 准备测试图：用 /tmp/blue.png（71 字节纯色 PNG，最快最省）
        File testImage = new File("/tmp/blue.png");
        if (!testImage.exists()) {
            System.err.println("FATAL: /tmp/blue.png missing; test cannot proceed.");
            System.exit(2);
        }
        byte[] imageBytes = Files.readAllBytes(testImage.toPath());
        String imageB64 = Base64.getEncoder().encodeToString(imageBytes);
        System.out.println("Test image: /tmp/blue.png  size=" + imageBytes.length
                + " bytes  b64Len=" + imageB64.length() + "\n");

        // ============================================================
        // Test 1: 真实图 + 合法 model + URL params → 应 200，body 含 "choices"
        // ============================================================
        {
            String url = VISION_URL + "?model=deepseek-flash"
                    + "&system=" + URLEncoder.encode("你是小喵", "UTF-8")
                    + "&text=" + URLEncoder.encode("描述这张图片", "UTF-8")
                    + "&temperature=0.2&max_tokens=80";
            UploadResult r = doPost(url, imageB64, "image/png");
            System.out.println("--- Test 1: happy path (real image, valid model) ---");
            System.out.println("URL:    " + url);
            System.out.println("CT:     image/png");
            System.out.println("Status: " + r.status);
            System.out.println("Body:   " + truncate(r.body, 400));
            if (r.error != null) System.out.println("Error:  " + r.error);

            check("T1 status==200", r.status == 200,
                    "status=" + r.status + " (want 200)");
            check("T1 body has 'choices'", r.body.contains("\"choices\""),
                    "looks like DeepSeek JSON");
            check("T1 body has model=deepseek-flash", r.body.contains("deepseek-flash"),
                    "upstream echoed model name");
            check("T1 no error field", !r.body.contains("\"error\""),
                    "no DeepSeek error in body");
            System.out.println();
        }

        // ============================================================
        // Test 2: 空 body —— 应该被服务端 400 拒绝，插件读 errorStream 不崩
        // ============================================================
        {
            // 用空字节数组的 base64 = ""
            String url = VISION_URL + "?model=deepseek-flash&text=hi&max_tokens=20";
            UploadResult r = doPost(url, "", "image/jpeg");
            System.out.println("--- Test 2: empty body ---");
            System.out.println("Status: " + r.status);
            System.out.println("Body:   " + truncate(r.body, 300));

            check("T2 status==400", r.status == 400,
                    "status=" + r.status + " (want 400 empty body)");
            check("T2 body mentions empty/请求体",
                    r.body.contains("空") || r.body.contains("error"),
                    "got error message");
            System.out.println();
        }

        // ============================================================
        // Test 3: 非法 base64 —— 模拟 JS 端传脏数据
        // 期望：插件/测试代码抛 IllegalArgumentException，框架能 catch
        // 这就是 Base64 解码层会遇到的真实 bug
        // ============================================================
        {
            System.out.println("--- Test 3: invalid base64 ---");
            try {
                byte[] decoded = Base64.getDecoder().decode("!!!not_base64!!!");
                check("T3 throws on bad base64", false,
                        "expected IllegalArgumentException, got " + decoded.length + " bytes");
            } catch (IllegalArgumentException iae) {
                check("T3 throws on bad base64", true,
                        "IllegalArgumentException: " + truncate(iae.getMessage(), 80));
            } catch (Exception ex) {
                check("T3 throws on bad base64", false,
                        "wrong exception type: " + ex.getClass().getSimpleName());
            }
            System.out.println();
        }

        // ============================================================
        // Test 4: 模拟 4xx 响应（非法 model）—— DeepSeek 上游返回 400
        // 插件应该把 errorStream 完整读到 body
        // ============================================================
        {
            // 用一个合法 model 让请求过 CF gate，但用 max_tokens=0 让上游拒绝
            String url = VISION_URL + "?model=deepseek-flash&text=hi&max_tokens=0";
            UploadResult r = doPost(url, imageB64, "image/png");
            System.out.println("--- Test 4: HTTP 4xx from upstream ---");
            System.out.println("Status: " + r.status);
            System.out.println("Body:   " + truncate(r.body, 400));

            // max_tokens=0 可能被上游当作非法 → 400；也可能被静默接受 → 200
            // 关键是 status 必须是可读的，且 body 不为空
            check("T4 status is 200 or 4xx", (r.status == 200 || (r.status >= 400 && r.status < 600)),
                    "status=" + r.status);
            check("T4 body is non-empty", !r.body.isEmpty(),
                    "plugin read errorStream, len=" + r.body.length());
            System.out.println();
        }

        // ============================================================
        // Test 5: 拿一个根本不存在的端点 —— CF Pages Function 对未知
        // POST 路由返回 405（不是 404）。这是 CF 平台行为，不是 bug。
        // 关键是插件能读到 status+body 不崩。
        // ============================================================
        {
            System.out.println("--- Test 5: unknown POST path (CF 405 not 404) ---");
            String url = "https://xiaomiao-toh.pages.dev/api/this-does-not-exist";
            UploadResult r = doPost(url, imageB64, "image/jpeg");
            System.out.println("Status: " + r.status);
            System.out.println("Body:   " + truncate(r.body, 200));

            check("T5 status==405 (CF behavior)", r.status == 405,
                    "status=" + r.status + " (want 405)");
            System.out.println();
        }

        // ============================================================
        // Test 6: /api/deepseek 通道（纯文本对话）确认整套链路活着
        // ============================================================
        {
            String json = "{\"model\":\"deepseek-chat\",\"messages\":[{\"role\":\"user\",\"content\":\"say pong\"}]}";
            String b64 = Base64.getEncoder().encodeToString(
                    json.getBytes(StandardCharsets.UTF_8));
            UploadResult r = doPost(DEEPSEEK_URL, b64, "application/json");
            System.out.println("--- Test 6: /api/deepseek smoke ---");
            System.out.println("Status: " + r.status);
            System.out.println("Body:   " + truncate(r.body, 300));

            check("T6 status==200", r.status == 200, "status=" + r.status);
            check("T6 body has Pong", r.body.toLowerCase().contains("pong"),
                    "upstream replied");
            System.out.println();
        }

        // ============================================================
        // Test 7: 真实 JPEG（< 1MB）—— 验证 setFixedLengthStreamingMode
        // 对 base64 → 1.4MB 的 body 也能跑通整条链路
        // 注意 DeepSeek vision 有 ~1MB 上限（这是上游限制，非插件 bug）
        // ============================================================
        {
            File real = new File("/tmp/small_real.jpg");
            if (real.exists()) {
                byte[] realBytes = Files.readAllBytes(real.toPath());
                String realB64 = Base64.getEncoder().encodeToString(realBytes);
                String url = VISION_URL + "?model=deepseek-flash"
                        + "&text=" + URLEncoder.encode("这张图是什么", "UTF-8")
                        + "&max_tokens=60";
                UploadResult r = doPost(url, realB64, "image/jpeg");
                System.out.println("--- Test 7: real JPEG (~80KB) over the wire ---");
                System.out.println("Bytes:  " + realBytes.length);
                System.out.println("B64Len: " + realB64.length());
                System.out.println("Status: " + r.status);
                System.out.println("Body:   " + truncate(r.body, 300));

                check("T7 status==200", r.status == 200, "status=" + r.status);
                check("T7 body has model", r.body.contains("deepseek-flash"),
                        "upstream responded");
                System.out.println();
            } else {
                System.out.println("--- Test 7: SKIPPED (/tmp/small_real.jpg missing) ---\n");
            }
        }

        // ============================================================
        // 汇总
        // ============================================================
        System.out.println("==========================================================");
        System.out.println("RESULT: " + passCount + " passed, " + failCount + " failed");
        System.out.println("==========================================================");
        System.exit(failCount == 0 ? 0 : 1);
    }
}