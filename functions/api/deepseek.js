/* ====================================================================
 *  Cloudflare Pages Function: /api/deepseek
 *  目的：作为 DeepSeek API 的同源代理，避免 Android WebView 跨域 POST 拦截
 *
 *  Android System WebView 对跨源 fetch POST 会做严格 CORS 拦截，
 *  即使 API 服务端返回了正确的 CORS 头，部分 WebView 版本仍会
 *  抛 "Failed to fetch"。把请求通过同源的 CF Pages Function 转发
 *  即可绕开这个问题（同源请求无 CORS）。
 *
 *  ⚠️ API key 直接硬编码（用户自己用，不分发）。
 *  切勿把这段代码部署到公开站点。
 * ==================================================================== */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

export async function onRequestPost(context) {
  try {
    // API key 从 CF Pages 环境变量读取（不在代码里硬编码，避免被 GitHub 拦截）
    // 配置位置：CF Dashboard → Pages → 项目 → Settings → Environment variables
    //   变量名：DEEPSEEK_API_KEY
    //   变量值：你的 DeepSeek API key
    const apiKey = context.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: { message: '服务端未配置 DEEPSEEK_API_KEY 环境变量' },
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const upstream = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || DEFAULT_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        // 允许所有源（CORS 友好，虽然是同源调用）
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: { message: '代理错误: ' + err.message },
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 处理 OPTIONS preflight（CORS 预检）
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
