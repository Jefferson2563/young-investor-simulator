/* ============================================
   YOUNG INVESTOR SIMULATOR - Core Logic
   With Authentication, Cloud Save, Fullscreen Chart
   ============================================ */

// --- Welcome Back Engagement ---
(function() {
    var lastVisit = localStorage.getItem('yis-last-visit');
    var visitCount = parseInt(localStorage.getItem('yis-visit-count') || '0') + 1;
    localStorage.setItem('yis-visit-count', visitCount);
    localStorage.setItem('yis-last-visit', Date.now());

    if (lastVisit && visitCount > 1) {
        var daysSince = Math.floor((Date.now() - parseInt(lastVisit)) / 86400000);
        if (daysSince >= 1) {
            var tips = [
                'Every day you wait costs you compound interest. Let\'s simulate!',
                'Warren Buffett started at 11. You\'re right on time.',
                '$5/day = $1.8M over 40 years at 10%. Run the numbers!',
                'The best time to invest was yesterday. The second best is now.',
                'Consistency beats timing. See what monthly investing does.'
            ];
            var tip = tips[Math.floor(Math.random() * tips.length)];
            var wb = document.createElement('div');
            wb.className = 'welcome-back-toast';
            wb.innerHTML = '<div class="wb-inner"><strong>Welcome back!</strong><span>' + tip + '</span></div><button class="wb-close" aria-label="Close">&times;</button>';
            wb.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9998;background:var(--bg-elevated);border:1px solid var(--border);border-radius:12px;padding:14px 18px;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:slideIn 0.4s ease;display:flex;align-items:flex-start;gap:10px;';
            document.body.appendChild(wb);
            wb.querySelector('.wb-close').onclick = function() { wb.remove(); };
            setTimeout(function() { if (wb.parentNode) wb.remove(); }, 8000);
        }
    }
})();

// --- Challenge System ---
(function() {
    var params = new URLSearchParams(window.location.search);
    var challengeAmount = params.get('challenge');
    if (challengeAmount) {
        var amount = parseFloat(challengeAmount);
        if (!isNaN(amount) && amount > 0) {
            // Format nicely
            var formatted;
            if (amount >= 1000000) formatted = '$' + (amount / 1000000).toFixed(1) + 'M';
            else if (amount >= 1000) formatted = '$' + (amount / 1000).toFixed(0) + 'K';
            else formatted = '$' + amount.toFixed(0);

            var banner = document.getElementById('challengeBanner');
            var amountEl = document.getElementById('challengeAmount');
            if (banner && amountEl) {
                amountEl.textContent = formatted;

                var taglines = [
                    'Can you beat them? Try it now!',
                    'Think you can do better? Prove it!',
                    'Are you up for the challenge?',
                    'Your move. Set your sliders and beat this!'
                ];
                var taglineEl = document.getElementById('challengeTagline');
                if (taglineEl) taglineEl.textContent = taglines[Math.floor(Math.random() * taglines.length)];

                banner.style.display = '';
                document.body.classList.add('has-challenge');

                document.getElementById('challengeDismiss').onclick = function() {
                    banner.style.display = 'none';
                    document.body.classList.remove('has-challenge');
                };

                // Auto-dismiss after 15s
                setTimeout(function() {
                    banner.style.display = 'none';
                    document.body.classList.remove('has-challenge');
                }, 15000);
            }
        }
    }
})();

function sendChallenge() {
    var data = window._yisGetData ? window._yisGetData() : null;
    if (!data || !data.result) return;

    var amount = Math.round(data.result.finalBalance);
    var url = 'https://younginvestor.app/?challenge=' + amount;

    var shareText = 'I just simulated my investment future and got ' +
        (amount >= 1000000 ? '$' + (amount / 1000000).toFixed(1) + 'M' : '$' + amount.toLocaleString()) +
        '! Can you beat me?';

    if (navigator.share) {
        navigator.share({
            title: 'Young Investor Challenge',
            text: shareText,
            url: url
        }).catch(function() {});
    } else {
        // Fallback: copy link
        navigator.clipboard.writeText(url + '\n\n' + shareText).then(function() {
            if (window._yisShowToast) window._yisShowToast('Challenge link copied!');
        }).catch(function() {
            // Final fallback
            prompt('Copy this challenge link:', url);
        });
    }
}

// --- Social Proof Counter (live from Firestore) ---
// Only shows when user count is impressive (50+). Below that, hides entirely.
(function() {
    var MIN_SOCIAL_PROOF = 50;

    function updateCounter() {
        if (typeof db === 'undefined') return;
        db.collection('users').get().then(function(snap) {
            var count = snap.size;
            var proofEl = document.getElementById('socialProof');
            var countEl = document.getElementById('spCount');
            if (!proofEl) return;

            if (count >= MIN_SOCIAL_PROOF) {
                proofEl.style.display = '';
                if (countEl) countEl.textContent = '+' + count.toLocaleString();
            } else {
                proofEl.style.display = 'none';
            }
        }).catch(function() {});
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(updateCounter, 2000); });
    } else {
        setTimeout(updateCounter, 2000);
    }
})();

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
    const _t = (window.YIS_TRANSLATIONS || {})[localStorage.getItem('yis-lang') || 'en'] || {};
    document.getElementById('authTitle').textContent = tab === 'signin' ? (_t.signIn || 'Sign In') : (_t.createAccount || 'Create Account');
}

async function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    const errorEl = document.getElementById('signinError');
    const btn = document.getElementById('signinSubmit');

    btn.disabled = true;
    const _ts = (window.YIS_TRANSLATIONS || {})[localStorage.getItem('yis-lang') || 'en'] || {};
    btn.textContent = _ts.signingIn || 'Signing in...';
    errorEl.textContent = '';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = friendlyError(err.code);
    } finally {
        btn.disabled = false;
        btn.textContent = _ts.signIn || 'Sign In';
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
    const _tc = (window.YIS_TRANSLATIONS || {})[localStorage.getItem('yis-lang') || 'en'] || {};
    btn.textContent = _tc.creatingAccount || 'Creating account...';
    errorEl.textContent = '';

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = friendlyError(err.code);
    } finally {
        btn.disabled = false;
        btn.textContent = _tc.createAccount || 'Create Account';
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
    closeProfileDropdown();
    auth.signOut();
}

function toggleProfileDropdown() {
    var dd = document.getElementById('profileDropdown');
    if (dd) dd.classList.toggle('open');
}
function closeProfileDropdown() {
    var dd = document.getElementById('profileDropdown');
    if (dd) dd.classList.remove('open');
}
// Close dropdown on outside click
document.addEventListener('click', function(e) {
    var menu = document.getElementById('userMenu');
    if (menu && !menu.contains(e.target)) closeProfileDropdown();
});

