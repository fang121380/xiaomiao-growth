/* ====================================================================
 *  Cloudflare Pages Function: /api/vision
 *  目的：处理视觉问答（带图片消息）
 *
 *  关键约束：Android WebView Chromium 83 在 Capacitor remote-loaded 模式下
 *  所有 POST 路径都坏（fetch POST 空 body / fetch POST multipart 抛错 /
 *  XHR POST multipart 也抛错）。所以统一走 GET + ?d=base64(payload) 通道
 *  —— 跟 /api/deepseek 一样。
 *
 *  请求载荷结构（base64 之前）：
 *    {
 *      model: "deepseek-v4-flash",
 *      system: "<system prompt>",
 *      messages: [{ role: "user", content: [
 *        { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } },
 *        { type: "text", text: "..." }
 *      ]}],
 *      temperature: 0.2,
 *      max_tokens: 1000
 *    }
 *
 *  响应：与 /api/deepseek 一致（DeepSeek raw JSON）
 *  ==================================================================== */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestGet(context) {
  try {
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonError(500, '服务端未配置 DEEPSEEK_API_KEY 环境变量');
    }

    // 解析 body：跟 /api/deepseek 一样，从 GET ?d=base64 还原
    const url = new URL(context.request.url);
    const d = url.searchParams.get('d');
    if (!d) {
      return jsonError(400, '请求体为空（GET ?d=... 缺失）');
    }
    let body;
    try {
      body = decodeURIComponent(escape(atob(d)));
    } catch (_) {
      body = '';
    }
    if (!body) {
      return jsonError(400, '请求体为空（base64 解码失败）');
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (parseErr) {
      return jsonError(400, '请求体不是合法 JSON: ' + parseErr.message);
    }
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
    const system = (parsed.system || '').toString();
    if (system) {
      messages.unshift({ role: 'system', content: system });
    }

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: parsed.model || 'deepseek-v4-flash',
        messages,
        temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.2,
        max_tokens: parsed.max_tokens || 1000,
      }),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return jsonError(500, 'vision 代理错误: ' + (err.message || String(err)));
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
