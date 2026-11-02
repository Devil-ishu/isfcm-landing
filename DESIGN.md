# DESIGN.md — go.isfcm.com

Direction: **advisory, not coaching.** The buyer is a founder or CXO. The sites he already trusts (executive search and board advisory firms) are white, quiet, serif-led and photo-led. Speaker and coach sites (dark backgrounds, yellow buttons, stage photos) read as course-selling, so we avoid that look entirely.

References studied (2 Nov 2026): egonzehnder.com, spencerstuart.com (the buyer's world); vinhgiang.com, juliantreasure.com, blackswanltd.com, simonsinek.com (the category to stand apart from).

## Color

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#14141F` | Body text, headings |
| `--ink-soft` | `#4B4B57` | Supporting text (7.9:1 on white) |
| `--line` | `#DCDDE1` | Hairlines, input borders |
| `--paper` | `#FFFFFF` | Page background |
| `--mist` | `#EEF0F2` | Alternate section band, cool grey (never cream) |
| `--brand` | `#010066` | Primary buttons, links, the one strong mark. Carried over from the ISFCM logo for continuity |
| `--brand-hover` | `#1A1A85` | Button hover |
| `--night` | `#0A0A2E` | One dark band only: the voice before/after section |
| `--ok` `--warn` `--error` | `#1F7A4D` `#9A6400` `#B3261E` | Form states only |

No accent colour. No gradients. The logo's pink, teal, purple and sky blue are retired.

## Typography

- **Spectral** (serif) for headlines and pull quotes. Weights 400 and 500. Sharp, screen-drawn, not one of the default AI serifs.
- **Albert Sans** for body, navigation, buttons and forms. Weights 400 and 600.

| Step | Size / line height | Use |
| --- | --- | --- |
| display | 64 / 1.05 (40 / 1.1 mobile) | Homepage headline only |
| h1 | 48 / 1.1 (34 / 1.15) | Page headlines |
| h2 | 34 / 1.2 (28 / 1.2) | Section headlines |
| h3 | 22 / 1.3 | Sub-heads, case-story titles |
| body-lg | 19 / 1.6 | Intro paragraphs |
| body | 17 / 1.65 | Default |
| small | 14 / 1.5 | Captions, footer, legal |

Sentence case everywhere. No all-caps labels, no eyebrow text above headings, no single highlighted word in a headline.

## Spacing and layout

- 8px scale: 8, 16, 24, 32, 48, 64, 96, 128.
- Sections: 128px vertical on desktop, 72px on mobile.
- Content width 1160px; text columns max 640px (about 65 characters).
- Left-aligned by default. Centred text only for the single final call-to-action band.
- Designed at 375px first.

## Shape and depth

- Radius: 2px on buttons and inputs, 0 on images. Nothing pill-shaped.
- No shadows. Separation comes from hairlines and the mist band.

## Components

- **Primary button:** brand fill, white Albert Sans 600, 16px, 14px × 24px padding. Hover brand-hover. Focus: 2px brand outline offset 3px. One per screen.
- **Secondary button:** text link in brand with an underline that thickens on hover. No outlined buttons.
- **Proof strip:** four figures in Spectral 34px with a 14px caption under each, separated by hairlines, not cards.
- **Case story:** role and industry in small text, problem and outcome in body text, a hairline above. Stacked list, never a 3-card grid.
- **Voice player:** the signature element. Night band, two large play controls (Before / After) with a waveform line drawn in white. The only dark section on the site.
- **Navigation:** name wordmark left, three links and one button right. Collapses to a menu under 768px.
- **Footer:** mist band, ISFCM wordmark in monochrome, "© 2026 ISFCM LLP", phone +91 94641 51610, legal links.

## Logo use

- Header: "Gaurang Misra" set in Spectral 500 as the wordmark.
- Footer only: the ISFCM letters in monochrome ink, without the graduation-cap icon.
- The cap-and-chart icon and the five-colour version are not used on this site.

## Imagery

- Real photographs of Gaurang only: side-lit, mid-sentence, hands visible, in a real room. Full-bleed or half-bleed, never in a rounded frame.
- Black and white or low-saturation colour, so the navy stays the only colour.
- No stock photos, no illustrations, no AI-generated people.
- Icons: none in body copy. Interface icons from one outline set, 1.5px stroke.

## Motion

One moment only: the voice player's waveform animates on play. No fade-in on scroll, no hover effects on blocks.
