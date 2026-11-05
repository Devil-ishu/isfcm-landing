# LANDING.md — ads zone (`/go/…`)

Rules for every page under `/go/`: the pages Meta and Google ads point to, and the funnel steps after them. These pages have one job, which is to convert a cold visitor. They do **not** follow DESIGN.md and do not use the brand's advisory voice. Brand pages never borrow from this file either.

## Setup (checked by `tools/build.py`)
- Lives under `/go/<funnel>/`, with each step as a sub-page: `/go/diagnosis/`, `/go/diagnosis/book/`, …
- `<meta name="robots" content="noindex, nofollow">`, plus the zone, purpose and status tags in `<head>`:
  `<meta name="zone" content="ads">` · `<meta name="purpose" content="Step N: …">` · `<meta name="status" content="live">`
- No site menu, no footer links into the brand site. The logo is not a link. Only exits: the CTA and the legal links.
- Brand pages link in only through entries in `brand_may_link_to` (tools/site.json).

## The page, top to bottom
1. **Message match.** The headline repeats the promise of the ad that sent them. One ad angle = one page (or one `?utm_content` variant).
2. **Hook above the fold:** the pain or desire in their words, what they get, the price or "pay what you think", and one button. All visible on a phone without scrolling.
3. **One offer, one action.** Every button on the page does the same thing. No second product, no "learn more".
4. **Proof early:** a real result, number or face in the first two screens. Proof right next to every CTA.
5. **The mechanism:** why this works when what they tried didn't. Short.
6. **What happens after they click:** the steps, the time it takes, what they need.
7. **Objections answered:** price, time, "is this for me", "what if it doesn't work". Guarantee or refund terms next to the price.
8. **Urgency that is true:** real limited slots or a real deadline. Never fake timers.
9. **Final CTA** repeating the offer.

## Copy
- Speak to one person ("you"). Short sentences. Headlines, buttons and labels in Title Case (Gaurang's call, Nov 2026); body text in sentence case. Hindi words in Roman script only.
- Price is stated, not hidden (opposite of brand pages).
- No "dark psychology", "manipulation" or "seduction" wording in headlines or ad-facing copy (Meta rejects it and it attracts the wrong buyer).

## Mobile and speed
- Designed at 375px first. Tap targets 48px+. Sticky CTA on long pages.
- Under 2.5s first view on 4G: WebP images, video posters, no heavy libraries.

## Tracking (every page)
- Meta Pixel `PageView`, plus the funnel event at the step (`InitiateCheckout`, `Purchase`, `Schedule`, `Lead`).
- GA4 with the same event names. Carry `utm_*`, `fbclid` and `gclid` through every step in the URL.

## Before a page goes in an ad
- Run `python3 tools/build.py` (zone check must pass) and check the page's row in PAGES.md.
- Click through the whole funnel on a phone with a test payment.
