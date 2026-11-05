// GET /api/slots  → { capacity, sold, left, week_start }
// Live count of Executive Voice Diagnosis seats left this week (Mon 00:00 IST onwards).
// "sold" = paid Razorpay orders with notes.tier === 'audit' created this week.
// Cached for 5 minutes at the edge so page views don't hammer Razorpay.
// Change CAPACITY here to change the weekly limit (keep Cal.id's weekly cap in line).

const CAPACITY = 9;
const IST = 5.5 * 3600; // seconds

function json(data, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}

// Unix seconds for this Monday 00:00 in IST
function weekStart(nowSec) {
  const ist = nowSec + IST;
  const day = new Date(ist * 1000).getUTCDay(); // 0 = Sunday
  const sinceMon = (day + 6) % 7;
  const midnight = ist - (ist % 86400);
  return midnight - sinceMon * 86400 - IST;
}

export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ error: 'not_configured' }, 503);

  const cache = caches.default;
  const key = new Request(new URL('/api/slots?v=1', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const from = weekStart(Math.floor(Date.now() / 1000));
  const auth = 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET);
  let sold = 0;
  try {
    for (let skip = 0; skip < 1000; skip += 100) {
      const r = await fetch(`https://api.razorpay.com/v1/orders?from=${from}&count=100&skip=${skip}`, {
        headers: { authorization: auth },
      });
      if (!r.ok) return json({ error: 'razorpay', status: r.status }, 502);
      const body = await r.json();
      const items = body.items || [];
      for (const o of items) {
        if (o.status === 'paid' && o.notes && o.notes.tier === 'audit') sold++;
      }
      if (items.length < 100) break;
    }
  } catch (e) {
    return json({ error: 'fetch_failed' }, 502);
  }

  const res = json({ capacity: CAPACITY, sold, left: Math.max(0, CAPACITY - sold), week_start: from }, 200, 300);
  waitUntil(cache.put(key, res.clone()));
  return res;
}