// --- Share results (visual card) ---
function shareResults() {
    const data = window._yisGetData();
    if (!data || !data.result) return;
    const r = data.result;
    const fmt = window._yisFormatMoney;
    const _ts = (window.YIS_TRANSLATIONS || {})[localStorage.getItem('yis-lang') || 'en'] || {};

    // Create canvas card — 1080x1080 (Instagram square, best for WhatsApp)
    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Pure black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow behind the big number
    const glow = ctx.createRadialGradient(W/2, 340, 20, W/2, 340, 400);
    glow.addColorStop(0, 'rgba(0, 230, 118, 0.10)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 50, W, 600);

    // Top branding — large & clear
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '800 32px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('YOUNG INVESTOR', W / 2, 80);

    // Headline — big, readable
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px "Inter", system-ui, sans-serif';
    ctx.fillText(_ts.shareISimulated || 'My investment simulation', W / 2, 160);

    // THE BIG NUMBER — green, massive, impossible to miss
    ctx.fillStyle = '#00e676';
    ctx.font = '900 140px "Inter", system-ui, sans-serif';
    ctx.fillText(fmt(r.finalBalance), W / 2, 340);

    // Label under big number — clearly readable
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 32px "Inter", system-ui, sans-serif';
    ctx.fillText(_ts.shareFinalValue || 'Final Portfolio Value', W / 2, 395);

    // Three stats in boxes
    const stats = [
        { label: _ts.shareIPutIn || 'I put in', value: fmt(r.totalContributed) },
        { label: _ts.shareMarketGave || 'Market gave me', value: fmt(r.totalInterest) },
        { label: _ts.shareMoneyMultiplied || 'Multiplied', value: r.totalContributed > 0 ? (r.finalBalance / r.totalContributed).toFixed(1) + 'x' : '\u2014' }
    ];

    const statY = 480;
    const boxW = 300, boxH = 100, boxGap = 30;
    const startX = (W - (boxW * 3 + boxGap * 2)) / 2;
    stats.forEach((s, i) => {
        const bx = startX + i * (boxW + boxGap);
        // Box background
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(bx, statY, boxW, boxH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Value
        ctx.fillStyle = i === 0 ? '#ffffff' : '#00e676';
        ctx.font = '800 42px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.value, bx + boxW / 2, statY + 48);
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '600 22px "Inter", system-ui, sans-serif';
        ctx.fillText(s.label, bx + boxW / 2, statY + 80);
    });

    // Parameters row — your inputs
    const sliders = window._yisGetData();
    const paramItems = [
        { val: fmt(sliders.startingAmount || 0), lbl: 'Start' },
        { val: fmt(sliders.monthlyContribution || 0), lbl: '/month' },
        { val: (sliders.annualReturn || 0) + '%', lbl: 'Return' },
        { val: (sliders.years || 0) + ' yrs', lbl: 'Duration' }
    ];
    const paramY = 660;
    const pColW = W / 4;
    paramItems.forEach((p, i) => {
        const cx = pColW * i + pColW / 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 38px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.val, cx, paramY);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '600 22px "Inter", system-ui, sans-serif';
        ctx.fillText(p.lbl, cx, paramY + 34);
    });

    // Thin line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 750);
    ctx.lineTo(W - 120, 750);
    ctx.stroke();

    // Motivational quote — readable
    const quotes = [
        '"Compound interest is the eighth wonder of the world."',
        '"The best time to invest was yesterday. The next best is now."',
        '"Time in the market beats timing the market."'
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'italic 28px "Inter", system-ui, sans-serif';
    ctx.fillText(quotes[Math.floor(Math.random() * quotes.length)], W / 2, 810);

    // Bottom CTA — solid green pill
    const ctaY = 880;
    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.roundRect(200, ctaY, W - 400, 80, 40);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '700 30px "Inter", system-ui, sans-serif';
    ctx.fillText('Try it free \u2192 younginvestor.app', W / 2, ctaY + 52);

    // Watermark
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '600 22px "Inter", system-ui, sans-serif';
    ctx.fillText('younginvestor.app', W / 2, H - 40);

    // Convert to blob and share
    canvas.toBlob(function(blob) {
        if (!blob) return;
        const file = new File([blob], 'my-investment-simulation.png', { type: 'image/png' });

        // Share image only — no separate text, so WhatsApp keeps image + caption together
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                files: [file]
            }).catch(() => {});
        } else if (navigator.share) {
            navigator.share({
                title: _ts.shareTitle || 'Young Investor Simulator',
                text: `${_ts.shareISimulated || 'I just simulated my investment future!'} \u2192 younginvestor.app`,
                url: 'https://younginvestor.app/#simulator'
            }).catch(() => {});
        } else {
            // Fallback: download the image
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'my-investment-simulation.png';
            a.click();
            URL.revokeObjectURL(a.href);
            window._yisShowToast((_ts || {}).toastCopied || 'Card downloaded!');
        }
    }, 'image/png');
}

// Stripe Payment Links (each button → direct to correct Stripe page)
const STRIPE_MONTHLY = 'https://buy.stripe.com/aFa5kC9dw5mw9Uz39wfAc04';
const STRIPE_ANNUAL = 'https://buy.stripe.com/14A14m61kdT27Mr5hEfAc03';

function handleUpgradeMonthly() {
    if (!currentUser) { openAuthModal(); return; }
    // Show annual upsell before sending to monthly checkout
    var modal = document.getElementById('upsellModal');
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; return; }
    _openStripe(STRIPE_MONTHLY);
}
function handleUpgradeAnnual() { _openStripe(STRIPE_ANNUAL); }
// Keep old name as fallback for tool pages
function handleUpgradePro() { handleUpgradeMonthly(); }

function closeUpsellModal() {
    var modal = document.getElementById('upsellModal');
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}
// Called when user explicitly confirms monthly after seeing upsell
function _goMonthly() { _openStripe(STRIPE_MONTHLY); }

function _openStripe(link) {
    if (!currentUser) { openAuthModal(); return; }
    const email = currentUser.email ? `?prefilled_email=${encodeURIComponent(currentUser.email)}` : '';
    window.open(link + email, '_blank');
}

// Handle upgrade success redirect from Stripe
(function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
        // Show success toast after page loads
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                if (window._yisShowToast) {
                    window._yisShowToast('🎉 Welcome to Pro! Your 14-day trial has started.');
                }
            }, 1000);
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    }
})();

