# Dividend Tool — Competitive Analysis (April 2026)

Researched competitors, compared feature-by-feature with `younginvestor.app/dividends/`. This is what I actually verified.

## Competitor matrix

| Feature | YoungInvestor | DividendChannel | DRIPCalc | WealthSim | Stoculator | AIHouses | DividendCalculator.io |
|---|---|---|---|---|---|---|---|
| Initial + monthly contribution | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Dividend growth modeling | Yes | Limited | Yes | Yes | No | Yes | Yes |
| Stock/ETF presets | **12** | No | No | No | Many | 3 (SCHD/QQQ/SPX) | No |
| **Quick scenario presets** | **Yes (5)** | No | No | No | No | No | No |
| **Goal Mode (solve years)** | **Yes** | No | No | No | No | No | No |
| **Shareable URL with state** | **Yes** | No | No | No | No | No | No |
| Year-by-year breakdown table | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| DRIP vs no-DRIP comparison | Yes | Yes | No | No | No | No | No |
| Tax-adjusted projection | Yes (Pro) | No | No | No | No | Yes | No |
| Inflation-adjusted | Yes (Pro) | No | No | Yes | No | No | No |
| Monte Carlo simulation | No | No | No | **Yes** | No | No | No |
| Historical backtesting | No | No | No | No | **Yes** | No | No |
| FIRE / passive-income meter | Yes (Pro) | No | No | No | No | No | No |
| Multi-language | **Yes (7)** | English | English | English | English | English | English |
| Mobile responsive | Yes | Limited | Yes | Yes | Yes | Yes | Yes |
| Free version | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Paid version | €4.99/mo | No | No | Yes | No | No | No |
| PDF export | Yes (Pro) | No | No | Yes | No | No | No |

## Where YoungInvestor wins (genuinely)

1. **Goal Mode is unique.** No other free DRIP calculator solves the inverse problem ("given my contribution, when do I hit $X/month income?"). Competitors only project forward — user has to manually trial-and-error to find the answer.

2. **Quick scenarios with named investing styles** — Conservative/Balanced/Growth/Income/CoastFIRE. Competitors require you to fill 8 fields manually.

3. **Shareable URLs** — every other tool requires screenshots. We share the actual interactive scenario.

4. **7 languages** — Arabic and Chinese specifically. Almost zero competition in those markets for this exact tool category.

5. **12 ticker presets** — most competitors have none or 3.

6. **Visual polish** — gold-themed UI, charts, FIRE meter. Most competitors look like 2003 spreadsheets.

## Where competitors win (and we should consider)

1. **Monte Carlo (WealthSim)** — Institutional-grade. Shows probability of success, not just deterministic projection. **Worth adding.** A "show me the 10th and 90th percentile" toggle would beat 90% of free tools immediately.

2. **Historical backtesting (Stoculator)** — Uses real past prices/dividends. Lets users say "if I had invested $X in SCHD in 2010, what would I have today?" **Worth adding** but requires historical data file (1-time setup).

3. **Real ticker integration (AIHouses)** — Pulls live ticker data for SCHD/QQQ/etc. Requires API like Alpha Vantage. Out of scope for now.

## Honest verdict

For deterministic forward projections (the core use case): **YoungInvestor is best-in-class for free**. The combination of Goal Mode + Scenarios + multi-lang + presets + visual quality beats every free competitor.

For probabilistic / scientific projections: WealthSim is ahead. We could close that gap with a Monte Carlo toggle — meaningful 1-2 day project.

For backtesting "what would have happened": Stoculator wins. We could match this by shipping a small historical dataset (S&P 500 + top 20 dividend tickers since 1990) and a "Backtest mode" toggle.

## Recommended roadmap (if you want to go from "best-in-class free deterministic" to "best free overall")

**Sprint A (1 week)** — close the Monte Carlo gap:
- Add a "Show probability range" toggle in Pro
- Run 1,000 simulations using historical S&P 500 return distribution (mean 10%, stddev 16%)
- Render 10th / 50th / 90th percentile bands on the chart
- This single feature beats every free competitor on rigour

**Sprint B (1-2 weeks)** — historical backtest:
- Ship `data/historical-dividends.json` with monthly data 1990-2026 for SCHD/VTI/SPY/QQQ/VYM/JEPI + 10 individual dividend stocks
- Add "Backtest mode" toggle on the calculator
- Show "If you had invested $X in [ETF] in [year], you would have $Y today, with $Z in dividends"
- This is the killer SEO feature — every "how much would $1000 in SCHD have grown to" query lands here

**Sprint C (out of scope without API budget)** — live data:
- Alpha Vantage API for live yields and prices
- Ticker autocomplete
- Skip unless you have $50/mo to spend on data

## Sources verified

- [DividendChannel DRIP Calculator](https://www.dividendchannel.com/drip-returns-calculator/)
- [DRIPCalc](https://www.dripcalc.com/)
- [WealthSim DRIP Calculator](https://www.wealthsim.app/calculator/dividend-reinvestment-calculator)
- [Stoculator](https://stoculator.com/)
- [AIHouses DRIP Calculator](https://aihouses.net/en/dividend-calculator)
- [DividendCalculator.io](https://dividendcalculator.io/dividend-reinvestment-calculator)
