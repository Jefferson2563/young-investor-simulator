/* ============================================
   YOUNG INVESTOR SIMULATOR - Core Logic
   With Authentication, Cloud Save, Fullscreen Chart
   ============================================ */

// --- Global auth/modal functions (called from HTML onclick) ---
let currentUser = null;

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('signinError').textContent = '';
    document.getElementById('signupError').textContent = '';
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('signinForm').style.display = tab === 'signin' ? 'flex' : 'none';
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'flex' : 'none';
    document.getElementById('authTitle').textContent = tab === 'signin' ? 'Sign In' : 'Create Account';
}

async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    const errorEl = document.getElementById('signinError');
    const btn = document.getElementById('signinSubmit');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = friendlyError(err.code);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const errorEl = document.getElementById('signupError');
    const btn = document.getElementById('signupSubmit');

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorEl.textContent = '';

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = friendlyError(err.code);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

async function handleGoogleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        closeAuthModal();
    } catch (err) {
        document.getElementById('signinError').textContent = friendlyError(err.code);
    }
}

function handleSignOut() {
    auth.signOut();
}

// --- Share results ---
function shareResults() {
    const data = window._yisGetData();
    if (!data || !data.result) return;
    const r = data.result;
    const fmt = window._yisFormatMoney;
    const text = `I just simulated my investment future!\n\n` +
        `Final value: ${fmt(r.finalBalance)}\n` +
        `I put in: ${fmt(r.totalContributed)}\n` +
        `Market gave me: ${fmt(r.totalInterest)}\n` +
        `Money multiplied: ${r.totalContributed > 0 ? (r.finalBalance / r.totalContributed).toFixed(1) + 'x' : '0x'}\n\n` +
        `Try it yourself: ${window.location.href}\n` +
        `#YoungInvestorSimulator #Investing #CompoundInterest`;

    if (navigator.share) {
        navigator.share({
            title: 'My Investment Simulation',
            text: text,
            url: window.location.href,
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            window._yisShowToast('Results copied to clipboard! Share it anywhere.');
        }).catch(() => {
            // Fallback: select text in a prompt
            prompt('Copy your results:', text);
        });
    }
}

function handleUpgradePro() {
    // Stripe Checkout integration
    // Replace with your Stripe payment link when you set up Stripe
    const STRIPE_LINK = 'https://buy.stripe.com/YOUR_PAYMENT_LINK';
    if (STRIPE_LINK.includes('YOUR_PAYMENT_LINK')) {
        alert('Stripe payment not configured yet. See js/firebase-config.js for setup instructions.');
        return;
    }
    window.open(STRIPE_LINK, '_blank');
}

function friendlyError(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Try again.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/invalid-credential': 'Invalid email or password.',
    };
    return messages[code] || 'Something went wrong. Please try again.';
}

// --- Fullscreen chart ---
let fullscreenChartInstance = null;

function openFullscreen() {
    const overlay = document.getElementById('fullscreenChart');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderFullscreenChart();
}

function closeFullscreen() {
    const overlay = document.getElementById('fullscreenChart');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (fullscreenChartInstance) {
        fullscreenChartInstance.destroy();
        fullscreenChartInstance = null;
    }
}

