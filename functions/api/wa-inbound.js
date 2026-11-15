// POST /api/wa-inbound  ← Kapso webhook for +91 62840 65488
// Events: whatsapp.message.received (someone messaged us → their 24h window opens, and
// buyers get their call details) and whatsapp.message.failed (a template Meta accepted
// but couldn't deliver → email + alert fallback). Forwards to the Apps Script as form "wa".
// Setup: Kapso → Phone numbers → Gaurang Misra → Webhooks → add
//   URL https://go.isfcm.com/api/wa-inbound, events message.received + message.failed,
//   a secret; put the same secret in Cloudflare Pages env as KAPSO_WEBHOOK_SECRET.
// Message text is never stored: only the phone, name and (for confirmations) nothing else.

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

async function callScript(url, payload) {
  let r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), redirect: 'manual' });
  for (let hops = 0; [301, 302, 303, 307, 308].includes(r.status) && hops < 4; hops++) {
    const loc = r.headers.get('location');
    if (!loc) break;
    r = await fetch(new URL(loc, url).toString(), { method: 'GET', redirect: 'manual' });
  }
  return r.status;
}

const clip = (v, n = 120) => (v == null ? '' : String(v).slice(0, n));

export async function onRequestPost({ request, env }) {
  const secret = env.KAPSO_WEBHOOK_SECRET;
  if (!secret) return json({ ok: false, error: 'not_configured' }, 503);
  const raw = await request.text();
  const given = (request.headers.get('x-webhook-signature') || '').replace(/^sha256=/, '');
  if (!same(await hmacHex(secret, raw), given)) return json({ ok: false, error: 'bad_signature' }, 401);

  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }
  const event = request.headers.get('x-webhook-event') || body.type || '';
  const items = body && body.batch === true && Array.isArray(body.data) ? body.data : [body];
  const SCRIPT = (env.APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT) return json({ ok: false, error: 'no_script' }, 503);

  let n = 0;
  for (const it of items) {
    const m = it.message || {};
    const c = it.conversation || {};
    const k = m.kapso || {};
    if (event === 'whatsapp.message.received' && (k.direction || 'inbound') === 'inbound') {
      await callScript(SCRIPT, {
        form: 'wa', event: 'inbound',
        phone: clip(m.from || c.phone_number, 20),
        name: clip(c.contact_name, 80),
      });
      n++;
    } else if (event === 'whatsapp.message.failed') {
      const err = (m.errors && m.errors[0]) || k.error || {};
      await callScript(SCRIPT, {
        form: 'wa', event: 'msg_failed',
        wamid: clip(m.id, 200),
        error: clip(err.code ? err.code + ' ' + (err.title || err.message || '') : (err.message || k.status || ''), 200),
      });
      n++;
    }
  }
  return json({ ok: true, handled: n });
}
