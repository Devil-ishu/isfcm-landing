# Pages register

_Written by `python3 tools/build.py` on 2026-11-06. Do not edit by hand; change the page headers instead._

**23 brand · 12 ads · 0 unlisted** · site not launched (nothing indexed) · base https://go.isfcm.com

| Zone | Address | For | Rules |
|---|---|---|---|
| Brand | `/…` | People searching or researching Gaurang | DESIGN.md · in menu · indexed once live |
| Ads | `/go/…` | Cold traffic from ads, and the funnel steps after | LANDING.md · noindex · no menu |
| Unlisted | `/u/<code>-<name>/` | Gaurang, members, clients | Anyone with the link · noindex · never linked |

## Brand

| Address | Page | Where it's reached | Takes | Status | Edit |
|---|---|---|---|---|---|
| / | Gaurang Misra \| Consultant to founders and senior leaders | Home |  | live | src/pages/home.html |
| /404/ | Page not found | System page |  | live | src/pages/404.html |
| /contact/ | Contact | Footer | enquiry: contact | live | src/pages/contact.html |
| /delivery-policy/ | Delivery policy | Footer |  | live | src/pages/delivery.html |
| /executive/ | Executive programme | Linked from pages | enquiry: executive | live | src/pages/executive.html |
| /gaurang-misra/ | About Gaurang Misra | Menu |  | live | src/pages/about.html |
| /insights/ | Insights | Footer |  | live | src/pages/insights.html |
| /insights/let-me-think-about-it/ | "Let me think about it" is a verdict, not a question | Linked from pages |  | live | src/pages/insight-think.html |
| /insights/the-deeper-voice-myth/ | The deeper-voice myth | Linked from pages |  | live | src/pages/insight-deeper-voice.html |
| /insights/the-first-three-seconds/ | The first three seconds of a meeting | Linked from pages |  | live | src/pages/insight-first-seconds.html |
| /insights/why-the-best-prepared-person-loses-the-room/ | Why the best-prepared person loses the room | Linked from pages |  | live | src/pages/insight-prepared.html |
| /insights/your-words-are-the-least-important-part/ | Your words are the least important part of what you say | Linked from pages |  | live | src/pages/insight-words.html |
| /istc/ | ISTC entrance coaching | Footer | enquiry: istc | live | src/pages/istc.html |
| /links/ | Gaurang Misra \| Links | Instagram and Facebook bio |  | live | src/pages/links.html |
| /mentorship/ | One-to-one mentorship | Linked from pages | enquiry: mentorship | live | src/pages/mentorship.html |
| /privacypolicy/ | Privacy policy | Footer |  | live | src/pages/privacy.html |
| /refundpolicy/ | Refund and cancellation policy | Footer |  | live | src/pages/refund.html |
| /request-diagnosis/ | Private Diagnosis | Menu | Razorpay | live | src/pages/diagnosis.html |
| /results/ | Results | Menu |  | live | src/pages/results.html |
| /seminars/ | Seminars for colleges and companies | Menu | enquiry: seminar | live | src/pages/seminars.html |
| /termsandconditions/ | Terms and conditions | Footer |  | live | src/pages/terms.html |
| /tonal-authority/ | Tonal Authority: voice training | Footer |  | live | src/pages/tonal-authority.html |
| /work-with-me/ | Work with me | Menu |  | live | src/pages/work.html |

## Ads

### archetype

| Address | What it does | Takes | Status | Edit |
|---|---|---|---|---|
| /go/archetype/ | Older 27-question seducer type test. Does not match the current brand. | /api/enquiry (archetype) | retire? | go/archetype/index.html |

### audit

| Address | What it does | Takes | Status | Edit |
|---|---|---|---|---|
| /go/audit/ | Step 1: Executive Voice Diagnosis ad page, multi-step version: apply, book, confirmed, prepare. | /api/enquiry (audit) | check: overlaps /go/voice/ | go/audit/index.html |
| /go/audit/apply/ | Voice Diagnosis step 2: application form. | /api/enquiry (audit) | live | go/audit/apply/index.html |
| /go/audit/book/ | Voice Diagnosis step 3: Cal.id booking. | Cal.id | live | go/audit/book/index.html |
| /go/audit/confirmed/ | Voice Diagnosis step 4: booking confirmed, add to calendar. |  | live | go/audit/confirmed/index.html |
| /go/audit/prepare/ | Voice Diagnosis step 5: what to prepare before the diagnosis. |  | live | go/audit/prepare/index.html |

### diagnosis

| Address | What it does | Takes | Status | Edit |
|---|---|---|---|---|
| /go/diagnosis/ | Step 1: ad sales page for the paid 45-minute diagnosis. Meta and Google ads land here; Razorpay checkout on page. | Razorpay | live | go/diagnosis/index.html |
| /go/diagnosis/book/ | Step 2 after paying: pick a Cal.id slot for the diagnosis call. | Cal.id | live | go/diagnosis/book/index.html |
| /go/diagnosis/prepare/ | Step 3 after booking: sends the buyer into the Influence Profile before the call. |  | live | go/diagnosis/prepare/index.html |
| /go/diagnosis/done/ | Step 5: end of the diagnosis funnel: what happens next. |  | live | go/diagnosis/done/index.html |

### profile

| Address | What it does | Takes | Status | Edit |
|---|---|---|---|---|
| /go/profile/ | Influence Profile. Step 4 of the diagnosis funnel when booked (?pid=, builds the call brief); also the reel lead magnet (?src=). ?r= shows a saved result. | /api/profile | live | go/profile/index.html |

### voice

| Address | What it does | Takes | Status | Edit |
|---|---|---|---|---|
| /go/voice/ | Executive Voice Audit ad page, single-page version (recording upload, then Cal.id). | Cal.id | check: overlaps /go/audit/ | go/voice/index.html |

## Unlisted

None yet. Create one with `python3 tools/build.py new "name"`.

## Old addresses (redirect to the pages above)

```
# Old funnel addresses -> the /go/ zone. Kept so any link already sent out
# (Cal.id, Razorpay, WhatsApp, old ads) still lands. :splat keeps sub-paths.
/diagnosis/*      /go/diagnosis/:splat   301
/book/*           /go/diagnosis/book/:splat     301
/prepare/*        /go/diagnosis/prepare/:splat  301
/done/*           /go/diagnosis/done/:splat     301
/profile/*        /go/profile/:splat     301
/voice/*          /go/voice/:splat       301
/audit/*          /go/audit/:splat       301
/archetype/*      /go/archetype/:splat   301
/questionnaire/*  /go/profile/           301
/diagnosis        /go/diagnosis/   301
/book             /go/diagnosis/book/   301
/prepare          /go/diagnosis/prepare/  301
/done             /go/diagnosis/done/   301
/profile          /go/profile/     301
/voice            /go/voice/       301
/audit            /go/audit/       301
/archetype        /go/archetype/   301
/questionnaire    /go/profile/     301
```
