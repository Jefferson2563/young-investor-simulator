/* ============================================
   YOUNG INVESTOR SIMULATOR - APP LOGIC
   ============================================ */

// --- State ---
let currency = '$';
let chart = null;

// --- DOM Elements ---
const els = {
    initial: document.getElementById('initialInvestment'),
    monthly: document.getElementById('monthlyContribution'),
    rate: document.getElementById('annualReturn'),
    years: document.getElementById('years'),
    initialVal: document.getElementById('initialValue'),
    monthlyVal: document.getElementById('monthlyValue'),
    returnVal: document.getElementById('returnValue'),
    yearsVal: document.getElementById('yearsValue'),
    goalAmount: document.getElementById('goalAmount'),
    goalCard: document.getElementById('goalCard'),
    totalInvested: document.getElementById('totalInvested'),
    totalInterest: document.getElementById('totalInterest'),
    multiplier: document.getElementById('multiplier'),
    goalYears: document.getElementById('goalYears'),
    milestones: document.getElementById('milestones'),
    startAt20: document.getElementById('startAt20'),
    startAt30: document.getElementById('startAt30'),
    comparisonDiff: document.getElementById('comparisonDiff'),
    bigQuote: document.getElementById('bigQuote'),
    quoteAuthor: document.getElementById('quoteAuthor'),
};

// --- Quotes ---
const quotes = [
    { text: "Compound interest is the eighth wonder of the world.", author: "Albert Einstein" },
    { text: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
    { text: "It's not about timing the market, it's about time in the market.", author: "Keith Banks" },
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
];

// --- Format money ---
function formatMoney(amount, compact) {
    if (compact && amount >= 1000000) {
        return currency + (amount / 1000000).toFixed(1) + 'M';
    }
    if (compact && amount >= 100000) {
        return currency + (amount / 1000).toFixed(0) + 'K';
    }
    return currency + Math.round(amount).toLocaleString('en-US');
}

// --- Calculate compound interest ---
function calculate(initial, monthly, rate, years) {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    const yearlyData = [];
    let balance = initial;
    let totalContributed = initial;

    for (let m = 1; m <= months; m++) {
        balance = balance * (1 + monthlyRate) + monthly;
        totalContributed += monthly;

        if (m % 12 === 0) {
            yearlyData.push({
                year: m / 12,
                balance: balance,
                invested: totalContributed,
                interest: balance - totalContributed,
            });
        }
    }

    return {
        finalBalance: balance,
        totalContributed,
        totalInterest: balance - totalContributed,
        yearlyData,
    };
}

// --- Find year to reach target ---
function yearsToReach(initial, monthly, rate, target) {
    const monthlyRate = rate / 100 / 12;
    let balance = initial;
    for (let m = 1; m <= 600; m++) { // max 50 years
        balance = balance * (1 + monthlyRate) + monthly;
        if (balance >= target) {
            return (m / 12).toFixed(1);
        }
    }
    return null;
}

// --- Update chart ---
function updateChart(yearlyData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const labels = yearlyData.map(d => 'Year ' + d.year);
    const balances = yearlyData.map(d => d.balance);
    const invested = yearlyData.map(d => d.invested);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#888' : '#666';

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = balances;
        chart.data.datasets[1].data = invested;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.update('none');
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Value',
                    data: balances,
                    borderColor: isDark ? '#ffffff' : '#000000',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: isDark ? '#ffffff' : '#000000',
                },
                {
                    label: 'Amount Invested',
                    data: invested,
                    borderColor: isDark ? '#555555' : '#bbbbbb',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: textColor,
                        font: { family: 'Inter', size: 11 },
                        boxWidth: 12,
                        padding: 16,
                        usePointStyle: true,
                    },
                },
                tooltip: {
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#aaa' : '#555',
                    borderColor: isDark ? '#333' : '#ddd',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: 'Space Grotesk', weight: '600', size: 13 },
                    bodyFont: { family: 'Inter', size: 12 },
                    callbacks: {
                        label: function (ctx) {
                            return ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y);
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: 'Inter', size: 10 },
                        maxTicksLimit: 10,
                    },
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: 'Inter', size: 10 },
                        callback: (v) => formatMoney(v, true),
                    },
                },
            },
        },
    });
}

