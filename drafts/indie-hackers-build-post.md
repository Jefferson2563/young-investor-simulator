# How I Built a Compound-Interest Simulator for Young European Investors (And What 9 Months Taught Me)

**TL;DR**: I'm a solo dev who built [younginvestor.app](https://younginvestor.app) — a free compound-interest simulator targeting Gen Z and millennials in Europe. Vanilla HTML/CSS/JS, Firebase auth, Stripe Pro at €4.99/mo. Live in 7 languages. Here's the build, the tech, the marketing experiments, and the embarrassing mistakes.

---

## The problem I kept seeing

Every "compound interest calculator" online looks like it was designed for a Bloomberg terminal in 2003. Tiny grey forms. Defaults like "$10,000 starting principal" — unrealistic for a 22-year-old. Output as a wall of numbers, no story, no shareable moment.

Meanwhile, the audience that needs compounding most — people in their 20s — is the group LEAST served by the existing tools. The math is universal. The UX is hostile.

So I built the tool I wished existed when I was 22.

---

## The 30-second pitch

You drag four sliders: starting amount, monthly contribution, return rate, years.
A live chart updates instantly.
At the bottom: a brutal comparison — "starting at 20 vs 30 with the same $200/month = $356,000 difference."
Then a CTA to actually open a brokerage account.

Free version covers everything most people need. Pro (€4.99/mo) adds: tax simulator, inflation adjustment, dividend calculator, portfolio tracker, PDF export, cloud sync.

---

## The stack (and why I chose vanilla)

I'm going to get heat for this, but: **vanilla HTML/CSS/JS, no framework, no bundler.**

- `index.html` — single-page simulator
- `js/app.js` — all the logic
- `css/style.css` — global styling, dark/light theme
- Firebase Auth + Firestore for accounts and cloud sync
- Stripe Checkout for Pro
- GitHub Pages for hosting (yes, free)
- Custom i18n object in `js/i18n.js` (7 languages: EN, FR, ES, PT, DE, AR, ZH)

**Why no framework?**
1. The whole site is ~500KB. A React-Vite-Tailwind setup would be 5-10MB before I write a line of code.
2. Edge cases like Arabic RTL or Chinese line-breaking are easier in raw HTML than fighting with Next.js i18n routing.
3. I deploy by `git push`. No build step. No CI. No yak-shaving.
4. Page load is sub-second on 3G. SEO-critical.

The downside: the codebase is uglier than it would be in React. But for a solo project where I might add a feature once a week, the tradeoff is worth it.

---

## Architecture: the parts that actually mattered

### 1. The slider chart that converts

The hero section is just four sliders and a Chart.js line chart. As you drag, the chart redraws every frame using `requestAnimationFrame`. The end value updates in a giant gold typeface.

This is THE conversion mechanism. It turns "investing is abstract" into "I can SEE my $1.17 million." Every other element on the page is downstream of this moment.

### 2. The "starting at 20 vs 30" panel

Below the simulator, a side-by-side comparison: same monthly amount, 10 years apart. The gap is usually $300K-700K depending on inputs.

This is the panel that gets screenshotted. It's the panel that gets shared. It's the panel that creates the emotional "oh shit" moment that drives every conversion afterward.

### 3. Firebase as a CMS-lite

Auth is pretty standard. The interesting part: I use Firestore as a save-state for user simulations + a CMS for the blog (admin panel writes posts to Firestore, then a small client-side "build" step fetches them and generates static HTML at clean URLs).

This avoided needing a real backend while still giving me a publishable blog with clean SEO URLs (`/blog/post-slug/` not `/blog?id=xxx`).

### 4. Stripe — the simplest possible setup

No webhooks. No backend. Stripe Checkout link → success URL → user signs in → my client checks their email against a manually-maintained list in Firestore → flips `isPro` flag.

This is hacky and I will rebuild it properly. But it took 30 minutes vs 3 days. For 5 paying customers, that's the right call.

---

## The hardest engineering problem: SEO for a JS app

GitHub Pages serves my static files. But ALL the content is rendered client-side by JavaScript — including the blog posts.

**Google does not love this.**

For 4 weeks I had ~0 organic traffic. Every blog post was at `/blog/post.html?slug=xxx`, JS-rendered, and Google saw a single mostly-empty page.

