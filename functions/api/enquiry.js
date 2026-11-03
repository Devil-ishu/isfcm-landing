// POST /api/enquiry  { form, name, phone, ...fields }
// One endpoint for every form on the main site (mentorship applications,
// executive selection calls, seminar enquiries, contact, ISTC registrations).
// Forwards the cleaned fields to the same Google Apps Script web app as the
// questionnaire (APPS_SCRIPT_URL). The `form` field says which form it came
// from, so the script can route rows to separate tabs.

const FORMS = {
  mentorship: ['name', 'phone', 'email', 'room'],
  executive: ['name', 'phone', 'email', 'company', 'role'],
  seminar: ['institution', 'name', 'phone', 'email'],
  contact: ['name', 'phone', 'message'],
  istc: ['name', 'phone', 'city', 'mode'],
  archetype: ['name', 'primary'],
  audit: ['name', 'phone', 'stage'], // Voice Audit ad funnel: one row per stage
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const clip = (v, n = 120) => (v == null ? '' : String(v).slice(0, n));

// Apps Script answers a POST with a 302 to script.googleusercontent.com,
// which must then be fetched with GET.
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
  if (body.website) return json({ ok: true }); // honeypot: bots fill hidden fields

  const required = FORMS[body.form];
  if (!required) return json({ ok: false, error: 'unknown_form' }, 400);
  for (const k of required) {
    if (!body[k] || !String(body[k]).trim()) return json({ ok: false, error: 'missing_' + k }, 400);
  }

  const clean = { submitted_at: new Date().toISOString(), source: 'site' };
  for (const [k, v] of Object.entries(body)) {
    if (!/^[a-z0-9_]{1,40}$/.test(k) || k === 'website') continue;
    clean[k] = Array.isArray(v) ? clip(v.join(', '), 1000) : clip(v, 4000);
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
