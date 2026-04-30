# Reddit Posts — Strategy & Drafts

## Strategy: rules-compliant, value-first

Most subreddits ban links and self-promotion. **Plan**:
1. Post the **content** (analysis, math, comparison) directly in the post body
2. Mention the simulator only if asked in comments or via "[link in comments]" pattern
3. Genuinely useful = upvoted = stays = backlink seed
4. Do not post and run — answer comments, be active in the sub for 1-2 days before AND after

**Account hygiene**: post from an account that has been active in the sub for 30+ days with non-promotional comments. Brand-new accounts get auto-flagged.

---

## Post #1 — r/EuropeFIRE

**Title**: I ran the numbers: starting at 22 vs 32 with €200/month into a global ETF — the gap is €230,000 by 60

**Body**:

I keep seeing posts here from people in their late 20s asking "is it too late to start investing for FIRE?" Decided to actually run the numbers properly so we have a concrete answer.

**Setup**:
- €200/month into VWCE (or similar global ETF)
- 7% real annual return (after inflation, conservative for the world index)
- Hold to age 60
- Full DRIP

**Result**:

| Start age | Years invested | Total contributed | Final portfolio (real €) |
|-----------|---------------|------------------|-------------------------|
| 22 | 38 | €91,200 | **€405,000** |
| 27 | 33 | €79,200 | €280,000 |
| 32 | 28 | €67,200 | €195,000 |

**The 22→32 gap is €210,000. The 22→27 gap is €125,000.**

You contributed €24,000 more by starting at 22 vs 32. The market gave you €186,000 extra on top of that. That's compounding doing what compounding does — disproportionately rewarding the early decade.

A few things worth noting for European context:

- These are real returns (after ~3% inflation), so the final number is in today's purchasing power. Don't multiply by inflation again.
- Tax wrappers matter MASSIVELY. PEA in France, Abgeltungsteuer in DE, ISA in UK — using the right account can add 15-25% to your final number. Don't sleep on this.
- Currency hedging is mostly noise over 30+ years. Don't overthink it.
- Single ETF (VWCE) beats trying to construct your own portfolio for 95% of people. The diversification is already there.

**The boring truth**: the difference between getting wealthy and not isn't picking the right stocks. It's just starting earlier and not stopping during dips. Everything else is rounding error.

If anyone wants to plug their own numbers, there's a free simulator I built that handles real returns and compares start-age scenarios — it's at younginvestor.app (link in comments to avoid the auto-spam filter).

What's your starting age and monthly amount? Curious what the EuropeFIRE community looks like demographically.

---

## Post #2 — r/eupersonalfinance

**Title**: PSA: stop using American compound interest calculators. Here's what European investors actually need to know.

**Body**:

Every "compound interest calculator" you find on Google is American: 401(k) talk, no PEA, no ISA, no Abgeltungsteuer, no MiFID rules. So I'll lay out what's actually different for us.

**1. Your tax wrapper changes everything.**

A €10,000 portfolio growing at 7%/year for 30 years becomes:
- ~€76K in a regular CTO (compte-titres) after French flat tax
- ~€84K in a German Depot after Abgeltungsteuer
- ~€95K in a French PEA after 5 years (12.8% removed)
- ~€110K in a UK ISA (zero tax)

Same investment. Same return. Wildly different end result. The difference between a CTO and an ISA over 30 years is roughly **€34,000 on a €10K starting amount**.

**2. Currency matters less than you think.**

If you invest in VWCE (USD-denominated underlying), you take USD/EUR risk. Over 1 year, this can be ±15%. Over 30 years, it averages out. Don't pay for currency hedging unless you're within 5 years of needing the money.

**3. Your broker actually matters here.**

Trade Republic, DEGIRO, Interactive Brokers — these are the three serious options for most EU residents. Avoid local bank brokers (Boursorama, ING Direct, Comdirect) — fees are 5-10x higher and they often steer you to actively managed funds with 1.5%+ TER.

**4. ETF taxation rules differ wildly.**

- **France**: PEA holds only EU-domiciled UCITS ETFs. Most US ETFs (VTI, VOO, SPY) are NOT eligible. Use VWCE or CW8.
- **Germany**: Vorabpauschale (advance lump sum tax) on accumulating ETFs. Annoying but manageable.
- **UK**: ISA is the obvious answer. £20K/year limit, then taxable account.

**5. Real returns ≠ nominal returns.**

