// POST /api/order  { tier: 499|999|1499, cta, utm: {...} }  → Diagnosis Call
// POST /api/order  { product: 'audit', name, email, phone, cta, utm }  → Executive Voice Audit (₹1,999)
// Creates a Razorpay order for the chosen tier and returns what Checkout needs.

// Shared helpers for the Razorpay API. Keys come from Cloudflare environment
// variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) and never reach the browser,
// except the public key id, which Razorpay Checkout needs.

const TIERS = { 499: 49900, 999: 99900, 1499: 149900 }; // rupees -> paise
const AUDIT_PAISE = 199900; // Executive Voice Audit, ₹1,999

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

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ error: 'not_configured' }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }

  const isAudit = body.product === 'audit';
  const amount = isAudit ? AUDIT_PAISE : TIERS[String(body.tier)];
  if (!amount) return json({ error: 'invalid_tier' }, 400);

  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
  const notes = isAudit
    ? { product: 'Executive Voice Audit', tier: 'audit', cta: clip(body.cta, 40),
        name: clip(body.name, 80), email: clip(body.email, 120), phone: clip(body.phone, 20) }
    : { product: 'Diagnosis Call', tier: String(body.tier), cta: clip(body.cta, 40) };
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (utm[k]) notes[k] = clip(utm[k], 200);
  }

  const r = await rzp(env, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: (isAudit ? 'audit_' : 'diag_') + Date.now(),
      notes,
    }),
  });
  if (!r.ok) return json({ error: 'razorpay', detail: r.body?.error?.description || r.status }, 502);

  return json({
    order_id: r.body.id,
    amount: r.body.amount,
    currency: r.body.currency,
    key_id: env.RAZORPAY_KEY_ID,
  });
}
