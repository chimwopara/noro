// ═══════════════════════════════════════════════════════════
//  NoroTouch — Cloudflare Worker (API proxy)
//
//  Deploy at: Cloudflare Dashboard → Workers → Create
//  Bind to:   api.norotouch.com  (or workers.dev subdomain)
//
//  Environment variables to set in Worker settings:
//    GAS_URL    — your full Google Apps Script web app URL
//    API_SECRET — any long random string (match Script Properties in GAS)
//
//  index.html points to THIS Worker URL, never to GAS directly.
//  GAS_URL and API_SECRET never leave the server.
// ═══════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://norotouch.com',
  'https://www.norotouch.com',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(corsOrigin),
      });
    }

    // Rate limit: max 30 requests per minute per IP
    const ip     = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ratKey = `rate:${ip}`;
    const count  = ((await env.KV?.get(ratKey)) || 0) * 1;
    if (count >= 30) {
      return json({ success: false, error: 'Too many requests' }, 429, corsOrigin);
    }
    if (env.KV) {
      await env.KV.put(ratKey, String(count + 1), { expirationTtl: 60 });
    }

    const GAS_URL    = env.GAS_URL;
    const API_SECRET = env.API_SECRET;

    if (!GAS_URL) return json({ success: false, error: 'Worker misconfigured' }, 500, corsOrigin);

    let gasResponse;

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { body = {}; }

      // Inject secret server-side — client never sees it
      const payload = JSON.stringify({ ...body, secret: API_SECRET });

      gasResponse = await fetch(GAS_URL, {
        method:   'POST',
        headers:  { 'Content-Type': 'application/json' },
        body:     payload,
        redirect: 'follow',
      });

    } else {
      // GET — pass through query params and inject secret
      const url    = new URL(request.url);
      const params = new URLSearchParams(url.search);
      params.set('secret', API_SECRET);

      gasResponse = await fetch(`${GAS_URL}?${params.toString()}`, {
        redirect: 'follow',
      });
    }

    const text = await gasResponse.text();
    return new Response(text, {
      status: gasResponse.ok ? 200 : gasResponse.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(corsOrigin),
      },
    });
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
