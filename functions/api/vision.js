/* ====================================================================
 *  Cloudflare Pages Function: /api/vision
 *  目的：专门处理「带图」消息的视觉问答
 *
 *  关键约束：Android WebView Chromium 83 在 Capacitor remote-loaded 模式下
 *  fetch POST 不发 body（Content-Length=0 但 DevTools 显示 postData 有内容）。
 *  但 multipart/form-data 的 body 在大多数 webview 版本下是能正常发的
 *  （浏览器/WebView 都正确处理 multipart boundary + Content-Length）。
 *
 *  流程：
 *    1. 前端用 FormData 把图片 + 文本 + model + system 一起 POST
 *    2. CF Function 收到后用 request.formData() 解析
 *    3. 图片转 base64 dataURL → 拼成 vision message → POST 给 DeepSeek
 *
 *  请求（multipart/form-data fields）：
 *    - text     : 用户问的文本
 *    - model    : 'deepseek-v4-flash'（默认）
 *    - system   : system prompt（前端组装好传过来）
 *    - temp     : temperature（默认 0.2）
 *    - max_tokens : 默认 1000
 *    - images   : 一个或多个图片文件（image/*）
 *
 *  响应：与 /api/deepseek 一致（DeepSeek raw JSON）
 *  ==================================================================== */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonError(500, '服务端未配置 DEEPSEEK_API_KEY 环境变量');
    }

    const form = await context.request.formData();
    const text = (form.get('text') || '').toString();
    const model = (form.get('model') || 'deepseek-v4-flash').toString();
    const system = (form.get('system') || '').toString();
    const temperature = Number(form.get('temp') || '0.2');
    const maxTokens = Number(form.get('max_tokens') || '1000');

    // 收集所有图片
    const images = form.getAll('images').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);

    if (images.length === 0 && !text) {
      return jsonError(400, '请求体为空（既无文字也无图片）');
    }

    // 构造 vision message content
    const contentParts = [];
    for (const img of images) {
      const buf = await img.arrayBuffer();
      // 用最简 base64 编码（CF Workers BLOB → base64）
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const mime = (img.type || 'image/jpeg').split(';')[0];
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${mime};base64,${b64}` },
      });
    }
    if (text) {
      contentParts.push({ type: 'text', text });
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: contentParts });

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const body = await upstream.text();
    return new Response(body, {
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
