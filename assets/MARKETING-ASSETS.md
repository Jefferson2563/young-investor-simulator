# Marketing Assets — Cyan Variant

These assets use a glowing **cyan** color scheme distinct from the green brand on the live site. Use them ONLY for marketing contexts (Indie Hackers, Reddit posts, social shares of marketing content, hero banners). The live product (`younginvestor.app`) keeps the green brand untouched.

## What's in here

| File | Size | Use case |
|---|---|---|
| `logo-cyan-animated.svg` | 200×200 | Inline embed where you want the breathing-glow animation. Indie Hackers featured image (test first), web embeds, splash screens. Animation runs in browsers but is paused on iOS image previews. |
| `logo-cyan.svg` | 200×200 | Static fallback. Same look without animation. Use when the rendering surface strips animations: avatars, app stores, anywhere served as an image. |
| `marketing-og-cyan.svg` | 1200×630 | Open Graph card for marketing-specific posts (NOT the default site OG). Use when sharing IH post, Reddit drafts, Twitter campaigns where you want the bold marketing look. |
| `marketing-banner-cyan.svg` | 1500×500 | Wide banner. Indie Hackers post header image, Twitter/X profile banner, blog post header for marketing-flavored posts, README hero on GitHub. |

## Where to use what

### Indie Hackers post (`drafts/indie-hackers-build-post.md`)
- **Cover/header**: `marketing-banner-cyan.svg` — fits IH cover format
- **Inline visual** (after the TL;DR): embed `logo-cyan-animated.svg` if IH supports SVG (test it; if not, export to PNG)

### Reddit posts (`drafts/reddit-posts.md`)
- Reddit doesn't accept SVG inline. If a sub allows images and you want one: convert `marketing-og-cyan.svg` to PNG (via any free tool — CloudConvert, Inkscape, or `rsvg-convert`)
- Post-as-image route is risky on text-rules subs. Default: post text only.

### Twitter / X
- **Profile banner**: `marketing-banner-cyan.svg` exported to PNG (1500×500 fits perfectly)
- **Post image**: `marketing-og-cyan.svg` → PNG (1200×630 is twitter-card-friendly)
- **Avatar**: `logo-cyan.svg` exported to 400×400 PNG

### LinkedIn
- **Article cover**: `marketing-banner-cyan.svg` → PNG (1500×500 close to LinkedIn's 1584×396 — pad as needed)
- **Post image**: `marketing-og-cyan.svg` → PNG

### Product Hunt
- **Gallery image**: `marketing-og-cyan.svg` → PNG
- **Logo**: `logo-cyan.svg` → 240×240 PNG

### GitHub README (if you add one)
- Drop `marketing-banner-cyan.svg` at the top of the README — GitHub renders SVG natively.

### Internal: do NOT use these on the live site
- `younginvestor.app` keeps the green brand (`assets/logo.svg`)
- These cyan assets are for OUTBOUND marketing only
- Do not replace `assets/og-card.svg` (that's the site's default OG card and should match the live brand)

## Converting SVG to PNG

Most platforms (Reddit image posts, Twitter, LinkedIn, Product Hunt) require PNG. Quick options:

1. **Online**: cloudconvert.com — drag SVG, export PNG at desired resolution.
2. **Local (rsvg-convert)**: `rsvg-convert -w 1200 marketing-og-cyan.svg > og.png`
3. **Inkscape**: Open SVG → Export as PNG.
4. **Browser**: Open SVG in Chrome → Right-click → "Capture full size screenshot" (DevTools).

Use 2× the target resolution for retina-quality (e.g., export the 1200×630 OG card at 2400×1260, then resize down — sharper on high-DPI displays).

## Color palette (for matching new assets)

If you create more cyan-branded assets, use these exact colors:

| Purpose | Hex |
|---|---|
| Highlight cyan (brightest accent) | `#7df9ff` |
| Primary cyan | `#00d9ff` |
| Deep cyan (for shadows/depth) | `#00b8d4` |
| Background dark | `#020608` |
| Background mid | `#0a1820` |
| Border deep | `#003a55` |

## When to use cyan vs. green

| Context | Color |
|---|---|
| Live product UI (younginvestor.app and tools) | **Green** (existing) |
| Site OG image (default share preview) | **Green** (matches the live UI) |
| Marketing posts (IH, Reddit, Twitter campaigns) | **Cyan** (new) |
| Investor/press materials | **Cyan** (looks more "tech product") |
| Casual social posts ("here's what I'm working on") | **Either** (your call) |

The split is intentional: green = product (calm, safe, money), cyan = marketing (energy, future, hype). Don't mix them on the same surface.