The S&P 500 historical average is 10% nominal but 7% real (after inflation). When projecting to 30+ years, use 7% or your number is fantasy.

---

If you want a calculator that handles real-vs-nominal, multiple tax wrappers, currency, and EU-specific rules, I built one at younginvestor.app (free, no signup). I'll drop a link in comments if anyone wants it — happy to compare with whatever you're using now.

What are you actually using for projections? Curious if there's a good EU-native tool I'm missing.

---

## Post #3 — r/FrenchInvesting (or r/vosfinances)

**Title**: PEA vs Compte-Titres : la différence sur 25 ans avec 200€/mois (j'ai fait les maths)

**Body**:

Question récurrente ici : "PEA ou CTO pour DCA dans VWCE/CW8 ?" J'ai fait les maths proprement, voici le résultat.

**Setup** :
- 200€/mois investis pendant 25 ans
- 7% rendement réel annuel (après inflation, conservateur)
- DRIP complet (réinvestissement automatique)
- Vente à la fin

**Hypothèses fiscales** (2026) :
- **PEA** : 5 ans de détention → 17,2% de prélèvements sociaux uniquement sur les gains
- **CTO** : Prélèvement Forfaitaire Unique (PFU) à 30% sur les gains (plus-values + dividendes)

**Résultats** :

| Enveloppe | Valeur brute à 25 ans | Après impôts | Net dans la poche |
|-----------|----------------------|--------------|-------------------|
| PEA | 152 000€ | -15 800€ PS | **136 200€** |
| CTO | 152 000€ | -27 600€ PFU | 124 400€ |

**La différence : ~12 000€ pour un même investissement, simplement à cause de l'enveloppe choisie.**

Avec 500€/mois, l'écart passe à 30 000€. Avec 1000€/mois, ça monte à 60 000€+.

**Quelques nuances importantes :**

1. **Plafond PEA** : 150 000€ versés. Au-delà, vous devez basculer sur un CTO. Pour la plupart des gens en DCA mensuel jusqu'à 50 ans, ce n'est pas un blocage.

2. **ETF éligibles PEA** : Pas de US ETFs (VTI, VOO). Vous prenez Amundi PEA S&P 500 (PE500), CW8, ou ESE. Les frais sont de 0.15-0.30% — légèrement plus chers que VTI (0.03%) mais la différence est largement compensée par l'avantage fiscal du PEA.

3. **Sortie avant 5 ans** : 30% de PFU comme un CTO + clôture du PEA. À éviter.

4. **Cash dans le PEA** : Si vous ne le réinvestissez pas immédiatement, ça compte dans le plafond. Versement = engagement.

**Conclusion personnelle** :
- Si vous êtes éligible PEA (résident fiscal France) → PEA d'abord, jusqu'au plafond
- CTO en complément pour les ETFs non-PEA-éligibles ou au-delà du plafond
- Assurance-vie en multi-supports = utile uniquement pour la transmission, pas pour la performance

---

Si quelqu'un veut faire ses propres calculs avec ses chiffres exacts, j'ai construit un simulateur qui gère explicitement PEA vs CTO (français), Abgeltungsteuer (allemand), ISA (UK). C'est gratuit, sans inscription : younginvestor.app (lien en commentaire pour éviter le filtre anti-spam).

Quelle est votre stratégie ? Tout PEA, mix PEA+CTO, ou autre ?

---

## How to actually post these

For each one:
1. **Pre-post check**: read the sub's pinned post / sidebar rules. Some require flair, some ban links, some require a minimum karma.
2. **Time of post**: weekday morning EU time (8-10am CET) gets best engagement on EU-focused subs.
3. **First 30 minutes are critical**: Reply to every comment immediately. Reddit's algo boosts posts with active engagement.
4. **Don't drop the link in the body**. Drop it in your FIRST comment after the post is up: "For anyone who asked, here's the calculator I mentioned: [link]". This is the universally-accepted way to share a tool without getting auto-removed.
5. **Don't crosspost** the same content within 48h. Customize each version to the specific sub's tone.
6. **After posting**: check back at +2h, +6h, +24h to keep replying. Engagement compounds.

## Account warmup (if you're new to Reddit)

If your account is brand new, Reddit will probably shadowban these posts. Spend 2-3 weeks first:
- Comment in 5+ posts/day in target subs (genuine, helpful answers)
- Build 200+ comment karma
- THEN post your value-first piece

This is annoying but it's the difference between "shadowbanned post nobody sees" and "front page of the sub."
