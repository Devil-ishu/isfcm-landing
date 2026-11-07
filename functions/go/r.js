// GET /go/r  — short links used in WhatsApp buttons (Meta only lets the end of a button URL change).
//   ?u=<base64url meeting link>  → 302 to the call (Zoom / Google Meet / Teams / Cal video only)
//   ?e=audit|diagnosis           → 302 to that Cal.id booking page (rebook after cancel or no-show)
//   ?e=…&j=1                     → no meeting link was known: a short page pointing to the invite email
// Anything else lands on the home page. Never forwards to a host outside the list (no open redirect).

const BOOK = {
  audit: 'https://cal.id/gaurang-misra/voice-audit',
  diagnosis: 'https://cal.id/gaurang-misra/diagnosis-call',
};
const HOSTS = /(^|\.)(zoom\.us|zoom\.com|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|cal\.id|cal\.com)$/;

function go(url) {
  return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
}

function page(title, text) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${title}</title>
<style>body{font:17px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:40px 22px;color:#111;max-width:460px}h1{font-size:22px;margin:0 0 12px}a{color:#010066}</style></head>
<body><h1>${title}</h1><p>${text}</p></body></html>`;
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

function decode(s) {
  try {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    return atob(b + '==='.slice((b.length + 3) % 4));
  } catch (e) {
    return '';
  }
}

export async function onRequestGet({ request }) {
  const q = new URL(request.url).searchParams;
  const u = q.get('u');
  if (u) {
    let url;
    try { url = new URL(decode(u)); } catch (e) { url = null; }
    if (url && url.protocol === 'https:' && HOSTS.test(url.hostname)) return go(url.toString());
    return page('Your call link', 'Please use the joining link in your calendar invite email. If you can\'t find it, reply to our WhatsApp message and we\'ll send it.');
  }
  const e = q.get('e');
  if (e && BOOK[e]) {
    if (q.get('j')) return page('Your call link', 'The joining link is in your calendar invite email from Cal.id. If you can\'t find it, reply to our WhatsApp message and we\'ll send it.');
    return go(BOOK[e]);
  }
  return go('/');
}
