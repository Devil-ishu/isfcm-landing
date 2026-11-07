// POST /api/rzp-webhook  ← Razorpay webhook, events "payment.captured" and "payment.failed"
// 1. Logs every Voice Diagnosis payment to the sheet as stage `paid_server`, even if the
//    buyer's tab died before the page could log it.
// 2. Hands paid / failed payments for the Voice Diagnosis and the ₹499/999/1499 Diagnosis Call
//    to the Apps Script, which sends the WhatsApp message (form "wa").
// Setup: Razorpay Dashboard → Settings → Webhooks → URL https://go.isfcm.com/api/rzp-webhook,
// events payment.captured + payment.failed, a secret of your choice. Put the same secret in
// Cloudflare Pages env as RAZORPAY_WEBHOOK_SECRET.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Apps Script answers a POST with a redirect that must be followed with GET.
async function callScript(url, payload) {
  let r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), redirect: 'manual' });
  for (let hops = 0; [301, 302, 303, 307, 308].includes(r.status) && hops < 4; hops++) {
    const loc = r.headers.get('location');
    if (!loc) break;
    r = await fetch(new URL(loc, url).toString(), { method: 'GET', redirect: 'manual' });
  }
  return r.status;
}

// Which product a Razorpay order belongs to (from the notes /api/order wrote).
function productOf(notes) {
  if (notes.tier === 'audit') return 'audit';
  if (['499', '999', '1499'].includes(String(notes.tier))) return 'diagnosis';
  return '';
}

export async function onRequestPost({ request, env }) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return json({ ok: false, error: 'not_configured' }, 503);

  const raw = await request.text();
  const given = request.headers.get('x-razorpay-signature') || '';
  if (!same(await hmacHex(secret, raw), given)) return json({ ok: false, error: 'bad_signature' }, 401);

  let ev;
  try { ev = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }
  if (ev.event !== 'payment.captured' && ev.event !== 'payment.failed') return json({ ok: true, ignored: ev.event });

  const p = (ev.payload && ev.payload.payment && ev.payload.payment.entity) || {};
  let notes = p.notes || {};
  // Payment notes don't always carry the order's notes; read the order when needed.
  if (!productOf(notes) && p.order_id && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const r = await fetch('https://api.razorpay.com/v1/orders/' + p.order_id, {
      headers: { authorization: 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET) },
    });
    if (r.ok) notes = (await r.json()).notes || {};
  }
  const product = productOf(notes);
  if (!product) return json({ ok: true, ignored: 'not_ours' });

  const SCRIPT = (env.APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT) return json({ ok: false, error: 'no_script' }, 503);

  const phone = notes.phone || p.contact || '';
  const email = notes.email || p.email || '';
  let logged = 0;
  if (ev.event === 'payment.captured' && product === 'audit') {
    logged = await callScript(SCRIPT, {
      form: 'audit', stage: 'paid_server', source: 'razorpay_webhook',
      submitted_at: new Date().toISOString(),
      name: notes.name || '', phone, email,
      pid: p.id || '', oid: p.order_id || '', amount: (p.amount || 0) / 100,
      utm_source: notes.utm_source || '', utm_campaign: notes.utm_campaign || '', utm_content: notes.utm_content || '',
    });
  }
  const wa = await callScript(SCRIPT, {
    form: 'wa', event: ev.event === 'payment.captured' ? 'payment_captured' : 'payment_failed',
    product, name: notes.name || '', phone, email,
    pid: p.id || '', oid: p.order_id || '', amount: (p.amount || 0) / 100,
  });
  // Always 200 to Razorpay once the signature checks out, so it doesn't retry forever.
  return json({ ok: true, logged, wa });
}
