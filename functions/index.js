// GET /  → the new homepage, except for ad traffic.
// Ads used to point at go.isfcm.com/ when the diagnosis sales page lived there.
// Visitors who arrive from an ad (Meta adds fbclid, Google adds gclid, and our
// ads carry utm_ tags) still get the sales page, now stored at /diagnosis/.
// Everyone else gets the homepage. The address bar keeps the original URL so
// tracking parameters stay intact.

const AD_PARAMS = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export async function onRequestGet({ request, env, next }) {
  const url = new URL(request.url);
  const fromAd = AD_PARAMS.some((p) => url.searchParams.has(p));
  if (!fromAd) return next();

  const page = new URL('/diagnosis/', url.origin);
  const res = await env.ASSETS.fetch(new Request(page.toString(), request));
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-served', 'ad-diagnosis');
  return out;
}
