# Young Investor Simulator

A free, interactive investment simulator built for young people to visualize the power of compound interest and starting early.

**Live site:** [https://jefferson2563.github.io/young-investor-simulator/](https://jefferson2563.github.io/young-investor-simulator/)

---

## What it does

This simulator lets you play with investment parameters and instantly see how your money grows over time:

- **Starting amount** (default: $500)
- **Monthly contribution** (default: $100/month)
- **Annual return rate** (default: 15%)
- **Investment duration** (default: 30 years)

It shows a real-time growth chart, milestone tracker, an "age 20 vs 30" comparison, and motivational quotes from investing legends like Warren Buffett, Jeff Bezos, and more.

## Features

| Feature | Description |
|---------|-------------|
| Interactive sliders | Adjust all parameters and see results instantly |
| Growth chart | Visual chart showing total value vs amount invested |
| Milestone tracker | See when you hit $1K, $5K, $10K... up to $1M |
| Age comparison | Start at 20 vs 30 - same money, massive difference |
| Investor legends | Cards featuring Buffett, Zuckerberg, Bezos, Musk, Dalio, Lynch |
| Dark/Light theme | Toggle between black and white themes |
| Currency toggle | Switch between USD ($) and EUR |
| Quote carousel | Rotating investment quotes for motivation |
| Mobile responsive | Works on phone, tablet, and desktop |
| SEO optimized | Meta tags, Open Graph, semantic HTML |

## Project Structure

```
young-investor-simulator/
├── index.html          # Main HTML (semantic, SEO-ready)
├── css/
│   └── style.css       # All styles (CSS variables, dark/light themes)
├── js/
│   └── app.js          # Core logic (calculator, chart, UI interactions)
├── assets/
│   └── logo.svg        # Custom SVG logo
├── package.json        # Project metadata & dev server script
└── README.md           # This file
```

## Tech Stack

- **HTML5** - Semantic markup with accessibility in mind
- **CSS3** - Custom properties (variables), CSS Grid, Flexbox, media queries
- **Vanilla JavaScript** - No framework, IIFE pattern, clean modular code
- **Chart.js** - For the interactive growth chart (loaded via CDN)
- **Google Fonts** - Inter + Space Grotesk typefaces
- **GitHub Pages** - Free hosting and deployment

## How to Run Locally

```bash
# Clone the repo
git clone https://github.com/Jefferson2563/young-investor-simulator.git
cd young-investor-simulator

# Install dev dependencies
npm install

# Start local server
npm start

# Open http://localhost:3000
```

Or simply open `index.html` directly in your browser - no build step needed.

## Default Settings

| Parameter | Default Value |
|-----------|--------------|
| Starting amount | $500 |
| Monthly contribution | $100 |
| Annual return | 15% |
| Duration | 30 years |
| **Projected result** | **~$736,000** |

## What's Next

Here are potential improvements for future versions:

- [ ] Add inflation adjustment toggle
- [ ] Add tax impact simulation
- [ ] Add specific index fund comparisons (S&P 500, NASDAQ, etc.)
- [ ] Add a "share your results" feature (screenshot/social sharing)
- [ ] Add more languages (French, Spanish, etc.)
- [ ] Add a "what if I started at age X" interactive timeline
- [ ] Progressive Web App (PWA) support for offline use
- [ ] Add real historical market data overlay on the chart
- [ ] Blog/education section with investing basics for beginners

## Disclaimer

This simulator is for **educational purposes only**. Past returns do not guarantee future results. The default 15% return is optimistic and used to demonstrate compound interest power. Historical S&P 500 average is ~10% before inflation. Always do your own research before investing.

## License

MIT - Free to use, modify, and distribute.

---

Built for the next generation of investors.
