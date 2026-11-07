// POST /api/calid-webhook  ← Cal.id webhook
// Turns Cal.id bookings into WhatsApp messages (sent by the Apps Script, form "wa"):
//   Booking Created / Rescheduled → "booked" message + 24h and 1h reminders
//   Booking Cancelled            → "cancelled, pick a new time"
//   Booking No-show Updated      → "we missed you, book again" (when you mark the guest as no-show)
// Only the Voice Diagnosis (voice-audit) and Diagnosis Call event types are handled.
// Setup: Cal.id → Settings → Developer → Webhooks → New: URL https://go.isfcm.com/api/calid-webhook,
// triggers Booking Created, Rescheduled, Cancelled, No-show Updated, a secret of your choice.
// Put the same secret in Cloudflare Pages env as CALID_WEBHOOK_SECRET.

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

const EVENTS = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_RESCHEDULED: 'booking_rescheduled',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_NO_SHOW_UPDATED: 'no_show',
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW: 'no_show',
};

const clip = (v, n = 200) => (v == null ? '' : String(v).slice(0, n));

// A booking-form answer is either a plain value or { value, label }.
function answer(x) {
  if (x == null) return '';
  if (typeof x === 'object' && 'value' in x) x = x.value;
  if (x && typeof x === 'object') return [x.firstName, x.lastName].filter(Boolean).join(' ');
  return String(x);
}

function productOf(p) {
  const t = [p.type, p.eventTypeSlug, p.eventType && p.eventType.slug, p.title].filter(Boolean).join(' ').toLowerCase();
  if (/voice|audit/.test(t)) return 'audit';
  if (/diagnos/.test(t)) return 'diagnosis';
  return '';
}

export async function onRequestPost({ request, env }) {
  const secret = env.CALID_WEBHOOK_SECRET;
  if (!secret) return json({ ok: false, error: 'not_configured' }, 503);

  const raw = await request.text();
  const given = (request.headers.get('x-cal-signature-256') || '').replace(/^sha256=/, '');
  if (!same(await hmacHex(secret, raw), given)) return json({ ok: false, error: 'bad_signature' }, 401);

  let ev;
  try { ev = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }
  const event = EVENTS[ev.triggerEvent];
  if (!event) return json({ ok: true, ignored: ev.triggerEvent });

  const p = ev.payload || {};
  const r = p.responses || {};
  const a = (p.attendees && p.attendees[0]) || {};

  // No-show: only when the guest (not the host) is marked absent.
  if (ev.triggerEvent === 'BOOKING_NO_SHOW_UPDATED') {
    const absent = (p.attendees || []).some((x) => x.noShow === true);
    if (!absent) return json({ ok: true, ignored: 'not_no_show' });
  }

  const product = productOf(p);
  const uid = p.uid || p.bookingUid || '';
  // No-show payloads don't name the event type; the Apps Script finds the booking by uid.
  if (!product && event !== 'no_show') return json({ ok: true, ignored: 'other_event_type' });

  const meta = p.metadata || {};
  const loc = typeof p.location === 'string' ? p.location : '';
  const join = (p.videoCallData && p.videoCallData.url) || meta.videoCallUrl || (/^https:\/\//.test(loc) ? loc : '');

  const SCRIPT = (env.APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT) return json({ ok: false, error: 'no_script' }, 503);
  const status = await callScript(SCRIPT, {
    form: 'wa', event, product: product || 'lookup', uid: clip(uid, 80),
    old_uid: clip(p.rescheduleUid || p.fromReschedule || (p.originalRescheduledBooking && p.originalRescheduledBooking.uid) || '', 80),
    name: clip(answer(r.name) || a.name, 80),
    email: clip(answer(r.email) || a.email, 120),
    phone: clip(answer(r.whatsapp) || answer(r.attendeePhoneNumber) || answer(r.phone) || a.phoneNumber || p.smsReminderNumber || '', 30),
    start: clip(p.startTime, 40),
    join_url: clip(join, 500),
    pid: clip(meta.pid, 40),
  });
  return json({ ok: true, wa: status });
}