// --- Update milestones ---
function updateMilestones(initial, monthly, rate, years) {
    const targets = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const icons = ['🌱', '🌿', '🪴', '🌳', '🏔️', '💎', '🚀', '🏦', '👑'];
    const result = calculate(initial, monthly, rate, years);

    let html = '';
    targets.forEach((target, i) => {
        const yearReached = yearsToReach(initial, monthly, rate, target);
        const reached = result.finalBalance >= target;
        html += `
            <div class="milestone ${reached ? 'reached' : ''}">
                <span class="milestone-icon">${icons[i]}</span>
                <span class="milestone-amount">${formatMoney(target, true)}</span>
                ${reached && yearReached ? `<span class="milestone-year">Year ${yearReached}</span>` : ''}
            </div>
        `;
    });
    els.milestones.innerHTML = html;
}

// --- Update comparison ---
function updateComparison(monthly, rate) {
    const res20 = calculate(0, monthly, rate, 30); // 20 to 50
    const res30 = calculate(0, monthly, rate, 20); // 30 to 50

    els.startAt20.textContent = formatMoney(res20.finalBalance);
    els.startAt30.textContent = formatMoney(res30.finalBalance);

    const diff = res20.finalBalance - res30.finalBalance;
    const pct = ((diff / res30.finalBalance) * 100).toFixed(0);
    els.comparisonDiff.innerHTML = `Starting 10 years earlier gives you <strong>${formatMoney(diff)}</strong> more (${pct}% more). Time beats everything.`;
}

// --- Main update ---
function update() {
    const initial = parseFloat(els.initial.value);
    const monthly = parseFloat(els.monthly.value);
    const rate = parseFloat(els.rate.value);
    const years = parseInt(els.years.value);

    // Update display values
    els.initialVal.textContent = formatMoney(initial);
    els.monthlyVal.textContent = formatMoney(monthly);
    els.returnVal.textContent = rate + '%';
    els.yearsVal.textContent = years + (years === 1 ? ' year' : ' years');

    // Calculate
    const result = calculate(initial, monthly, rate, years);

    // Update goal
    els.goalAmount.textContent = formatMoney(result.finalBalance);
    if (result.finalBalance >= 100000) {
        els.goalCard.classList.add('hit');
    } else {
        els.goalCard.classList.remove('hit');
    }

    // Update stats
    els.totalInvested.textContent = formatMoney(result.totalContributed);
    els.totalInterest.textContent = formatMoney(result.totalInterest);

    const mult = result.totalContributed > 0
        ? (result.finalBalance / result.totalContributed).toFixed(1)
        : '0';
    els.multiplier.textContent = mult + 'x';

    const yrs100k = yearsToReach(initial, monthly, rate, 100000);
    els.goalYears.textContent = yrs100k ? yrs100k + ' yrs' : '50+ yrs';

    // Update chart
    updateChart(result.yearlyData);

    // Update milestones
    updateMilestones(initial, monthly, rate, years);

    // Update comparison
    updateComparison(monthly, rate);

    // Update slider fills
    updateSliderFills();
}

// --- Slider visual fill ---
function updateSliderFills() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const fillColor = isDark ? '#ffffff' : '#000000';
        const trackColor = isDark ? '#222222' : '#e0e0e0';
        slider.style.background = `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, ${trackColor} ${pct}%, ${trackColor} 100%)`;
    });
}

// --- Theme Toggle ---
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);

    // Recreate chart for theme colors
    if (chart) {
        chart.destroy();
        chart = null;
    }
    update();
}

function updateThemeIcon(theme) {
    document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// --- Currency Toggle ---
function initCurrency() {
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currency = btn.dataset.currency;
            update();
        });
    });
}

// --- Quote Rotation ---
function initQuotes() {
    let idx = Math.floor(Math.random() * quotes.length);
    function showQuote() {
        els.bigQuote.textContent = quotes[idx].text;
        els.quoteAuthor.textContent = '— ' + quotes[idx].author;
        idx = (idx + 1) % quotes.length;
    }
    showQuote();
    setInterval(showQuote, 8000);
}

// --- Event Listeners ---
function initListeners() {
    [els.initial, els.monthly, els.rate, els.years].forEach(slider => {
        slider.addEventListener('input', update);
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

// --- Init ---
function init() {
    initTheme();
    initListeners();
    initCurrency();
    initQuotes();
    update();
}

// Wait for Chart.js to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
