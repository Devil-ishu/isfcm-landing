// POST /api/profile  — the Influence Profile (go.isfcm.com/go/profile/)
//
// Reel mode: saves the lead (name, WhatsApp, type, answers) to the "Influence Profile" tab.
// Booked mode (a paid diagnosis call): also builds the call brief — pursue score, how to talk
// to this person, likely objection, opening line, language signals — and hands it to the
// Apps Script, which emails it to Gaurang under the Gmail label "Diagnosis Briefs".
// The brief logic lives only here, so the buyer never sees how they were scored.

import { buildBrief } from '../_lib/brief.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
const clip = (v, n = 120) => (v == null ? '' : String(v).slice(0, n));

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

export async function onRequestPost({ request, env }) {
  const SCRIPT = (env.APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT) return json({ ok: false, error: 'not_configured' }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'bad_request' }, 400); }
  if (body.website) return json({ ok: true }); // honeypot

  const booked = body.mode === 'booked';
  const required = booked ? ['name', 'whatsapp', 'email', 'situation', 'type_code'] : ['name', 'whatsapp', 'type_code'];
  for (const k of required) {
    if (!body[k] || !String(body[k]).trim()) return json({ ok: false, error: 'missing_' + k }, 400);
  }

  const clean = { submitted_at: new Date().toISOString(), form: 'profile', source: 'site' };
  for (const [k, v] of Object.entries(body)) {
    if (!/^[a-z0-9_]{1,40}$/.test(k) || k === 'website' || k === 'form') continue;
    clean[k] = Array.isArray(v) ? clip(v.join(', '), 1000) : clip(v, 4000);
  }
  if (!clean.phone) clean.phone = clean.whatsapp;
  clean.stage = booked ? 'booked' : 'reel';

  if (booked) {
    try {
      const b = buildBrief(body);
      Object.assign(clean, b.columns);          // verdict + scores also land in the sheet
      clean._brief_subject = b.subject;         // "_" keys are used by the script, never written as columns
      clean._brief_html = b.html;
      clean._brief_text = b.text;
    } catch (e) {
      clean.brief_error = clip(String(e), 200);  // the answers still save; the plain alert still goes out
    }
  }

  let res;
  try {
    res = await callScript(SCRIPT, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(clean),
    });
  } catch (e) {
    return json({ ok: false, error: 'sheet_unreachable' }, 502);
  }
  if (!res.data || res.data.ok === false || res.status >= 400) {
    return json({ ok: false, error: 'sheet_error', detail: res.data?.error || clip(res.text, 160) }, 502);
  }
  return json({ ok: true });
}
