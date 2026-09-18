/* ====================================================================
 *  Cloudflare Pages Function: /api/vision
 *  目的：处理视觉问答（带图片消息）
 *
 *  两套通道：
 *  1) GET + ?d=base64(payload)：兼容老调用，但 CF URL 有 ~50KB 上限，
 *     图片一大就返回空 → WebView 报 Failed to fetch。仅作 fallback。
 *  2) POST multipart/form-data：主通道。Android WebView 83 的 fetch POST
 *     multipart 会整个抛 Failed to fetch，所以客户端必须用 XMLHttpRequest
 *     发（XHR multipart 是好的）。服务端 CF Pages Functions 原生支持
 *     request.formData() 解析。
 *
 *  multipart 表单字段：
 *    model, system, text, temperature, max_tokens（文本）
 *    image（可多个，二进制文件）
 *
 *  响应：与 /api/deepseek 一致（DeepSeek raw JSON）
 *  ==================================================================== */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestPost(context) {
  return handlePost(context);
}

export async function onRequestGet(context) {
  return handleGet(context);
}

async function handlePost(context) {
  try {
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonError(500, '服务端未配置 DEEPSEEK_API_KEY 环境变量');
    }

    const contentType = (context.request.headers.get('content-type') || '').toLowerCase();
    let model, system, text, temperature, maxTokens, imageContent;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // 主通道：XHR POST + form-urlencoded，绕开 WebView 83 multipart bug
      const body = await context.request.text();
      const params = new URLSearchParams(body);
      model = (params.get('model') || 'deepseek-v4-flash').toString();
      system = (params.get('system') || '').toString();
      text = (params.get('text') || '').toString();
      temperature = parseFloat(params.get('temperature') || '0.2') || 0.2;
      maxTokens = parseInt(params.get('max_tokens') || '1000', 10) || 1000;
      const imagesJson = params.get('images') || '[]';
      let imageParts;
      try { imageParts = JSON.parse(imagesJson); }
      catch (_) { return jsonError(400, 'images 字段不是合法 JSON'); }
      if (!Array.isArray(imageParts) || imageParts.length === 0) {
        return jsonError(400, '缺少图片（images 字段）');
      }
      imageContent = imageParts.map((p) => ({
        type: 'image_url',
        image_url: { url: `data:${p.mime || 'image/jpeg'};base64,${p.b64}` },
      }));
    } else {
      // multipart 通道（备用，可能在某些 WebView 上失败）
      const formData = await context.request.formData();
      model = (formData.get('model') || 'deepseek-v4-flash').toString();
      system = (formData.get('system') || '').toString();
      text = (formData.get('text') || '').toString();
      temperature = parseFloat(formData.get('temperature') || '0.2') || 0.2;
      maxTokens = parseInt(formData.get('max_tokens') || '1000', 10) || 1000;
      const images = formData.getAll('image');
      if (images.length === 0) {
        return jsonError(400, '缺少图片（multipart 字段 image）');
      }
      imageContent = [];
      for (const img of images) {
        if (typeof img === 'string') continue;
        const arrayBuffer = await img.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let bin = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        const b64 = btoa(bin);
        const mime = img.type || 'image/jpeg';
        imageContent.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } });
      }
    }
    if (text) imageContent.push({ type: 'text', text });

    const messages = [{ role: 'user', content: imageContent }];
    if (system) messages.unshift({ role: 'system', content: system });

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

    const respText = await upstream.text();
    return new Response(respText, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return jsonError(500, 'vision POST 代理错误: ' + (err.message || String(err)));
  }
}

async function handleGet(context) {
  try {
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonError(500, '服务端未配置 DEEPSEEK_API_KEY 环境变量');
    }

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
    return jsonError(500, 'vision GET 代理错误: ' + (err.message || String(err)));
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