// --- Main App IIFE ---
(function () {
    'use strict';

    // --- State ---
    let currency = '$';
    let chart = null;
    let lastYearlyData = null;
    let lastResult = null;
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

    // Expose formatMoney globally for fullscreen chart
    window._yisFormatMoney = formatMoney;

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

    // Expose showToast globally
    window._yisShowToast = showToast;

    // --- Save / Load simulation ---
    async function saveSimulation() {
        const data = {
            initial: els.initial.value,
            monthly: els.monthly.value,
            rate: els.rate.value,
            years: els.years.value,
            currency: currency,
            savedAt: new Date().toISOString(),
        };

        // Always save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // If logged in, also save to Firestore
        if (currentUser) {
            try {
                await db.collection('simulations').doc(currentUser.uid).set(data);
                showToast('Saved to your account! Access from any device.');
            } catch (err) {
                showToast('Saved locally. Cloud sync error — try again later.');
            }
        } else {
            showToast('Saved to this browser! Sign in to save across devices.');
        }
    }

    function loadSimulation() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;

        try {
            const data = JSON.parse(raw);
            applySimData(data);
            return true;
        } catch (e) {
            return false;
        }
    }

    function applySimData(data) {
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
    }

    async function loadFromCloud() {
        if (!currentUser) return;
        try {
            const doc = await db.collection('simulations').doc(currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                applySimData(data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                update();
                showToast('Welcome back! Your simulation was loaded from the cloud.');
            }
        } catch (err) {
            // Silently fail - localStorage backup exists
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
        lastYearlyData = result.yearlyData;
        lastResult = result;

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

    // Expose update and data globally for fullscreen chart
    window._yisGetData = () => ({ yearlyData: lastYearlyData, result: lastResult });

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

    // --- i18n / Language selector ---
    const translations = {
        en: { heroTitle1: 'Your money could be', heroBadge: 'Built for Gen Z & Millennials', heroSub: 'Starting with just $500 and $100/month. No trust fund needed.', heroSub2: 'See for yourself below.', heroCta: 'Try the simulator', simTitle: 'Play with the numbers', simDesc: 'Move the sliders. Watch your future change in real-time.', starting: 'Starting amount', monthly: 'Monthly contribution', annual: 'Annual return', duration: 'Duration', youPutIn: 'You put in', marketGave: 'Market gave you', multiplied: 'Money multiplied', toHit100k: 'To hit 100K', share: 'Share my results', milestoneTitle: 'Your milestones', milestoneDesc: 'Each one brings you closer to financial freedom.', compTitle: 'Starting at 20 vs 30', compDesc: 'Same monthly amount. 10 years difference. Life-changing gap.', legendsTitle: 'They all started young', legendsDesc: "The world's greatest investors didn't wait. Neither should you.", signIn: 'Sign In', flag: 'EN' },
        fr: { heroTitle1: 'Votre argent pourrait devenir', heroBadge: 'Fait pour la Gen Z & Millennials', heroSub: 'En commen\u00e7ant avec 500$ et 100$/mois. Pas besoin de fonds fiduciaire.', heroSub2: 'V\u00e9rifiez par vous-m\u00eame ci-dessous.', heroCta: 'Essayer le simulateur', simTitle: 'Jouez avec les chiffres', simDesc: 'Bougez les curseurs. Regardez votre avenir changer en temps r\u00e9el.', starting: 'Montant initial', monthly: 'Contribution mensuelle', annual: 'Rendement annuel', duration: 'Dur\u00e9e', youPutIn: 'Vous avez mis', marketGave: 'Le march\u00e9 vous a donn\u00e9', multiplied: 'Argent multipli\u00e9', toHit100k: 'Pour atteindre 100K', share: 'Partager mes r\u00e9sultats', milestoneTitle: 'Vos jalons', milestoneDesc: 'Chacun vous rapproche de la libert\u00e9 financi\u00e8re.', compTitle: 'Commencer \u00e0 20 vs 30 ans', compDesc: 'M\u00eame montant mensuel. 10 ans de diff\u00e9rence. \u00c9cart qui change la vie.', legendsTitle: 'Ils ont tous commenc\u00e9 jeunes', legendsDesc: "Les plus grands investisseurs n'ont pas attendu. Vous non plus.", signIn: 'Connexion', flag: 'FR' },
        es: { heroTitle1: 'Tu dinero podr\u00eda ser', heroBadge: 'Hecho para Gen Z y Millennials', heroSub: 'Empezando con $500 y $100/mes. Sin fondo fiduciario.', heroSub2: 'Compru\u00e9balo t\u00fa mismo.', heroCta: 'Probar el simulador', simTitle: 'Juega con los n\u00fameros', simDesc: 'Mueve los controles. Mira tu futuro cambiar en tiempo real.', starting: 'Cantidad inicial', monthly: 'Contribuci\u00f3n mensual', annual: 'Rendimiento anual', duration: 'Duraci\u00f3n', youPutIn: 'Pusiste', marketGave: 'El mercado te dio', multiplied: 'Dinero multiplicado', toHit100k: 'Para llegar a 100K', share: 'Compartir mis resultados', milestoneTitle: 'Tus hitos', milestoneDesc: 'Cada uno te acerca a la libertad financiera.', compTitle: 'Empezar a los 20 vs 30', compDesc: 'Mismo monto mensual. 10 a\u00f1os de diferencia. Brecha que cambia la vida.', legendsTitle: 'Todos empezaron j\u00f3venes', legendsDesc: 'Los mayores inversores no esperaron. T\u00fa tampoco.', signIn: 'Iniciar sesi\u00f3n', flag: 'ES' },
        pt: { heroTitle1: 'Seu dinheiro poderia ser', heroBadge: 'Feito para Gen Z & Millennials', heroSub: 'Come\u00e7ando com $500 e $100/m\u00eas. Sem fundo fiduci\u00e1rio.', heroSub2: 'Veja por si mesmo abaixo.', heroCta: 'Experimentar o simulador', simTitle: 'Brinque com os n\u00fameros', simDesc: 'Mova os controles. Veja seu futuro mudar em tempo real.', starting: 'Valor inicial', monthly: 'Contribui\u00e7\u00e3o mensal', annual: 'Retorno anual', duration: 'Dura\u00e7\u00e3o', youPutIn: 'Voc\u00ea colocou', marketGave: 'O mercado te deu', multiplied: 'Dinheiro multiplicado', toHit100k: 'Para atingir 100K', share: 'Compartilhar meus resultados', milestoneTitle: 'Seus marcos', milestoneDesc: 'Cada um te aproxima da liberdade financeira.', compTitle: 'Come\u00e7ar aos 20 vs 30', compDesc: 'Mesmo valor mensal. 10 anos de diferen\u00e7a. Diferen\u00e7a que muda a vida.', legendsTitle: 'Todos come\u00e7aram jovens', legendsDesc: 'Os maiores investidores n\u00e3o esperaram. Voc\u00ea tamb\u00e9m n\u00e3o.', signIn: 'Entrar', flag: 'PT' },
        de: { heroTitle1: 'Dein Geld k\u00f6nnte werden', heroBadge: 'Gebaut f\u00fcr Gen Z & Millennials', heroSub: 'Starte mit $500 und $100/Monat. Kein Treuhandfonds n\u00f6tig.', heroSub2: '\u00dcberzeuge dich selbst.', heroCta: 'Simulator ausprobieren', simTitle: 'Spiel mit den Zahlen', simDesc: 'Bewege die Regler. Sieh deine Zukunft in Echtzeit.', starting: 'Startbetrag', monthly: 'Monatlicher Beitrag', annual: 'J\u00e4hrliche Rendite', duration: 'Dauer', youPutIn: 'Du hast eingezahlt', marketGave: 'Der Markt gab dir', multiplied: 'Geld multipliziert', toHit100k: 'Bis 100K', share: 'Meine Ergebnisse teilen', milestoneTitle: 'Deine Meilensteine', milestoneDesc: 'Jeder bringt dich der finanziellen Freiheit n\u00e4her.', compTitle: 'Start mit 20 vs 30', compDesc: 'Gleicher Betrag. 10 Jahre Unterschied. Lebensver\u00e4ndernde L\u00fccke.', legendsTitle: 'Sie haben alle jung angefangen', legendsDesc: 'Die gr\u00f6\u00dften Investoren haben nicht gewartet. Du auch nicht.', signIn: 'Anmelden', flag: 'DE' },
        ar: { heroTitle1: '\u0623\u0645\u0648\u0627\u0644\u0643 \u064a\u0645\u0643\u0646 \u0623\u0646 \u062a\u0635\u0628\u062d', heroBadge: '\u0645\u0635\u0645\u0645 \u0644\u0644\u062c\u064a\u0644 \u0632\u064a \u0648\u0627\u0644\u0645\u064a\u0644\u064a\u0646\u064a\u0627\u0644', heroSub: '\u0627\u0628\u062f\u0623 \u0628\u0640 500$ \u0648 100$/\u0634\u0647\u0631.', heroSub2: '\u062c\u0631\u0628 \u0628\u0646\u0641\u0633\u0643.', heroCta: '\u062c\u0631\u0628 \u0627\u0644\u0645\u062d\u0627\u0643\u064a', simTitle: '\u0627\u0644\u0639\u0628 \u0628\u0627\u0644\u0623\u0631\u0642\u0627\u0645', simDesc: '\u062d\u0631\u0643 \u0627\u0644\u0645\u0632\u0627\u0644\u0642. \u0634\u0627\u0647\u062f \u0645\u0633\u062a\u0642\u0628\u0644\u0643 \u064a\u062a\u063a\u064a\u0631.', starting: '\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0623\u0648\u0644\u064a', monthly: '\u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0629 \u0627\u0644\u0634\u0647\u0631\u064a\u0629', annual: '\u0627\u0644\u0639\u0627\u0626\u062f \u0627\u0644\u0633\u0646\u0648\u064a', duration: '\u0627\u0644\u0645\u062f\u0629', youPutIn: '\u0623\u0646\u062a \u0648\u0636\u0639\u062a', marketGave: '\u0627\u0644\u0633\u0648\u0642 \u0623\u0639\u0637\u0627\u0643', multiplied: '\u0627\u0644\u0645\u0627\u0644 \u062a\u0636\u0627\u0639\u0641', toHit100k: '\u0644\u0644\u0648\u0635\u0648\u0644 \u0644 100K', share: '\u0634\u0627\u0631\u0643 \u0646\u062a\u0627\u0626\u062c\u064a', milestoneTitle: '\u0625\u0646\u062c\u0627\u0632\u0627\u062a\u0643', milestoneDesc: '\u0643\u0644 \u0648\u0627\u062d\u062f \u064a\u0642\u0631\u0628\u0643 \u0645\u0646 \u0627\u0644\u062d\u0631\u064a\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629.', compTitle: '\u0627\u0644\u0628\u062f\u0621 \u0641\u064a 20 \u0645\u0642\u0627\u0628\u0644 30', compDesc: '\u0646\u0641\u0633 \u0627\u0644\u0645\u0628\u0644\u063a. 10 \u0633\u0646\u0648\u0627\u062a \u0641\u0631\u0642.', legendsTitle: '\u0643\u0644\u0647\u0645 \u0628\u062f\u0623\u0648\u0627 \u0635\u063a\u0627\u0631\u0627', legendsDesc: '\u0623\u0639\u0638\u0645 \u0627\u0644\u0645\u0633\u062a\u062b\u0645\u0631\u064a\u0646 \u0644\u0645 \u064a\u0646\u062a\u0638\u0631\u0648\u0627.', signIn: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', flag: 'AR' },
        zh: { heroTitle1: '\u4f60\u7684\u94b1\u53ef\u4ee5\u53d8\u6210', heroBadge: '\u4e13\u4e3a Z \u4e16\u4ee3\u548c\u5343\u79a7\u4e00\u4ee3\u6253\u9020', heroSub: '\u4ece 500$ \u548c\u6bcf\u6708 100$ \u5f00\u59cb\u3002', heroSub2: '\u81ea\u5df1\u770b\u770b\u4e0b\u9762\u3002', heroCta: '\u8bd5\u8bd5\u6a21\u62df\u5668', simTitle: '\u73a9\u8f6c\u6570\u5b57', simDesc: '\u79fb\u52a8\u6ed1\u5757\u3002\u5b9e\u65f6\u89c2\u770b\u4f60\u7684\u672a\u6765\u53d8\u5316\u3002', starting: '\u8d77\u59cb\u91d1\u989d', monthly: '\u6bcf\u6708\u8d21\u732e', annual: '\u5e74\u56de\u62a5\u7387', duration: '\u65f6\u95f4', youPutIn: '\u4f60\u6295\u5165\u4e86', marketGave: '\u5e02\u573a\u7ed9\u4f60', multiplied: '\u94b1\u7ffb\u500d', toHit100k: '\u8fbe\u5230 100K', share: '\u5206\u4eab\u6211\u7684\u7ed3\u679c', milestoneTitle: '\u4f60\u7684\u91cc\u7a0b\u7891', milestoneDesc: '\u6bcf\u4e00\u4e2a\u90fd\u8ba9\u4f60\u66f4\u63a5\u8fd1\u8d22\u52a1\u81ea\u7531\u3002', compTitle: '20\u5c81 vs 30\u5c81\u5f00\u59cb', compDesc: '\u76f8\u540c\u6708\u989d\u300210\u5e74\u5dee\u8ddd\u3002\u6539\u53d8\u4eba\u751f\u7684\u5dee\u8ddd\u3002', legendsTitle: '\u4ed6\u4eec\u90fd\u5f88\u5e74\u8f7b\u5c31\u5f00\u59cb\u4e86', legendsDesc: '\u4e16\u754c\u4e0a\u6700\u4f1f\u5927\u7684\u6295\u8d44\u8005\u6ca1\u6709\u7b49\u5f85\u3002\u4f60\u4e5f\u4e0d\u5e94\u8be5\u3002', signIn: '\u767b\u5f55', flag: 'ZH' },
    };

    let currentLang = localStorage.getItem('yis-lang') || 'en';

    function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('yis-lang', lang);
        const t = translations[lang] || translations.en;

        // Update flag button
        $('langFlag').textContent = t.flag;

        // Update active state
        document.querySelectorAll('.lang-option').forEach(o => {
            o.classList.toggle('active', o.dataset.lang === lang);
        });

        // Apply to key UI elements
        const map = {
            '.hero-badge': t.heroBadge,
            '.hero-subtitle': t.heroSub + '<br>' + t.heroSub2,
            '.hero-cta span:first-child': t.heroCta,
            '#authBtn': t.signIn,
        };

        // Hero title (first part only, amount stays)
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const amount = $('heroAmount').outerHTML;
            heroTitle.innerHTML = t.heroTitle1 + '<br>' + amount;
        }

        // Simulator section
        const simHeader = document.querySelector('.simulator .section-title');
        const simDesc = document.querySelector('.simulator .section-desc');
        if (simHeader) simHeader.textContent = t.simTitle;
        if (simDesc) simDesc.textContent = t.simDesc;

        // Labels
        const labels = document.querySelectorAll('.control-header label');
        if (labels[0]) labels[0].textContent = t.starting;
        if (labels[1]) labels[1].textContent = t.monthly;
        if (labels[2]) labels[2].textContent = t.annual;
        if (labels[3]) labels[3].textContent = t.duration;

        // Stats
        const statLabels = document.querySelectorAll('.stat-label');
        if (statLabels[0]) statLabels[0].textContent = t.youPutIn;
        if (statLabels[1]) statLabels[1].textContent = t.marketGave;
        if (statLabels[2]) statLabels[2].textContent = t.multiplied;
        if (statLabels[3]) statLabels[3].textContent = t.toHit100k;

        // Share button
        const shareText = document.querySelector('[data-i18n="share"]');
        if (shareText) shareText.textContent = t.share;

        // Milestones
        const msTitle = document.querySelector('.milestones-section .section-title');
        const msDesc = document.querySelector('.milestones-section .section-desc');
        if (msTitle) msTitle.textContent = t.milestoneTitle;
        if (msDesc) msDesc.textContent = t.milestoneDesc;

        // Comparison
        const cmpTitle = document.querySelector('.comparison-section .section-title');
        const cmpDesc = document.querySelector('.comparison-section .section-desc');
        if (cmpTitle) cmpTitle.textContent = t.compTitle;
        if (cmpDesc) cmpDesc.textContent = t.compDesc;

        // Legends
        const legTitle = document.querySelector('.legends-section .section-title');
        const legDesc = document.querySelector('.legends-section .section-desc');
        if (legTitle) legTitle.textContent = t.legendsTitle;
        if (legDesc) legDesc.textContent = t.legendsDesc;

        // Auth button
        const authBtn = $('authBtn');
        if (authBtn && authBtn.style.display !== 'none') {
            authBtn.textContent = t.signIn;
        }

        // RTL for Arabic
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Close menu
        $('langDropdown').classList.remove('open');
    }

    function initLanguage() {
        // Toggle dropdown
        $('langBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            $('langDropdown').classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', () => {
            $('langDropdown').classList.remove('open');
        });

        // Language options
        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                applyLanguage(opt.dataset.lang);
            });
        });

        // Apply saved language
        if (currentLang !== 'en') {
            applyLanguage(currentLang);
        } else {
            $('langFlag').textContent = 'EN';
        }
    }

    // --- Fullscreen chart on double-click ---
    function initFullscreen() {
        const chartContainer = $('chartContainer');
        chartContainer.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFullscreen();
        });
        // Also listen on the canvas itself
        $('growthChart').addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openFullscreen();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
                closeAuthModal();
            }
        });

        // Close auth modal on overlay click
        $('authModal').addEventListener('click', (e) => {
            if (e.target === $('authModal')) closeAuthModal();
        });
    }

    // --- Auth state listener ---
    function initAuth() {
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            const authBtn = $('authBtn');
            const userMenu = $('userMenu');
            const userAvatar = $('userAvatar');

            if (user) {
                authBtn.style.display = 'none';
                userMenu.style.display = 'flex';
                const initials = (user.displayName || user.email || '?')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                userAvatar.textContent = initials;
                loadFromCloud();
            } else {
                authBtn.style.display = '';
                userMenu.style.display = 'none';
            }
        });
    }

    // --- Init ---
    function init() {
        initTheme();

        // Load saved simulation if exists
        const loaded = loadSimulation();
        if (loaded) {
            showToast('Welcome back! Your last simulation was restored.');
        }

        initCurrency();
        initQuotes();
        initNavbar();
        initSmoothScroll();
        initSave();
        initFullscreen();
        initLanguage();
        initAuth();

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

// --- Fullscreen chart renderer (outside IIFE to access global) ---
function renderFullscreenChart() {
    const data = window._yisGetData();
    if (!data || !data.yearlyData) return;

    const canvas = document.getElementById('fullscreenCanvas');
    const ctx = canvas.getContext('2d');
    const formatMoney = window._yisFormatMoney;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#888' : '#666';
    const lineColor = isDark ? '#ffffff' : '#0a0a0a';
    const dashedColor = isDark ? '#444' : '#bbb';
    const tooltipBg = isDark ? '#111' : '#fff';
    const tooltipText = isDark ? '#fff' : '#000';
    const greenColor = isDark ? '#00e676' : '#00a854';

    const labels = data.yearlyData.map(d => 'Year ' + d.year);
    const balances = data.yearlyData.map(d => d.balance);
    const invested = data.yearlyData.map(d => d.invested);

    if (fullscreenChartInstance) {
        fullscreenChartInstance.destroy();
    }

    fullscreenChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Value',
                    data: balances,
                    borderColor: greenColor,
                    backgroundColor: isDark ? 'rgba(0,230,118,0.05)' : 'rgba(0,168,84,0.05)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: greenColor,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: greenColor,
                },
                {
                    label: 'Amount Invested',
                    data: invested,
                    borderColor: dashedColor,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0,
                    pointRadius: 2,
                    pointHoverRadius: 6,
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
                    labels: {
                        color: textColor,
                        font: { family: 'Inter', size: 14 },
                        boxWidth: 16,
                        padding: 24,
                        usePointStyle: true,
                    },
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: textColor,
                    borderColor: isDark ? '#333' : '#ddd',
                    borderWidth: 1,
                    padding: 16,
                    cornerRadius: 10,
                    titleFont: { family: 'Space Grotesk', weight: '600', size: 16 },
                    bodyFont: { family: 'Inter', size: 14 },
                    callbacks: {
                        label: (ctx) => ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y),
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter', size: 13 } },
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter', size: 13 }, callback: (v) => formatMoney(v, true) },
                },
            },
        },
    });

    // Update fullscreen stats
    const statsEl = document.getElementById('fullscreenStats');
    const r = data.result;
    statsEl.innerHTML = `
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value">${formatMoney(r.finalBalance)}</div>
            <div class="fullscreen-stat-label">Final Value</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value">${formatMoney(r.totalContributed)}</div>
            <div class="fullscreen-stat-label">You Put In</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value green">${formatMoney(r.totalInterest)}</div>
            <div class="fullscreen-stat-label">Market Gave You</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value green">${r.totalContributed > 0 ? (r.finalBalance / r.totalContributed).toFixed(1) + 'x' : '0x'}</div>
            <div class="fullscreen-stat-label">Money Multiplied</div>
        </div>
    `;
}
