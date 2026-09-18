/* ====================================================================
 *  Cloudflare Pages Function: /api/deepseek
 *  目的：作为 DeepSeek API 的同源代理，避免 Android WebView 跨域 POST 拦截
 *
 *  Android System WebView 对跨源 fetch POST 会做严格 CORS 拦截，
 *  即使 API 服务端返回了正确的 CORS 头，部分 WebView 版本仍会
 *  抛 "Failed to fetch"。把请求通过同源的 CF Pages Function 转发
 *  即可绕开这个问题（同源请求无 CORS）。
 *
 *  另外：Android WebView Chromium 83 在 Capacitor remote-loaded 模式下
 *  fetch POST 的 body 会被丢弃（CF 收到 Content-Length=0 + 空 body），
 *  所以也支持 GET + ?d=base64(query) 作为备用通道。
 *  ==================================================================== */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestPost(context) {
  return handle(context);
}

export async function onRequestGet(context) {
  return handle(context);
}

async function handle(context) {
  try {
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonError(500, '服务端未配置 DEEPSEEK_API_KEY 环境变量');
    }

    // 解析 body：优先 POST body，为空则从 GET ?d=base64 还原
    let body = await context.request.text();
    if (!body) {
      const url = new URL(context.request.url);
      const d = url.searchParams.get('d');
      if (d) {
        try {
          body = decodeURIComponent(escape(atob(d)));
        } catch (_) {
          body = '';
        }
      }
    }
    if (!body) {
      return jsonError(400, '请求体为空，请检查客户端是否正确发送 POST body 或 GET ?d=...');
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (parseErr) {
      return jsonError(400, '请求体不是合法 JSON: ' + parseErr.message + ' (raw: ' + body.slice(0, 200) + ')');
    }
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: parsed.model || DEFAULT_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 700,
        stream: parsed.stream === true,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // 流式：把 upstream.body 直接 pipe 给客户端（SSE 格式）
    if (parsed.stream === true) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...CORS_HEADERS,
        },
      });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    return jsonError(500, '代理错误: ' + err.message);
  }
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// 处理 OPTIONS preflight（CORS 预检）
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}