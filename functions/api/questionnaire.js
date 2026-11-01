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

// Apps Script web apps answer a POST with a 302 to script.googleusercontent.com,
// which must then be fetched with GET. Doing that step explicitly (instead of
// relying on automatic redirect handling) and reading the reply as text lets us
// report exactly what went wrong: wrong URL, access setting, or a script error.
async function callScript(url, init) {
  let r = await fetch(url, { ...init, redirect: 'manual' });
  let hops = 0;
  while ([301, 302, 303, 307, 308].includes(r.status) && hops < 4) {
    const loc = r.headers.get('location');
    if (!loc) break;
    r = await fetch(new URL(loc, url).toString(), { method: 'GET', redirect: 'manual' });
    hops++;
  }
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  return { status: r.status, data, text };
}

function diagnose(url, res) {
  if (/\/dev(\?|$)/.test(url)) return 'sheet_dev_url';                 // test URL, needs Google login
  if (res.data && res.data.ok === false) return 'sheet_script_error';   // doPost threw (see detail)
  if (!res.data && /accounts\.google|ServiceLogin|<html/i.test(res.text)) return 'sheet_access';
  if (res.status >= 400) return 'sheet_http_' + res.status;
  if (!res.data) return 'sheet_not_json';
  return null;
}

// GET /api/questionnaire → health check, safe to open in a browser.
export async function onRequestGet({ env }) {
  const url = (env.APPS_SCRIPT_URL || '').trim();
  if (!url) return json({ ok: false, error: 'not_configured', fix: 'Add APPS_SCRIPT_URL in Cloudflare and redeploy' });
  const shape = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) ? 'ok' : 'unexpected (should end in /exec)';
  let res;
  try { res = await callScript(url, { method: 'GET' }); }
  catch (e) { return json({ ok: false, error: 'sheet_unreachable', url_shape: shape, detail: String(e) }); }
  const err = diagnose(url, res);
  return json({ ok: !err, error: err, url_shape: shape, script_status: res.status, script_reply: res.data || clip(res.text, 200) });
}

export async function onRequestPost({ request, env }) {
  const SCRIPT = (env.APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT) return json({ ok: false, error: 'not_configured' }, 503);

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

  let res;
  try {
    res = await callScript(SCRIPT, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' }, // what Apps Script parses most reliably
      body: JSON.stringify(clean),
    });
  } catch (e) {
    return json({ ok: false, error: 'sheet_unreachable' }, 502);
  }
  const err = diagnose(SCRIPT, res);
  if (err) return json({ ok: false, error: err, detail: res.data?.error || clip(res.text, 160) }, 502);
  return json({ ok: true });
}
