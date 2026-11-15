// Meta Conversions API (server-side events).
// The browser pixel misses buyers whose in-app browser dies after paying. The server
// sends the same Purchase with the same event_id (the Razorpay payment id), so Meta
// counts each payment once, whichever copy arrives.
//
// Setup (Cloudflare Pages → Settings → Variables and secrets):
//   META_CAPI_TOKEN  — Events Manager → dataset "ISFCM Website" → Settings →
//                      Conversions API → Generate access token. Secret.
//   META_PIXEL_ID    — optional, defaults to 3715194611950305.
//   META_TEST_CODE   — optional, set only while checking in Events Manager → Test events.
// With no token, nothing is sent and nothing breaks.

const PIXEL = '3715194611950305';
const API = 'https://graph.facebook.com/v21.0/';

async function sha256(v) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Razorpay fills a missing email with void@razorpay.com; that is not the buyer.
export function realEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/@razorpay\.com$/.test(e) ? e : '';
}

// Indian numbers as 91XXXXXXXXXX, others as given (digits only).
export function phoneDigits(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  if (d.length === 12 && d.startsWith('91')) return d;
  return d.length >= 8 ? d : '';
}

// Hashes what Meta wants hashed; leaves ip / user agent / fbp / fbc as they are.
export async function userData(u) {
  const out = {};
  const em = realEmail(u.email);
  const ph = phoneDigits(u.phone);
  const parts = String(u.name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (em) out.em = [await sha256(em)];
  if (ph) { out.ph = [await sha256(ph)]; out.external_id = [await sha256(ph.slice(-10))]; }
  if (parts[0]) out.fn = [await sha256(parts[0])];
  if (parts.length > 1) out.ln = [await sha256(parts[parts.length - 1])];
  out.country = [await sha256('in')];
  if (u.ip) out.client_ip_address = u.ip;
  if (u.ua) out.client_user_agent = u.ua;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

// events: [{ event_name, event_time, event_id, event_source_url, user_data, custom_data }]
// Returns 'sent', 'off' (no token) or 'error:<detail>'. Never throws.
export async function sendEvents(env, events) {
  const token = (env.META_CAPI_TOKEN || '').trim();
  if (!token) return 'off';
  const body = { data: events.map((e) => ({ action_source: 'website', ...e })) };
  if (env.META_TEST_CODE) body.test_event_code = env.META_TEST_CODE;
  try {
    const r = await fetch(API + (env.META_PIXEL_ID || PIXEL) + '/events?access_token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) return 'sent';
    const t = await r.text();
    return 'error:' + r.status + ' ' + t.slice(0, 150);
  } catch (e) {
    return 'error:' + String(e).slice(0, 150);
  }
}

// Browser identifiers for a request: Meta cookies, IP, user agent.
export function browserIds(request) {
  const cookie = request.headers.get('cookie') || '';
  const get = (n) => { const m = cookie.match(new RegExp('(?:^|;\\s*)' + n + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; };
  return {
    fbp: get('_fbp'),
    fbc: get('_fbc'),
    ip: request.headers.get('cf-connecting-ip') || '',
    ua: request.headers.get('user-agent') || '',
  };
}
