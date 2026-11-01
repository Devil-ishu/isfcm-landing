// GET /api/payment?pid=pay_xxx&oid=order_xxx
// Confirms the payment with Razorpay (the source of truth), captures it if it
// is only authorized, and returns the amount + contact details for the
// thank-you page (amount for the Purchase event, contact to prefill the form).

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

export async function onRequestGet({ request, env }) {
  if (!configured(env)) return json({ ok: false, error: 'not_configured' }, 503);

  const url = new URL(request.url);
  const pid = url.searchParams.get('pid') || '';
  const oid = url.searchParams.get('oid') || '';
  if (!/^pay_[A-Za-z0-9]{6,40}$/.test(pid)) return json({ ok: false, error: 'bad_pid' }, 400);

  let r = await rzp(env, '/payments/' + pid);
  if (!r.ok) return json({ ok: false, error: 'not_found' }, 404);
  let p = r.body;

  // When an order id is supplied it must match, so a payment id alone from
  // another product can't be passed off as a diagnosis-call purchase.
  if (oid && p.order_id !== oid) return json({ ok: false, error: 'mismatch' }, 400);

  // Capture if the account isn't set to auto-capture (uncaptured payments
  // are refunded automatically by Razorpay after a few days).
  if (p.status === 'authorized') {
    const c = await rzp(env, '/payments/' + pid + '/capture', {
      method: 'POST',
      body: JSON.stringify({ amount: p.amount, currency: p.currency }),
    });
    if (c.ok) p = c.body;
  }

  const paid = p.status === 'captured' || p.status === 'authorized';
  return json({
    ok: paid,
    status: p.status,
    amount: p.amount / 100,
    currency: p.currency,
    email: p.email || '',
    contact: p.contact || '',
    tier: p.notes?.tier || '',
  });
}