// Pricing toggle handler removed — two separate buttons now

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

    // --- Smart Slider Mapping ---
    // Maps a linear slider (0-1000) to non-linear real values via breakpoints
    const sliderMaps = {
        initial: {
            // [sliderPos, realValue] pairs — piecewise linear interpolation
            points: [[0,0],[100,1000],[200,5000],[400,10000],[600,50000],[750,100000],[850,500000],[950,1000000],[1000,10000000]],
        },
        monthly: {
            points: [[0,0],[100,250],[200,500],[400,1000],[600,2000],[750,5000],[850,10000],[950,25000],[1000,50000]],
        },
    };

    function sliderToValue(map, pos) {
        const pts = map.points;
        if (pos <= pts[0][0]) return pts[0][1];
        if (pos >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
        for (let i = 1; i < pts.length; i++) {
            if (pos <= pts[i][0]) {
                const [x0, y0] = pts[i - 1];
                const [x1, y1] = pts[i];
                const t = (pos - x0) / (x1 - x0);
                return y0 + t * (y1 - y0);
            }
        }
        return pts[pts.length - 1][1];
    }

    function valueToSlider(map, val) {
        const pts = map.points;
        if (val <= pts[0][1]) return pts[0][0];
        if (val >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
        for (let i = 1; i < pts.length; i++) {
            if (val <= pts[i][1]) {
                const [x0, y0] = pts[i - 1];
                const [x1, y1] = pts[i];
                const t = (val - y0) / (y1 - y0);
                return x0 + t * (x1 - x0);
            }
        }
        return pts[pts.length - 1][0];
    }

    // Snap values to nice round numbers based on their magnitude
    function snapValue(val) {
        if (val <= 0) return 0;
        if (val < 1000) return Math.round(val / 100) * 100;
        if (val < 10000) return Math.round(val / 500) * 500;
        if (val < 100000) return Math.round(val / 5000) * 5000;
        if (val < 1000000) return Math.round(val / 25000) * 25000;
        return Math.round(val / 100000) * 100000;
    }

    function getMappedValue(sliderId) {
        const el = els[sliderId];
        const map = sliderMaps[sliderId];
        if (!map) return parseFloat(el.value); // annualReturn and years use raw values
        return snapValue(sliderToValue(map, parseFloat(el.value)));
    }

    // --- Utilities ---
    function formatMoney(amount, compact) {
        const abs = Math.abs(amount);
        // For astronomically large numbers, use exponential notation
        if (abs >= 1e18) {
            const exp = Math.floor(Math.log10(abs));
            const mantissa = (amount / Math.pow(10, exp)).toFixed(1);
            return currency + mantissa + 'e' + exp;
        }
        // Always use compact for very large numbers
        if (abs >= 1_000_000_000_000) return currency + (amount / 1_000_000_000_000).toFixed(1) + 'T';
        if ((compact || abs >= 1e12) && abs >= 1_000_000_000) return currency + (amount / 1_000_000_000).toFixed(1) + 'B';
        if (compact && abs >= 1_000_000) return currency + (amount / 1_000_000).toFixed(1) + 'M';
        if (compact && abs >= 100_000) return currency + (amount / 1_000).toFixed(0) + 'K';
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
        if (initial >= target) return '0';
        const monthlyRate = rate / 100 / 12;
        let balance = initial;
        for (let m = 1; m <= 1200; m++) {
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
            initialMapped: getMappedValue('initial'),
            monthly: els.monthly.value,
            monthlyMapped: getMappedValue('monthly'),
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
    const allMilestones = [
        { target: 1000,        icon: '●' },
        { target: 5000,        icon: '●' },
        { target: 10000,       icon: '◆' },
        { target: 25000,       icon: '◆' },
        { target: 50000,       icon: '▲' },
        { target: 100000,      icon: '★' },
        { target: 250000,      icon: '★' },
        { target: 500000,      icon: '★' },
        { target: 1000000,     icon: '◉' },
        { target: 2500000,     icon: '◉' },
        { target: 5000000,     icon: '◉' },
        { target: 10000000,    icon: '✦' },
        { target: 50000000,    icon: '✦' },
        { target: 100000000,   icon: '✦' },
        { target: 1000000000,  icon: '✦' },
    ];

    function updateMilestones(initial, monthly, rate, years) {
        const result = calculate(initial, monthly, rate, years);
        const finalBal = result.finalBalance;

        // Filter milestones: show targets that are above starting amount and relevant to scale
        // Always show ~9 milestones for good UX
        const relevant = allMilestones.filter(m => m.target > initial * 0.5);
        const shown = relevant.slice(0, 9);

        els.milestones.innerHTML = shown.map(m => {
            const yr = yearsToReach(initial, monthly, rate, m.target);
            const reached = finalBal >= m.target;
            return `<div class="milestone ${reached ? 'reached' : ''}">
                <span class="milestone-icon">${m.icon}</span>
                <span class="milestone-amount">${formatMoney(m.target, true)}</span>
                ${reached && yr ? `<span class="milestone-year">${(translations[currentLang]||translations.en).milestoneYear} ${yr}</span>` : ''}
            </div>`;
        }).join('');
    }

    // --- Comparison ---
    function updateComparison(monthly, rate, years) {
        // Use the user's actual duration: "start at 20" gets full duration, "start at 30" gets 10 fewer years
        const earlyYears = Math.max(years, 11); // at least 11 so the late starter has 1 year
        const lateYears = Math.max(earlyYears - 10, 1);
        const res20 = calculate(0, monthly, rate, earlyYears);
        const res30 = calculate(0, monthly, rate, lateYears);
        els.startAt20.textContent = formatMoney(res20.finalBalance, res20.finalBalance >= 1_000_000);
        els.startAt30.textContent = formatMoney(res30.finalBalance, res30.finalBalance >= 1_000_000);

        const diff = res20.finalBalance - res30.finalBalance;
        const pct = res30.finalBalance > 0 ? ((diff / res30.finalBalance) * 100).toFixed(0) : '0';
        const ct = translations[currentLang] || translations.en;
        els.compDiff.innerHTML = ct.compDiffStart + `<strong>${formatMoney(diff, diff >= 1_000_000)}</strong>` + ` (${pct}%)` + ct.compDiffEnd;
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

    // --- Dynamic Goal Target ---
    // Pick the next meaningful milestone above the user's starting amount
    function getGoalTarget(initial, finalBalance) {
        const goalSteps = [100000, 250000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 1000000000];
        // Find first goal that's meaningfully above starting amount
        for (const g of goalSteps) {
            if (g > initial * 1.5 && g > 10000) return g;
        }
        return goalSteps[goalSteps.length - 1];
    }

    // --- Main Update ---
    function update() {
        const initial = getMappedValue('initial');
        const monthly = getMappedValue('monthly');
        const rate = parseFloat(els.rate.value);
        const years = parseInt(els.years.value);

        els.initialVal.textContent = formatMoney(initial);
        els.monthlyVal.textContent = formatMoney(monthly);
        els.returnVal.textContent = rate + '%';
        const t = translations[currentLang] || translations.en;
        els.yearsVal.textContent = years + ' ' + (years === 1 ? t.year : t.years);

        const result = calculate(initial, monthly, rate, years);
        lastYearlyData = result.yearlyData;
        lastResult = result;

        // Hero + Goal — use compact for very large numbers
        const useCompact = result.finalBalance >= 1_000_000_000;
        els.heroAmount.textContent = formatMoney(result.finalBalance, useCompact);
        els.goalAmount.textContent = formatMoney(result.finalBalance, useCompact);
        const goalTarget = getGoalTarget(initial, result.finalBalance);
        els.goalCard.classList.toggle('hit', result.finalBalance >= goalTarget);

        // Stats — use compact for very large numbers
        els.totalInvested.textContent = formatMoney(result.totalContributed, result.totalContributed >= 1_000_000_000);
        els.totalInterest.textContent = formatMoney(result.totalInterest, result.totalInterest >= 1_000_000_000);
        const mult = result.totalContributed > 0 ? result.finalBalance / result.totalContributed : 0;
        if (mult >= 1e6) {
            const exp = Math.floor(Math.log10(mult));
            els.multiplier.textContent = (mult / Math.pow(10, exp)).toFixed(1) + 'e' + exp + 'x';
        } else {
            els.multiplier.textContent = mult.toFixed(1) + 'x';
        }

        // Dynamic goal label
        const goalLabel = formatMoney(goalTarget, true);
        const goalLabelEl = document.getElementById('goalLabel');
        const tl = translations[currentLang] || translations.en;
        if (goalLabelEl) goalLabelEl.textContent = tl.toHitPrefix + ' ' + goalLabel;
        const yrsGoal = yearsToReach(initial, monthly, rate, goalTarget);
        els.goalYears.textContent = yrsGoal ? yrsGoal + ' ' + tl.yrs : '100+ ' + tl.yrs;

        updateChart(result.yearlyData);
        updateMilestones(initial, monthly, rate, years);
        updateComparison(monthly, rate, years);
        updateSliderFills();
    }

    // Expose update and data globally for fullscreen chart
    window._yisGetData = () => ({ yearlyData: lastYearlyData, result: lastResult });

    /* ===== PRO FEATURES ===== */

    // --- Pro: Inflation-adjusted calculation ---
    function calculateInflationAdjusted(yearlyData, inflationRate) {
        return yearlyData.map(function(d) {
            var factor = Math.pow(1 + inflationRate / 100, d.year);
            return {
                year: d.year,
                balance: d.balance / factor,
                invested: d.invested / factor
            };
        });
    }

    // --- Pro: S&P 500 historical average benchmark ---
    // Uses 10.5% nominal average for S&P 500 benchmark
    function calculateSP500Benchmark(initial, monthly, years) {
        var sp500Rate = 10.5;
        return calculate(initial, monthly, sp500Rate, years).yearlyData;
    }

    // --- Pro: Update advanced stats ---
    function updateProStats(result, inflationRate) {
        var realReturn = document.getElementById('realReturn');
        var inflationLost = document.getElementById('inflationLost');
        var monthlyIncome = document.getElementById('monthlyIncome');
        var fireNumber = document.getElementById('fireNumber');

        if (!realReturn) return; // Not on main page

        var years = parseInt(els.years.value);
        var factor = Math.pow(1 + inflationRate / 100, years);
        var realFinal = result.finalBalance / factor;
        var lost = result.finalBalance - realFinal;

        realReturn.textContent = formatMoney(realFinal, realFinal >= 1e9);
        inflationLost.textContent = '-' + formatMoney(lost, lost >= 1e9);

        // 4% rule: safe withdrawal rate for retirement
        var annualIncome = realFinal * 0.04;
        var monthlyInc = annualIncome / 12;
        monthlyIncome.textContent = formatMoney(monthlyInc, monthlyInc >= 1e6) + '/mo';

        // FIRE number: 25x annual expenses (assume expenses = monthly contribution * 12 * 2)
        var monthlyContrib = getMappedValue('monthly');
        var annualExpenses = Math.max(monthlyContrib * 12 * 2, 30000); // min $30k
        var fireTarget = annualExpenses * 25;
        fireNumber.textContent = formatMoney(fireTarget, fireTarget >= 1e9);

        // Color the FIRE number green if you've reached it
        var fireEl = fireNumber.parentElement;
        if (fireEl && realFinal >= fireTarget) {
            fireNumber.style.color = '#00e676';
        } else if (fireNumber) {
            fireNumber.style.color = '';
        }
    }

    // --- Pro: Update chart with extra datasets ---
    function updateProChart() {
        if (!chart || !lastYearlyData) return;
        var isPro = window.YIS_PREMIUM && window.YIS_PREMIUM.isPro;
        if (!isPro) {
            // Remove pro datasets if they exist
            while (chart.data.datasets.length > 2) {
                chart.data.datasets.pop();
            }
            chart.update('none');
            return;
        }

        var inflationEl = document.getElementById('inflationRate');
        var inflationRate = parseFloat(inflationEl ? inflationEl.value : 3) || 3;
        var spToggleEl = document.getElementById('spToggle');
        var showSP = spToggleEl && spToggleEl.checked;

        // Inflation-adjusted line (dataset index 2)
        var inflationData = calculateInflationAdjusted(lastYearlyData, inflationRate);
        var inflationBalances = inflationData.map(function(d) { return d.balance; });

        // Ensure we have the inflation dataset
        if (chart.data.datasets.length < 3) {
            chart.data.datasets.push({
                label: 'After Inflation',
                data: inflationBalances,
                borderColor: '#D4A843',
                backgroundColor: 'rgba(212, 168, 67, 0.05)',
                borderWidth: 2,
                borderDash: [4, 3],
                fill: false,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#D4A843',
            });
        } else {
            chart.data.datasets[2].data = inflationBalances;
        }

        // S&P 500 benchmark (dataset index 3)
        if (showSP) {
            var initial = getMappedValue('initial');
            var monthly = getMappedValue('monthly');
            var years = parseInt(els.years.value);
            var spData = calculateSP500Benchmark(initial, monthly, years);
            var spBalances = spData.map(function(d) { return d.balance; });

            if (chart.data.datasets.length < 4) {
                chart.data.datasets.push({
                    label: 'S&P 500 Avg (10.5%)',
                    data: spBalances,
                    borderColor: '#4CAF50',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [8, 4],
                    fill: false,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                });
            } else {
                chart.data.datasets[3].data = spBalances;
            }
        } else {
            // Remove S&P dataset if toggled off (by label, not index)
            chart.data.datasets = chart.data.datasets.filter(function(ds) {
                return ds.label !== 'S&P 500 Avg (10.5%)';
            });
        }

        chart.update('none');

        // Update pro stats
        updateProStats(lastResult, inflationRate);
    }

    // --- Pro: Wire inflation slider and S&P toggle ---
    function wireProControls() {
        var inflationSlider = document.getElementById('inflationRate');
        var inflationVal = document.getElementById('inflationValue');
        var spToggleEl = document.getElementById('spToggle');

        if (inflationSlider && inflationVal) {
            inflationSlider.addEventListener('input', function() {
                inflationVal.textContent = inflationSlider.value + '%';
                updateProChart();
                // Update slider fill with gold accent
                var pct = ((inflationSlider.value - inflationSlider.min) / (inflationSlider.max - inflationSlider.min)) * 100;
                var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                inflationSlider.style.background = 'linear-gradient(to right, #D4A843 ' + pct + '%, ' + (isDark ? '#1a1a1a' : '#e0e0e0') + ' ' + pct + '%)';
            });
        }

        if (spToggleEl) {
            spToggleEl.addEventListener('change', function() {
                updateProChart();
            });
        }

        // Re-run pro chart when premium status changes
        if (window.YIS_PREMIUM) {
            window.YIS_PREMIUM.onStatusChange(function() {
                updateProChart();
                // Initialize inflation slider fill
                if (inflationSlider) {
                    inflationSlider.dispatchEvent(new Event('input'));
                }
            });
        }
    }

    // Handle both cases: DOM already loaded or not yet
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireProControls);
    } else {
        wireProControls();
    }

    // --- Pro: PDF Export ---
    window.exportPDF = function() {
        if (!window.YIS_PREMIUM || !window.YIS_PREMIUM.isPro) return;
        if (!lastResult || !lastYearlyData) return;

        var initial = getMappedValue('initial');
        var monthly = getMappedValue('monthly');
        var rate = parseFloat(els.rate.value);
        var years = parseInt(els.years.value);
        var inflationRate = parseFloat((document.getElementById('inflationRate') || {}).value) || 3;
        var factor = Math.pow(1 + inflationRate / 100, years);
        var realFinal = lastResult.finalBalance / factor;

        // Build HTML content for print
        var html = '<!DOCTYPE html><html><head><title>Investment Report - Young Investor Simulator</title>';
        html += '<style>';
        html += 'body{font-family:Inter,system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#222}';
        html += 'h1{font-size:24px;border-bottom:3px solid #D4A843;padding-bottom:12px;color:#D4A843}';
        html += 'h2{font-size:18px;margin-top:28px;color:#333}';
        html += '.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}';
        html += '.card{background:#f8f8f8;border-radius:8px;padding:16px;border-left:3px solid #D4A843}';
        html += '.card-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px}';
        html += '.card-value{font-size:22px;font-weight:700;margin-top:4px}';
        html += '.green{color:#00a854}';
        html += '.gold{color:#D4A843}';
        html += 'table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}';
        html += 'th{background:#D4A843;color:#fff;padding:8px 12px;text-align:left}';
        html += 'td{padding:6px 12px;border-bottom:1px solid #eee}';
        html += 'tr:nth-child(even){background:#f9f9f9}';
        html += '.footer{margin-top:40px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}';
        html += '.pro-badge{display:inline-block;background:#D4A843;color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:8px}';
        html += '</style></head><body>';

        html += '<h1>Investment Simulation Report <span class="pro-badge">PRO</span></h1>';
        html += '<p style="color:#666;font-size:13px;">Generated on ' + new Date().toLocaleDateString() + ' by Young Investor Simulator</p>';

        html += '<h2>Parameters</h2>';
        html += '<div class="grid">';
        html += '<div class="card"><div class="card-label">Starting Amount</div><div class="card-value">' + formatMoney(initial) + '</div></div>';
        html += '<div class="card"><div class="card-label">Monthly Contribution</div><div class="card-value">' + formatMoney(monthly) + '</div></div>';
        html += '<div class="card"><div class="card-label">Annual Return</div><div class="card-value">' + rate + '%</div></div>';
        html += '<div class="card"><div class="card-label">Duration</div><div class="card-value">' + years + ' years</div></div>';
        html += '</div>';

        html += '<h2>Results</h2>';
        html += '<div class="grid">';
        html += '<div class="card"><div class="card-label">Final Portfolio Value</div><div class="card-value green">' + formatMoney(lastResult.finalBalance) + '</div></div>';
        html += '<div class="card"><div class="card-label">Total Invested</div><div class="card-value">' + formatMoney(lastResult.totalContributed) + '</div></div>';
        html += '<div class="card"><div class="card-label">Market Returns</div><div class="card-value green">' + formatMoney(lastResult.totalInterest) + '</div></div>';
        var mult = lastResult.totalContributed > 0 ? (lastResult.finalBalance / lastResult.totalContributed).toFixed(1) : '0';
        html += '<div class="card"><div class="card-label">Money Multiplied</div><div class="card-value">' + mult + 'x</div></div>';
        html += '</div>';

        html += '<h2>Pro Analysis</h2>';
        html += '<div class="grid">';
        html += '<div class="card"><div class="card-label">After Inflation (' + inflationRate + '%)</div><div class="card-value gold">' + formatMoney(realFinal) + '</div></div>';
        html += '<div class="card"><div class="card-label">Purchasing Power Lost</div><div class="card-value" style="color:#e53935">-' + formatMoney(lastResult.finalBalance - realFinal) + '</div></div>';
        var monthlyPassive = (realFinal * 0.04 / 12);
        html += '<div class="card"><div class="card-label">Monthly Passive Income (4%)</div><div class="card-value green">' + formatMoney(monthlyPassive) + '/mo</div></div>';
        var annualExpenses = Math.max(monthly * 12 * 2, 30000);
        html += '<div class="card"><div class="card-label">FIRE Number (25x expenses)</div><div class="card-value gold">' + formatMoney(annualExpenses * 25) + '</div></div>';
        html += '</div>';

        html += '<h2>Year-by-Year Breakdown</h2>';
        html += '<table><tr><th>Year</th><th>Invested</th><th>Portfolio Value</th><th>After Inflation</th><th>Interest Earned</th></tr>';
        var inflAdj = calculateInflationAdjusted(lastYearlyData, inflationRate);
        lastYearlyData.forEach(function(d, i) {
            // Show every year for short durations, every 5 for longer
            if (years <= 20 || d.year % 5 === 0 || d.year === years) {
                html += '<tr>';
                html += '<td>' + d.year + '</td>';
                html += '<td>' + formatMoney(d.invested) + '</td>';
                html += '<td style="font-weight:600">' + formatMoney(d.balance) + '</td>';
                html += '<td style="color:#D4A843">' + formatMoney(inflAdj[i].balance) + '</td>';
                html += '<td style="color:#00a854">' + formatMoney(d.interest) + '</td>';
                html += '</tr>';
            }
        });
        html += '</table>';

        html += '<div class="footer">';
        html += '<strong>Young Investor Simulator</strong> &mdash; younginvestor.app<br>';
        html += 'This is a projection, not financial advice. Past performance does not guarantee future results.';
        html += '</div>';

        html += '</body></html>';

        // Open in new window and trigger print
        var win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(function() { win.print(); }, 500);
    };

    // --- Pro: Saved Simulations (cloud) ---
    var SAVED_SIMS_KEY = 'saved-simulations';

    window.openSavedSimulations = function() {
        document.getElementById('savedSimsModal').classList.add('active');
        loadSavedSimulationsList();
    };

    window.closeSavedSimulations = function() {
        document.getElementById('savedSimsModal').classList.remove('active');
    };

    async function loadSavedSimulationsList() {
        var listEl = document.getElementById('savedSimsList');
        var countEl = document.getElementById('savedSimsCount');
        if (!listEl || !currentUser) return;

        listEl.innerHTML = '<div class="saved-sims-empty">Loading...</div>';

        try {
            var snap = await db.collection('users').doc(currentUser.uid)
                .collection('savedSimulations').orderBy('savedAt', 'desc').limit(10).get();

            if (snap.empty) {
                listEl.innerHTML = '<div class="saved-sims-empty">No saved simulations yet. Use "Save Current as New" below.</div>';
                countEl.textContent = '0';
                return;
            }

            countEl.textContent = snap.size;
            listEl.innerHTML = '';

            snap.forEach(function(doc) {
                var d = doc.data();
                var item = document.createElement('div');
                item.className = 'saved-sim-item';
                item.innerHTML = '<div class="saved-sim-info">' +
                    '<div class="saved-sim-name">' + escapeHtml(d.name || 'Untitled') + '</div>' +
                    '<div class="saved-sim-detail">' + formatMoney(d.initialMapped || 0) + ' start · ' + formatMoney(d.monthlyMapped || 0) + '/mo · ' + (d.rate || 10) + '% · ' + (d.years || 30) + 'y</div>' +
                    '</div>' +
                    '<div class="saved-sim-amount">' + formatMoney(d.finalBalance || 0, true) + '</div>' +
                    '<div class="saved-sim-actions">' +
                    '<button class="saved-sim-del" title="Delete" data-id="' + doc.id + '">&times;</button>' +
                    '</div>';

                // Click to load
                item.querySelector('.saved-sim-info').addEventListener('click', function() {
                    applySimData(d);
                    update();
                    closeSavedSimulations();
                    showToast('Loaded: ' + (d.name || 'Untitled'));
                });

                // Delete button
                item.querySelector('.saved-sim-del').addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteSavedSimulation(doc.id);
                });

                listEl.appendChild(item);
            });
        } catch(err) {
            listEl.innerHTML = '<div class="saved-sims-empty">Could not load. Try again.</div>';
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    window.saveNamedSimulation = async function() {
        if (!currentUser || !window.YIS_PREMIUM || !window.YIS_PREMIUM.isPro) return;

        // Check slot limit
        var snap = await db.collection('users').doc(currentUser.uid)
            .collection('savedSimulations').get();
        if (snap.size >= 10) {
            showToast('You have reached the 10-simulation limit. Delete one first.');
            return;
        }

        var name = prompt('Name this simulation:');
        if (!name || !name.trim()) return;

        var data = {
            name: name.trim(),
            initial: els.initial.value,
            initialMapped: getMappedValue('initial'),
            monthly: els.monthly.value,
            monthlyMapped: getMappedValue('monthly'),
            rate: els.rate.value,
            years: els.years.value,
            currency: currency,
            finalBalance: lastResult ? lastResult.finalBalance : 0,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('users').doc(currentUser.uid)
                .collection('savedSimulations').add(data);
            showToast('Saved: ' + name.trim());
            loadSavedSimulationsList();
        } catch(err) {
            showToast('Save failed. Try again.');
        }
    };

    async function deleteSavedSimulation(docId) {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid)
                .collection('savedSimulations').doc(docId).delete();
            showToast('Simulation deleted.');
            loadSavedSimulationsList();
        } catch(err) {
            showToast('Delete failed.');
        }
    }

    // Hook into main update() to also update pro features
    var _origUpdate = update;
    update = function() {
        _origUpdate();
        if (window.YIS_PREMIUM && window.YIS_PREMIUM.isPro) {
            updateProChart();
        }
    };

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
    const translations = window.YIS_TRANSLATIONS || {};

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

        // RTL for Arabic
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // --- Hero ---
        const heroBadge = document.querySelector('.hero-badge');
        if (heroBadge) heroBadge.textContent = t.heroBadge;
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) heroTitle.innerHTML = t.heroTitle1 + '<br>' + $('heroAmount').outerHTML;
        const heroSub = document.querySelector('.hero-subtitle');
        if (heroSub) heroSub.innerHTML = t.heroSub + '<br>' + t.heroSub2;
        const heroCta = document.querySelector('.hero-cta span:first-child');
        if (heroCta) heroCta.textContent = t.heroCta;

        // --- Goal Banner ---
        const goalLabel = document.querySelector('.goal-label');
        if (goalLabel) goalLabel.textContent = t.goalLabel;
        const goalQuote = document.querySelector('.goal-quote');
        if (goalQuote) goalQuote.textContent = t.goalQuote;

        // --- Simulator ---
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

        // Historical returns
        const returnsTitle = document.querySelector('.returns-ref-title');
        if (returnsTitle) returnsTitle.textContent = t.returnsTitle;
        const returnsNote = document.querySelector('.returns-ref-note');
        if (returnsNote) returnsNote.textContent = t.returnsNote;
        const returnsLabels = document.querySelectorAll('.returns-ref-label');
        const returnsPeriods = document.querySelectorAll('.returns-ref-period');
        if (returnsLabels[3]) returnsLabels[3].textContent = t.returnsBonds;
        if (returnsLabels[4]) returnsLabels[4].textContent = t.returnsSavings;
        if (returnsLabels[5]) returnsLabels[5].textContent = t.returnsInflation;
        if (returnsPeriods[3]) returnsPeriods[3].textContent = t.returnsBondsPeriod;
        if (returnsPeriods[4]) returnsPeriods[4].textContent = t.returnsSavingsPeriod;
        if (returnsPeriods[5]) returnsPeriods[5].textContent = t.returnsInflationPeriod;

        // Chart expand hint
        const chartHint = document.querySelector('.chart-expand-hint');
        if (chartHint) chartHint.textContent = t.chartExpandHint;

        // Stats
        const statLabels = document.querySelectorAll('.stat-label');
        if (statLabels[0]) statLabels[0].textContent = t.youPutIn;
        if (statLabels[1]) statLabels[1].textContent = t.marketGave;
        if (statLabels[2]) statLabels[2].textContent = t.multiplied;

        // Share button
        const shareText = document.querySelector('[data-i18n="share"]');
        if (shareText) shareText.textContent = t.share;

        // --- Milestones ---
        const msTitle = document.querySelector('.milestones-section .section-title');
        const msDesc = document.querySelector('.milestones-section .section-desc');
        if (msTitle) msTitle.textContent = t.milestoneTitle;
        if (msDesc) msDesc.textContent = t.milestoneDesc;

        // --- Comparison ---
        const cmpTitle = document.querySelector('.comparison-section .section-title');
        const cmpDesc = document.querySelector('.comparison-section .section-desc');
        if (cmpTitle) cmpTitle.textContent = t.compTitle;
        if (cmpDesc) cmpDesc.textContent = t.compDesc;
        const cmpBadge = document.querySelector('.comparison-badge');
        if (cmpBadge) cmpBadge.textContent = t.compBadge;
        const cmpAges = document.querySelectorAll('.comparison-age');
        if (cmpAges[0]) cmpAges[0].textContent = t.compStartAt20;
        if (cmpAges[1]) cmpAges[1].textContent = t.compStartAt30;
        const cmpDetails = document.querySelectorAll('.comparison-detail');
        if (cmpDetails[0]) cmpDetails[0].textContent = t.compByAge + ' 50';
        if (cmpDetails[1]) cmpDetails[1].textContent = t.compByAge + ' 50';

        // --- Legends ---
        const legTitle = document.querySelector('.legends-section .section-title');
        const legDesc = document.querySelector('.legends-section .section-desc');
        if (legTitle) legTitle.textContent = t.legendsTitle;
        if (legDesc) legDesc.textContent = t.legendsDesc;

        // --- Facts ---
        const factTexts = document.querySelectorAll('.fact-text');
        if (factTexts[0]) factTexts[0].textContent = t.fact1;
        if (factTexts[1]) factTexts[1].textContent = t.fact2;
        if (factTexts[2]) factTexts[2].textContent = t.fact3;

        // --- CTA Brokers ---
        const ctaTitle = document.querySelector('.cta-title');
        const ctaDesc = document.querySelector('.cta-desc');
        const ctaDisclaimer = document.querySelector('.cta-disclaimer');
        if (ctaTitle) ctaTitle.textContent = t.ctaTitle;
        if (ctaDesc) ctaDesc.textContent = t.ctaDesc;
        if (ctaDisclaimer) ctaDisclaimer.textContent = t.ctaDisclaimer;
        const brokerDetails = document.querySelectorAll('.broker-detail');
        if (brokerDetails[0]) brokerDetails[0].textContent = t.brokerTRDetail;
        if (brokerDetails[1]) brokerDetails[1].textContent = t.brokerIBKRDetail;
        if (brokerDetails[2]) brokerDetails[2].textContent = t.brokerDegiroDetail;
        if (brokerDetails[3]) brokerDetails[3].textContent = t.brokerFidelityDetail;

        // --- Pro Section ---
        const proTitle = document.querySelector('.pro-section .section-title');
        const proDesc = document.querySelector('.pro-section .section-desc');
        if (proTitle) proTitle.textContent = t.proTitle;
        if (proDesc) proDesc.textContent = t.proDesc;
        const planNames = document.querySelectorAll('.plan-name');
        if (planNames[0]) planNames[0].textContent = t.planFree;
        if (planNames[1]) planNames[1].textContent = t.planPro;
        const planPeriods = document.querySelectorAll('.plan-period');
        if (planPeriods[0]) planPeriods[0].textContent = t.planForever;
        if (planPeriods[1]) planPeriods[1].textContent = t.planMonth;
        const proBadge = document.querySelector('.pro-badge');
        if (proBadge) proBadge.textContent = t.planMostPopular;

        // Free plan features - helper to update text while preserving icon/tag
        function setFeatText(el, text) {
            if (!el) return;
            const icon = el.querySelector('.feat-icon');
            const tag = el.querySelector('.feat-tag');
            const iconHTML = icon ? icon.outerHTML : '';
            const tagHTML = tag ? ' ' + tag.outerHTML : '';
            el.innerHTML = iconHTML + ' ' + text + tagHTML;
        }
        const freePlanFeats = document.querySelectorAll('.plan-card:not(.pro) .plan-feat');
        const freeKeys = ['freeFeat1','freeFeat2','freeFeat3','freeFeat4','freeFeat5','freeFeat6','freeFeat7','freeFeat8','freeNo1','freeNo2','freeNo3','freeNo4','freeNo5','freeNo6','freeNo7'];
        freeKeys.forEach((key, i) => { if (freePlanFeats[i] && t[key]) setFeatText(freePlanFeats[i], t[key]); });

        const proPlanFeats = document.querySelectorAll('.plan-card.pro .plan-feat');
        const proKeys = ['proFeat1','proFeatHL1','proFeatHL2','proFeatHL3','proFeatHL4','proFeatHL5','proFeat2','proFeat3','proFeat4','proFeat5'];
        proKeys.forEach((key, i) => { if (proPlanFeats[i] && t[key]) setFeatText(proPlanFeats[i], t[key]); });

        // Plan buttons — two separate CTA buttons
        const planBtnFree = document.querySelector('.plan-btn-free');
        if (planBtnFree && t.planBtnFree) planBtnFree.textContent = t.planBtnFree;
        const btnMonthly = document.getElementById('btnProMonthly');
        const btnAnnual = document.getElementById('btnProAnnual');
        if (btnMonthly) btnMonthly.textContent = '$4.99' + (t.planMonth || '/month') + ' — ' + (t.planBtnPro || 'Start free trial');
        if (btnAnnual) btnAnnual.textContent = '$49.99' + (t.planYear || '/year') + ' — ' + (t.planSaveTag || 'Save 17%');
        const proNote = document.querySelector('.pro-note');
        if (proNote && t.proNote) proNote.textContent = t.proNote;
        // Update Pro price display
        if (planPeriods[1]) planPeriods[1].textContent = t.planMonth || '/month';

        // Pro highlight cards
        const hlCards = document.querySelectorAll('.pro-hl-card');
        const hlKeys = [['proHLTax','proHLTaxDesc'],['proHLInflation','proHLInflationDesc'],['proHLFunds','proHLFundsDesc'],['proHLEducation','proHLEducationDesc']];
        hlCards.forEach((card, i) => {
            if (hlKeys[i]) {
                const h4 = card.querySelector('h4');
                const p = card.querySelector('p');
                if (h4 && t[hlKeys[i][0]]) h4.textContent = t[hlKeys[i][0]];
                if (p && t[hlKeys[i][1]]) p.textContent = t[hlKeys[i][1]];
            }
        });

        // --- Footer ---
        const footerTitle = document.querySelector('.footer-title');
        if (footerTitle) footerTitle.innerHTML = t.footerTitle1 + '<br>' + t.footerTitle2;
        const footerSub = document.querySelector('.footer-sub');
        if (footerSub) footerSub.textContent = t.footerSub;
        const footerAbout = document.querySelector('.footer-about');
        if (footerAbout) footerAbout.textContent = t.footerAbout;

        // Footer headings
        const footerHeadings = document.querySelectorAll('.footer-heading');
        if (footerHeadings[0]) footerHeadings[0].textContent = t.footerTools;
        if (footerHeadings[1]) footerHeadings[1].textContent = t.footerLearn;
        if (footerHeadings[2]) footerHeadings[2].textContent = t.footerDisclaimerHeading;

        // Footer tool links
        const toolsCol = footerHeadings[0] ? footerHeadings[0].parentElement : null;
        if (toolsCol) {
            const links = toolsCol.querySelectorAll('a');
            const toolTexts = [t.footerSimulator, t.footerPortfolio, t.footerDividends, t.footerGoals, t.footerTax];
            links.forEach((a, i) => {
                if (toolTexts[i]) {
                    const badge = a.querySelector('.footer-badge');
                    a.textContent = toolTexts[i] + ' ';
                    if (badge) a.appendChild(badge);
                }
            });
        }

        // Footer learn links
        const learnCol = footerHeadings[1] ? footerHeadings[1].parentElement : null;
        if (learnCol) {
            const links = learnCol.querySelectorAll('a');
            const learnTexts = [t.learnCompound, t.learnIndex, t.learnStart, t.learnBuffett, t.learnReturn];
            links.forEach((a, i) => { if (learnTexts[i]) a.textContent = learnTexts[i]; });
        }

        // Footer disclaimer
        const footerDisclaimer = document.querySelector('.footer-disclaimer');
        if (footerDisclaimer) footerDisclaimer.textContent = t.footerDisclaimerText;

        // Footer copyright
        const footerBottom = document.querySelector('.footer-bottom span');
        if (footerBottom) footerBottom.textContent = t.footerCopyright;

        // --- Auth Modal ---
        const authTitle = document.getElementById('authTitle');
        if (authTitle) authTitle.textContent = t.signIn;
        const authDescEl = document.querySelector('.modal-desc');
        if (authDescEl) authDescEl.textContent = t.authDesc;
        const authTabs = document.querySelectorAll('.auth-tab');
        if (authTabs[0]) authTabs[0].textContent = t.signIn;
        if (authTabs[1]) authTabs[1].textContent = t.signUp;
        // Form labels
        const signinLabels = document.querySelectorAll('#signinForm label');
        if (signinLabels[0]) signinLabels[0].textContent = t.authEmail;
        if (signinLabels[1]) signinLabels[1].textContent = t.authPassword;
        const signupLabels = document.querySelectorAll('#signupForm label');
        if (signupLabels[0]) signupLabels[0].textContent = t.authName;
        if (signupLabels[1]) signupLabels[1].textContent = t.authEmail;
        if (signupLabels[2]) signupLabels[2].textContent = t.authPassword;
        // Submit buttons
        const signinSubmit = document.getElementById('signinSubmit');
        if (signinSubmit && !signinSubmit.disabled) signinSubmit.textContent = t.signIn;
        const signupSubmit = document.getElementById('signupSubmit');
        if (signupSubmit && !signupSubmit.disabled) signupSubmit.textContent = t.createAccount;
        // Divider
        const authDivider = document.querySelector('.auth-divider span');
        if (authDivider) authDivider.textContent = t.authOr;
        // Google button - preserve SVG
        const googleBtn = document.querySelector('.google-btn');
        if (googleBtn) {
            const svg = googleBtn.querySelector('svg');
            if (svg) {
                googleBtn.textContent = '';
                googleBtn.appendChild(svg);
                googleBtn.appendChild(document.createTextNode(' ' + t.authGoogle));
            }
        }
        // Auth footer
        const authFooter = document.querySelector('.auth-footer');
        if (authFooter) authFooter.textContent = t.authFooter;

        // --- Fullscreen ---
        const fsHint = document.querySelector('.fullscreen-hint');
        if (fsHint) fsHint.textContent = t.fsHint;

        // --- Nav Links ---
        const navLinks = document.querySelectorAll('.nav-links a');
        const navTexts = [t.navSimulator, t.navPortfolio, t.navDividends, t.navGoals, t.navTax, t.navLegends];
        navLinks.forEach((a, i) => { if (navTexts[i]) a.textContent = navTexts[i]; });

        // --- Auth button ---
        const authBtn = $('authBtn');
        if (authBtn && authBtn.style.display !== 'none') authBtn.textContent = t.signIn;

        // Sign Out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) signOutBtn.textContent = t.signOut;

        // --- Save button ---
        const saveTextEl = document.querySelector('.save-text');
        if (saveTextEl) saveTextEl.textContent = t.saveText;

        // --- Update chart labels ---
        if (typeof chart !== 'undefined' && chart) {
            chart.data.datasets[0].label = t.chartTotal;
            chart.data.datasets[1].label = t.chartInvested;
            chart.update('none');
        }

        // Close menu
        $('langDropdown').classList.remove('open');

        // Re-run update to refresh dynamic text
        if (typeof update === 'function') update();
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
        applyLanguage(currentLang);
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
                // Populate profile dropdown
                var pName = document.getElementById('profileName');
                var pEmail = document.getElementById('profileEmail');
                if (pName) pName.textContent = user.displayName || 'Investor';
                if (pEmail) pEmail.textContent = user.email || '';
                loadFromCloud();
                // Check premium status
                if (window.YIS_PREMIUM) window.YIS_PREMIUM.checkStatus(user);

                // Personalize hero for logged-in users
                var heroSubtitle = document.querySelector('.hero-subtitle');
                var heroCta = document.querySelector('.hero-cta');
                var firstName = (user.displayName || '').split(' ')[0] || 'Investor';
                if (heroSubtitle) heroSubtitle.textContent = 'Welcome back, ' + firstName + '. Your wealth is growing.';
                if (heroCta) {
                    heroCta.querySelector('span').textContent = 'My simulator';
                }
            } else {
                authBtn.style.display = '';
                userMenu.style.display = 'none';
                // Reset premium state
                if (window.YIS_PREMIUM) window.YIS_PREMIUM.checkStatus(null);

                // Reset hero to default
                var heroSubtitle = document.querySelector('.hero-subtitle');
                var heroCta = document.querySelector('.hero-cta');
                if (heroSubtitle) heroSubtitle.innerHTML = 'Starting with just $500 and $100/month. No trust fund needed.<br>See for yourself below.';
                if (heroCta) {
                    heroCta.querySelector('span').textContent = 'Try the simulator';
                }
            }
        });
    }

    // --- Init ---
    function init() {
        initTheme();

        // Load saved simulation if exists
        const loaded = loadSimulation();
        if (loaded) {
            showToast((translations[currentLang]||translations.en).toastWelcome || 'Welcome back! Your last simulation was restored.');
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

    const _ft = (window.YIS_TRANSLATIONS || {})[localStorage.getItem('yis-lang') || 'en'] || {};
    const labels = data.yearlyData.map(d => (_ft.milestoneYear || 'Year') + ' ' + d.year);
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
                    label: _ft.chartTotal || 'Total Value',
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
                    label: _ft.chartInvested || 'Amount Invested',
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
            <div class="fullscreen-stat-label">${_ft.fsFinalValue || 'Final Value'}</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value">${formatMoney(r.totalContributed)}</div>
            <div class="fullscreen-stat-label">${_ft.fsYouPutIn || 'You Put In'}</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value green">${formatMoney(r.totalInterest)}</div>
            <div class="fullscreen-stat-label">${_ft.fsMarketGave || 'Market Gave You'}</div>
        </div>
        <div class="fullscreen-stat">
            <div class="fullscreen-stat-value green">${r.totalContributed > 0 ? (r.finalBalance / r.totalContributed).toFixed(1) + 'x' : '0x'}</div>
            <div class="fullscreen-stat-label">${_ft.fsMultiplied || 'Money Multiplied'}</div>
        </div>
    `;
}
