/* ============================================
   YOUNG INVESTOR SIMULATOR - Core Logic
   ============================================ */

(function () {
    'use strict';

    // --- State ---
    let currency = '$';
    let chart = null;
    const STORAGE_KEY = 'yis-simulation';

    // --- DOM Cache ---
    const $ = (id) => document.getElementById(id);
    const els = {
        initial:       $('initialInvestment'),
        monthly:       $('monthlyContribution'),
        rate:          $('annualReturn'),
        years:         $('years'),
        initialVal:    $('initialValue'),
        monthlyVal:    $('monthlyValue'),
        returnVal:     $('returnValue'),
        yearsVal:      $('yearsValue'),
        heroAmount:    $('heroAmount'),
        goalAmount:    $('goalAmount'),
        goalCard:      $('goalCard'),
        totalInvested: $('totalInvested'),
        totalInterest: $('totalInterest'),
        multiplier:    $('multiplier'),
        goalYears:     $('goalYears'),
        milestones:    $('milestones'),
        startAt20:     $('startAt20'),
        startAt30:     $('startAt30'),
        compDiff:      $('comparisonDiff'),
        bigQuote:      $('bigQuote'),
        quoteAuthor:   $('quoteAuthor'),
        navbar:        $('navbar'),
        toast:         $('toast'),
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
        { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Benjamin Graham" },
        { text: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
        { text: "Wide diversification is only required when investors do not understand what they are doing.", author: "Warren Buffett" },
    ];

    // --- Utilities ---
    function formatMoney(amount, compact) {
        if (compact && amount >= 1_000_000) return currency + (amount / 1_000_000).toFixed(1) + 'M';
        if (compact && amount >= 100_000) return currency + (amount / 1_000).toFixed(0) + 'K';
        return currency + Math.round(amount).toLocaleString('en-US');
    }

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
                    balance,
                    invested: totalContributed,
                    interest: balance - totalContributed,
                });
            }
        }

        return { finalBalance: balance, totalContributed, totalInterest: balance - totalContributed, yearlyData };
    }

    function yearsToReach(initial, monthly, rate, target) {
        const monthlyRate = rate / 100 / 12;
        let balance = initial;
        for (let m = 1; m <= 600; m++) {
            balance = balance * (1 + monthlyRate) + monthly;
            if (balance >= target) return (m / 12).toFixed(1);
        }
        return null;
    }

    // --- Toast notifications ---
    function showToast(message) {
        els.toast.textContent = message;
        els.toast.classList.add('show');
        setTimeout(() => els.toast.classList.remove('show'), 2500);
    }

    // --- Save / Load simulation ---
    function saveSimulation() {
        const data = {
            initial: els.initial.value,
            monthly: els.monthly.value,
            rate: els.rate.value,
            years: els.years.value,
            currency: currency,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showToast('Saved to this browser! Your settings will be here when you come back.');
    }

    function loadSimulation() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;

        try {
            const data = JSON.parse(raw);
            els.initial.value = data.initial;
            els.monthly.value = data.monthly;
            els.rate.value = data.rate;
            els.years.value = data.years;

            if (data.currency) {
                currency = data.currency;
                document.querySelectorAll('.currency-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.currency === currency);
                });
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    // --- Chart ---
    function updateChart(yearlyData) {
        const ctx = $('growthChart').getContext('2d');
        const labels = yearlyData.map(d => 'Year ' + d.year);
        const balances = yearlyData.map(d => d.balance);
        const invested = yearlyData.map(d => d.invested);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#666' : '#999';
        const lineColor = isDark ? '#ffffff' : '#0a0a0a';
        const dashedColor = isDark ? '#333' : '#ccc';
        const tooltipBg = isDark ? '#111' : '#fff';
        const tooltipText = isDark ? '#fff' : '#000';
        const tooltipBody = isDark ? '#888' : '#666';

        if (chart) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = balances;
            chart.data.datasets[0].borderColor = lineColor;
            chart.data.datasets[0].backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
            chart.data.datasets[0].pointHoverBackgroundColor = lineColor;
            chart.data.datasets[1].data = invested;
            chart.data.datasets[1].borderColor = dashedColor;
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
                        borderColor: lineColor,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: lineColor,
                    },
                    {
                        label: 'Amount Invested',
                        data: invested,
                        borderColor: dashedColor,
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
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
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
                        backgroundColor: tooltipBg,
                        titleColor: tooltipText,
                        bodyColor: tooltipBody,
                        borderColor: isDark ? '#222' : '#eee',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: 'Space Grotesk', weight: '600', size: 13 },
                        bodyFont: { family: 'Inter', size: 12 },
                        callbacks: {
                            label: (ctx) => ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y),
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 }, maxTicksLimit: 10 },
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Inter', size: 10 }, callback: (v) => formatMoney(v, true) },
                    },
                },
            },
        });
    }

    // --- Milestones ---
    function updateMilestones(initial, monthly, rate, years) {
        const targets = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
        const icons = ['🌱', '🌿', '🪴', '🌳', '🏔️', '💎', '🚀', '🏦', '👑'];
        const result = calculate(initial, monthly, rate, years);

        els.milestones.innerHTML = targets.map((target, i) => {
            const yr = yearsToReach(initial, monthly, rate, target);
            const reached = result.finalBalance >= target;
            return `<div class="milestone ${reached ? 'reached' : ''}">
                <span class="milestone-icon">${icons[i]}</span>
                <span class="milestone-amount">${formatMoney(target, true)}</span>
                ${reached && yr ? `<span class="milestone-year">Year ${yr}</span>` : ''}
            </div>`;
        }).join('');
    }

    // --- Comparison ---
    function updateComparison(monthly, rate) {
        const res20 = calculate(0, monthly, rate, 30);
        const res30 = calculate(0, monthly, rate, 20);
        els.startAt20.textContent = formatMoney(res20.finalBalance);
        els.startAt30.textContent = formatMoney(res30.finalBalance);

        const diff = res20.finalBalance - res30.finalBalance;
        const pct = ((diff / res30.finalBalance) * 100).toFixed(0);
        els.compDiff.innerHTML = `Starting 10 years earlier = <strong>${formatMoney(diff)}</strong> more (${pct}%). Time beats everything.`;
    }

    // --- Slider Fills ---
    function updateSliderFills() {
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const fill = isDark ? '#ffffff' : '#0a0a0a';
            const track = isDark ? '#1a1a1a' : '#e0e0e0';
            slider.style.background = `linear-gradient(to right, ${fill} ${pct}%, ${track} ${pct}%)`;
        });
    }

    // --- Main Update ---
    function update() {
        const initial = parseFloat(els.initial.value);
        const monthly = parseFloat(els.monthly.value);
        const rate = parseFloat(els.rate.value);
        const years = parseInt(els.years.value);

        els.initialVal.textContent = formatMoney(initial);
        els.monthlyVal.textContent = formatMoney(monthly);
        els.returnVal.textContent = rate + '%';
        els.yearsVal.textContent = years + (years === 1 ? ' year' : ' years');

        const result = calculate(initial, monthly, rate, years);

        // Hero + Goal
        els.heroAmount.textContent = formatMoney(result.finalBalance);
        els.goalAmount.textContent = formatMoney(result.finalBalance);
        els.goalCard.classList.toggle('hit', result.finalBalance >= 100000);

        // Stats
        els.totalInvested.textContent = formatMoney(result.totalContributed);
        els.totalInterest.textContent = formatMoney(result.totalInterest);
        els.multiplier.textContent = result.totalContributed > 0
            ? (result.finalBalance / result.totalContributed).toFixed(1) + 'x'
            : '0x';

        const yrs100k = yearsToReach(initial, monthly, rate, 100000);
        els.goalYears.textContent = yrs100k ? yrs100k + ' yrs' : '50+ yrs';

        updateChart(result.yearlyData);
        updateMilestones(initial, monthly, rate, years);
        updateComparison(monthly, rate);
        updateSliderFills();
    }

    // --- Theme ---
    function initTheme() {
        const saved = localStorage.getItem('yis-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        $('themeIcon').textContent = saved === 'dark' ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('yis-theme', next);
        $('themeIcon').textContent = next === 'dark' ? '☀️' : '🌙';
        if (chart) { chart.destroy(); chart = null; }
        update();
    }

    // --- Currency ---
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

    // --- Quotes ---
    function initQuotes() {
        let idx = Math.floor(Math.random() * quotes.length);
        function show() {
            els.bigQuote.textContent = quotes[idx].text;
            els.quoteAuthor.textContent = '— ' + quotes[idx].author;
            idx = (idx + 1) % quotes.length;
        }
        show();
        setInterval(show, 8000);
    }

    // --- Navbar scroll effect ---
    function initNavbar() {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            els.navbar.style.borderBottomColor = scrollY > 100 ? 'var(--border-light)' : 'var(--border)';
        }, { passive: true });
    }

    // --- Smooth scroll for anchor links ---
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', (e) => {
                const target = document.querySelector(a.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // --- Save button ---
    function initSave() {
        $('saveBtn').addEventListener('click', saveSimulation);
    }

    // --- Init ---
    function init() {
        initTheme();

        // Load saved simulation if exists
        const loaded = loadSimulation();
        if (loaded) {
            showToast('Welcome back! Your last simulation was restored from this browser.');
        }

        initCurrency();
        initQuotes();
        initNavbar();
        initSmoothScroll();
        initSave();

        [els.initial, els.monthly, els.rate, els.years].forEach(s => {
            s.addEventListener('input', update);
        });

        $('themeToggle').addEventListener('click', toggleTheme);

        update();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