The fix: **pre-render every blog post as a static HTML file at a clean URL** (`/blog/investing-at-20-vs-30/`). I wrote a small Python build script that:
1. Reads all 19 posts from Firestore
2. Generates a full HTML file per post with all SEO meta, OG tags, JSON-LD `Article` schema, content baked in
3. Updates `sitemap.xml`
4. Commits via git

Now the admin panel triggers this same flow via the GitHub API directly from the browser. One-click publishing → static HTML at clean URL → Google indexes → ranks.

---

## The marketing experiments

### What worked

- **SEO long-tail keywords**: "investing at 20 vs 30" "rule of 72 calculator" "DRIP calculator beginners" — head terms are dominated by NerdWallet/Bankrate (DA 90+), but long-tail terms have actual openings. Domain authority builds slowly via blog content.
- **The simulator itself as a CTA in blog posts**: Every blog ends with "see your numbers" → drives ~30% click-through to the tool.
- **Multi-language from day 1**: Arabic and Chinese have almost zero competition for these keywords. I rank for some terms in those markets that I'd never touch in English.

### What didn't

- **Twitter/X**: Threads about compound interest get 200 views, no clicks. Wrong audience entirely.
- **Reddit drive-by posts**: r/personalfinance moderators delete anything that looks promotional. Need to genuinely help in comments first; even then, conversion is low.
- **Paid ads**: Tested €100 of Google Ads on "compound interest calculator." CPC was €1.80, conversion to free account was 4%. Math doesn't work.
- **Product Hunt**: I haven't launched yet. Saving it for v2 with a real differentiator.

---

## Numbers, since people always ask

After 6 months public:
- ~3,500 monthly active users (free)
- 19 blog posts indexed
- 5 paying Pro subscribers
- 7 languages live (Arabic and Chinese added in month 4)
- DA ~5 (yes, low, but rising)

Revenue is not life-changing. But the tool is helping people, and I'm slowly learning what kind of finance product actually compounds (pun intended) over time.

---

## What I'd do differently

1. **Static site generator from day 1.** Not React. Eleventy or Astro for the static parts, vanilla JS for the interactive simulator. The hand-rolled i18n was charming for a month and then a nightmare.

2. **Stripe webhooks before launching paid.** The manual "check email against a list" thing scales to roughly 5 customers. I crossed that line and now I'm rebuilding under pressure.

3. **Mobile-first from the first commit.** I designed for desktop, then "made it work" on mobile. Result: the mobile experience is inferior to the desktop experience for 60% of my visitors. I should have inverted that.

4. **Focused on one persona.** "Young European investors" was too broad. I should have picked "22-28 year-old French university grads with €500/mo to invest" specifically and built the entire onboarding for them. I would have nailed product-market fit faster.

5. **Started the blog in month 1.** I waited 4 months. SEO compounds — I lost a year of head start by waiting for "the product to be ready." It will never be ready. Just publish.

---

## What's next

- Full Stripe webhook integration (this week, finally)
- Country-specific tax modules (PEA for France, Abgeltungsteuer for Germany, ISA for UK) — this is the real moat
- A "first $1,000" guided onboarding flow for absolute beginners
- Indie Hackers post (this one), Reddit posts, more blog content
- Maybe a Product Hunt launch in Q3 once I have the EU tax module

---

## If you're building something solo

- **Ship before perfect.** I lost 3 months to a redesign that nobody asked for.
- **Talk to 10 users before writing code.** I had 4 conversations. They saved me from building 6 features that nobody wanted.
- **Pick a niche so narrow you'll be #1 in it within 12 months.** "Investing tool" = no chance. "Compound interest tool for young Europeans" = winnable.
- **SEO is the one thing that compounds while you sleep.** Start it on day 1.

---

The tool is at [younginvestor.app](https://younginvestor.app) — feedback genuinely welcome, especially the brutal kind. Reply here or DM me.

Happy to answer questions about Firebase + GitHub Pages stack, vanilla JS at scale, Stripe-without-a-backend, multi-language, or anything else.

Building solo is hard. It's also the most fun work I've ever done. If you're on the fence, just start.

— [Your name]
Founder, [younginvestor.app](https://younginvestor.app)
