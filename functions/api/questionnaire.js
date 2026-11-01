// POST /api/questionnaire  { ...answers, pid, oid }
// Validates the essentials and forwards the answers to the Google Apps Script
// web app (APPS_SCRIPT_URL), which appends a row to the Sheet and emails Gaurang.

// Shared helpers for the Razorpay API. Keys come from Cloudflare environment
// variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) and never reach the browser,
// except the public key id, which Razorpay Checkout needs.

const TIERS = { 499: 49900, 999: 99900, 1499: 149900 }; // rupees -> paise

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function configured(env) {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

async function rzp(env, path, init = {}) {
  const res = await fetch('https://api.razorpay.com/v1' + path, {
    ...init,
    headers: {
      authorization: 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET),
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  let body = {};
  try { body = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, body };
}

const clip = (v, n = 120) => (v == null ? '' : String(v).slice(0, n));

const REQUIRED = ['name', 'whatsapp', 'email', 'situation'];

export async function onRequestPost({ request, env }) {
  if (!env.APPS_SCRIPT_URL) return json({ ok: false, error: 'not_configured' }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_request' }, 400); }
  if (body.website) return json({ ok: true }); // honeypot: bots fill hidden fields

  for (const k of REQUIRED) {
    if (!body[k] || !String(body[k]).trim()) return json({ ok: false, error: 'missing_' + k }, 400);
  }

  // Keep only known-size string values; arrays (checkbox groups) become "a, b, c".
  const clean = { submitted_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (!/^[a-z0-9_]{1,40}$/.test(k) || k === 'website') continue;
    clean[k] = Array.isArray(v) ? clip(v.join(', '), 1000) : clip(v, 4000);
  }

  const r = await fetch(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(clean),
    redirect: 'follow',
  });
  let out = {};
  try { out = await r.json(); } catch (e) {}
  if (!r.ok || out.ok === false) return json({ ok: false, error: 'sheet' }, 502);
  return json({ ok: true });
}
