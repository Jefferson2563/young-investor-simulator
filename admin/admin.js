/* ============================================
   ADMIN DASHBOARD — Logic & Data
   ============================================ */

(function() {
    'use strict';

    /* ===== CONFIG ===== */
    // Admin emails — only these users can access the dashboard
    var ADMIN_EMAILS = [
        'business.jeffmbogne@gmail.com'
    ];

    var MONTHLY_PRICE = 4.99;
    var ANNUAL_PRICE = 49.99;

    var allUsers = [];
    var dailyStats = [];   // [{ date: 'YYYY-MM-DD', total, tools: { home, dividends, ... } }]
    var charts = {};
    var currentEcoPeriod = 'today';
    var currentFilter = 'all';

    var TOOLS = [
        { id: 'home', name: 'Simulator', color: '#22c55e' },
        { id: 'dividends', name: 'Dividends', color: '#eab308' },
        { id: 'portfolio', name: 'Portfolio', color: '#3b82f6' },
        { id: 'goals', name: 'Goals', color: '#06b6d4' },
        { id: 'tax', name: 'Tax Wizard', color: '#a855f7' }
    ];

    /* ===== AUTH GATE ===== */
    var authGate = document.getElementById('authGate');
    var dashboard = document.getElementById('dashboard');
    var authError = document.getElementById('authError');
    var signInBtn = document.getElementById('adminSignInBtn');
    var signOutBtn = document.getElementById('adminSignOut');

    signInBtn.addEventListener('click', function() {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function(err) {
            authError.textContent = err.message;
        });
    });

    signOutBtn.addEventListener('click', function() {
        auth.signOut();
    });

    auth.onAuthStateChanged(function(user) {
        if (!user) {
            authGate.style.display = '';
            dashboard.style.display = 'none';
            return;
        }

        // Check email against admin whitelist
        var userEmail = (user.email || '').toLowerCase();
        var isAdmin = ADMIN_EMAILS.some(function(e) { return e.toLowerCase() === userEmail; });

        if (!isAdmin) {
            console.log('Access denied for: ' + user.email);
            authError.textContent = 'Access denied. This account is not authorized.';
            auth.signOut();
            return;
        }

        // Authorized
        authGate.style.display = 'none';
        dashboard.style.display = 'flex';

        // Update admin info
        document.getElementById('adminName').textContent = user.displayName || user.email;
        document.getElementById('adminAvatar').textContent = (user.displayName || user.email || 'A').charAt(0).toUpperCase();

        loadDashboard();

        // Safety-net: re-render charts every 30s (Firestore listeners handle the data,
        // this just ensures charts stay fresh if a render was missed)
        setInterval(function() {
            try { renderAll(); } catch(e) {}
        }, 30000);
    });

    /* ===== NAVIGATION ===== */
    var sidebarLinks = document.querySelectorAll('.sidebar-link');
    var sections = {
        overview: document.getElementById('sectionOverview'),
        ecosystem: document.getElementById('sectionEcosystem'),
        users: document.getElementById('sectionUsers'),
        revenue: document.getElementById('sectionRevenue'),
        traffic: document.getElementById('sectionTraffic'),
        analytics: document.getElementById('sectionAnalytics')
    };

    sidebarLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var target = this.getAttribute('data-section');
            sidebarLinks.forEach(function(l) { l.classList.remove('active'); });
            this.classList.add('active');
            Object.keys(sections).forEach(function(key) {
                sections[key].style.display = key === target ? '' : 'none';
            });
            document.getElementById('pageTitle').textContent = this.textContent.trim();
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
            var overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.classList.remove('active');
        });
    });

    // Mobile sidebar toggle
    var sidebarToggle = document.getElementById('sidebarToggle');
    sidebarToggle.addEventListener('click', function() {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
        var overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
        overlay.classList.toggle('active');
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        this.classList.add('spinning');
        var btn = this;
        loadDashboard().then(function() {
            setTimeout(function() { btn.classList.remove('spinning'); }, 500);
        });
    });

    /* ===== LOAD DASHBOARD DATA (REAL-TIME) ===== */
    var unsubUsers = null;
    var unsubStats = null;
    var firstLoad = true;

    function renderAll() {
        updateKPIs();
        updateRecentSignups();
        updateGrowthChart();
        updatePlanChart();
        updateRevenueSection();
        updateUsersTable(currentFilter, document.getElementById('userSearch').value);
        updateAnalyticsSection();
        updateEcosystemSection();
        updateTrafficSection();
    }

    function loadDashboard() {
        var loading = document.getElementById('loadingOverlay');
        loading.classList.remove('hidden');

        // Tear down any previous listeners
        if (unsubUsers) { unsubUsers(); unsubUsers = null; }
        if (unsubStats) { unsubStats(); unsubStats = null; }

        var loadedUsers = false, loadedStats = false;

        function maybeFinish() {
            if (loadedUsers && loadedStats && firstLoad) {
                firstLoad = false;
                loading.classList.add('hidden');
            }
        }

        // Real-time users listener — updates instantly when anyone signs up / upgrades
        unsubUsers = db.collection('users').onSnapshot(function(snap) {
            allUsers = [];
            snap.forEach(function(doc) {
                var data = doc.data();
                data._uid = doc.id;
                allUsers.push(data);
            });
            loadedUsers = true;
            renderAll();
            maybeFinish();
        }, function(err) {
            console.error('Users listener error:', err);
            loadedUsers = true;
            maybeFinish();
        });

        // Real-time stats listener — updates instantly when anyone visits a tool
        unsubStats = db.collection('stats').onSnapshot(function(snap) {
            dailyStats = [];
            snap.forEach(function(doc) {
                var data = doc.data();
                if (data.date) dailyStats.push(data);
            });
            dailyStats.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
            loadedStats = true;
            renderAll();
            maybeFinish();
        }, function(err) {
            console.error('Stats listener error:', err);
            loadedStats = true;
            maybeFinish();
        });

        return Promise.resolve();
    }

    /* ===== ECOSYSTEM SECTION ===== */
    function todayKey() {
        var d = new Date();
        return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    }

    function aggregateStats(period) {
        // Returns { tools: {home: N, ...}, total: N } summed over period
        var now = new Date();
        var cutoff = null;
        if (period === 'today') {
            cutoff = todayKey();
        } else if (period === 'week') {
            var w = new Date(now); w.setUTCDate(w.getUTCDate() - 6);
            cutoff = w.getUTCFullYear() + '-' + String(w.getUTCMonth() + 1).padStart(2, '0') + '-' + String(w.getUTCDate()).padStart(2, '0');
        } else if (period === 'month') {
            var m = new Date(now); m.setUTCDate(m.getUTCDate() - 29);
            cutoff = m.getUTCFullYear() + '-' + String(m.getUTCMonth() + 1).padStart(2, '0') + '-' + String(m.getUTCDate()).padStart(2, '0');
        }

        var agg = { tools: {}, total: 0 };
        TOOLS.forEach(function(t) { agg.tools[t.id] = 0; });

        dailyStats.forEach(function(d) {
            if (period === 'today' && d.date !== cutoff) return;
            if (cutoff && d.date < cutoff) return;
            agg.total += d.total || 0;
            if (d.tools) {
                Object.keys(d.tools).forEach(function(k) {
                    agg.tools[k] = (agg.tools[k] || 0) + (d.tools[k] || 0);
                });
            }
        });

        return agg;
    }

    function getActiveUsersForTool(toolId) {
        // Users whose lastTool === this tool, OR who have toolsUsed[toolId] > 0
        return allUsers.filter(function(u) {
            return u.lastTool === toolId || (u.toolsUsed && u.toolsUsed[toolId] > 0);
        }).length;
    }

    function updateEcosystemSection() {
        var agg = aggregateStats(currentEcoPeriod);
        renderToolGrid(agg);
        renderToolTrafficChart(agg);
        renderToolShareChart(agg);
        renderDailyActivityChart();
        renderPowerUsersTable();

        var labels = { today: "Today's visits", week: 'Last 7 days', month: 'Last 30 days', all: 'All time' };
        document.getElementById('ecoTotalLabel').textContent = labels[currentEcoPeriod] + ': ' + agg.total.toLocaleString();
    }

    function renderToolGrid(agg) {
        var grid = document.getElementById('toolGrid');
        grid.innerHTML = TOOLS.map(function(t) {
            var visits = agg.tools[t.id] || 0;
            var allTime = aggregateStats('all').tools[t.id] || 0;
            var users = getActiveUsersForTool(t.id);
            return '<div class="tool-camera" data-tool="' + t.id + '">' +
                '<div class="tool-camera-head">' +
                  '<div class="tool-camera-name"><span class="tool-camera-dot"></span>' + t.name + '</div>' +
                  '<div class="tool-camera-rec">LIVE</div>' +
                '</div>' +
                '<div class="tool-camera-value">' + visits.toLocaleString() + '</div>' +
                '<div class="tool-camera-label">visits this period</div>' +
                '<div class="tool-camera-stats">' +
                  '<div class="tool-camera-stat">' +
                    '<span class="tool-camera-stat-label">All time</span>' +
                    '<span class="tool-camera-stat-value">' + allTime.toLocaleString() + '</span>' +
                  '</div>' +
                  '<div class="tool-camera-stat">' +
                    '<span class="tool-camera-stat-label">Active users</span>' +
                    '<span class="tool-camera-stat-value">' + users + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>';
        }).join('');
    }

    function renderToolTrafficChart(agg) {
        var labels = TOOLS.map(function(t) { return t.name; });
        var data = TOOLS.map(function(t) { return agg.tools[t.id] || 0; });
        var colors = TOOLS.map(function(t) { return t.color; });

        if (charts.toolTraffic) charts.toolTraffic.destroy();
        charts.toolTraffic = new Chart(document.getElementById('toolTrafficChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.map(function(c) { return c + '55'; }),
                    borderColor: colors,
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: chartOptions()
        });
    }

    function renderToolShareChart(agg) {
        var labels = TOOLS.map(function(t) { return t.name; });
        var data = TOOLS.map(function(t) { return agg.tools[t.id] || 0; });
        var colors = TOOLS.map(function(t) { return t.color; });

        if (charts.toolShare) charts.toolShare.destroy();
        charts.toolShare = new Chart(document.getElementById('toolShareChart'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#0c0c0e',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa', padding: 12, font: { size: 11 }, boxWidth: 10, boxHeight: 10 }
                    }
                }
            }
        });
    }

    function renderDailyActivityChart() {
        // Last 14 days, stacked per-tool
        var days = [];
        var now = new Date();
        for (var i = 13; i >= 0; i--) {
            var d = new Date(now); d.setUTCDate(d.getUTCDate() - i);
            days.push(d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'));
        }
        var labels = days.map(function(d) { return d.slice(5); });

        var datasets = TOOLS.map(function(t) {
            return {
                label: t.name,
                data: days.map(function(day) {
                    var entry = dailyStats.find(function(s) { return s.date === day; });
                    return (entry && entry.tools && entry.tools[t.id]) || 0;
                }),
                backgroundColor: t.color + 'cc',
                borderColor: t.color,
                borderWidth: 1,
                borderRadius: 4
            };
        });

        if (charts.dailyActivity) charts.dailyActivity.destroy();
        charts.dailyActivity = new Chart(document.getElementById('dailyActivityChart'), {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#52525b', font: { size: 10 } } },
                    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#52525b', font: { size: 10 } } }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: '#a1a1aa', padding: 10, font: { size: 11 }, boxWidth: 10 } },
                    tooltip: {
                        backgroundColor: '#18181b', titleColor: '#fafafa', bodyColor: '#a1a1aa',
                        borderColor: '#27272a', borderWidth: 1, cornerRadius: 8, padding: 10
                    }
                }
            }
        });
    }

    function renderPowerUsersTable() {
        var withUsage = allUsers.map(function(u) {
            var total = 0;
            if (u.toolsUsed) {
                Object.keys(u.toolsUsed).forEach(function(k) { total += u.toolsUsed[k] || 0; });
            }
            return { user: u, total: total };
        }).filter(function(x) { return x.total > 0; });

        withUsage.sort(function(a, b) { return b.total - a.total; });
        var top = withUsage.slice(0, 10);

        var tbody = document.getElementById('powerUsersTable');
        if (top.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No tool usage tracked yet — visit a tool page to seed data</td></tr>';
            return;
        }

        tbody.innerHTML = top.map(function(x) {
            var u = x.user;
            var planClass = u.plan === 'pro' ? 'plan-badge-pro' : 'plan-badge-free';
            var planLabel = u.plan === 'pro' ? 'Pro' : 'Free';
            var lastSeen = u.lastSeen ? formatDate(u.lastSeen) : '—';
            var lastTool = TOOLS.find(function(t) { return t.id === u.lastTool; });
            return '<tr>' +
                '<td style="color:var(--text);font-weight:500;">' + escHtml(u.displayName || '—') + '</td>' +
                '<td>' + escHtml(u.email || '—') + '</td>' +
                '<td><span class="plan-badge ' + planClass + '">' + planLabel + '</span></td>' +
                '<td>' + (lastTool ? lastTool.name : (u.lastTool || '—')) + '</td>' +
                '<td style="color:var(--text);font-weight:600;">' + x.total + '</td>' +
                '<td>' + lastSeen + '</td>' +
              '</tr>';
        }).join('');
    }

    // Ecosystem period buttons
    document.querySelectorAll('[data-period]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var group = this.closest('.period-tabs') || this.parentNode;
            group.querySelectorAll('.period-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            currentEcoPeriod = this.getAttribute('data-period');
            updateEcosystemSection();
        });
    });

    // Traffic period buttons
    var currentTrafficPeriod = 'week';
    document.querySelectorAll('[data-traffic-period]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-traffic-period]').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            currentTrafficPeriod = this.getAttribute('data-traffic-period');
            renderTrafficToolCards(currentTrafficPeriod);
        });
    });

    /* ===== HELPERS ===== */
    function getProUsers() {
        var now = new Date();
        return allUsers.filter(function(u) {
            if (u.plan !== 'pro') return false;
            if (u.planExpiry) {
                var exp = u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry);
                return exp > now;
            }
            return true;
        });
    }

    function formatDate(val) {
        if (!val) return '—';
        var d = val.toDate ? val.toDate() : new Date(val);
        if (isNaN(d.getTime())) return '—';
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function formatCurrency(n) {
        return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getCreatedDate(user) {
        if (user.createdAt) {
            return user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        }
        return null;
    }

    /* ===== KPI CARDS ===== */
    function updateKPIs() {
        var total = allUsers.length;
        var proUsers = getProUsers();
        var proCount = proUsers.length;
        var monthlyCount = proUsers.filter(function(u) { return u.planType === 'monthly'; }).length;
        var annualCount = proUsers.filter(function(u) { return u.planType === 'annual'; }).length;
        var mrr = (monthlyCount * MONTHLY_PRICE) + (annualCount * (ANNUAL_PRICE / 12));
        var convRate = total > 0 ? ((proCount / total) * 100).toFixed(1) + '%' : '0%';

        document.getElementById('kpiTotalUsers').textContent = total;
        document.getElementById('kpiProUsers').textContent = proCount;
        document.getElementById('kpiMRR').textContent = formatCurrency(mrr);
        document.getElementById('kpiConversion').textContent = convRate;

        // Revenue breakdown on overview
        document.getElementById('revMonthly').textContent = formatCurrency(monthlyCount * MONTHLY_PRICE);
        document.getElementById('revMonthlyCount').textContent = monthlyCount + ' subscriber' + (monthlyCount !== 1 ? 's' : '');
        document.getElementById('revAnnual').textContent = formatCurrency(annualCount * ANNUAL_PRICE);
        document.getElementById('revAnnualCount').textContent = annualCount + ' subscriber' + (annualCount !== 1 ? 's' : '');
        document.getElementById('revARR').textContent = formatCurrency(mrr * 12);
    }

    /* ===== RECENT SIGNUPS TABLE ===== */
    function updateRecentSignups() {
        var sorted = allUsers.slice().sort(function(a, b) {
            var da = getCreatedDate(a);
            var db2 = getCreatedDate(b);
            return (db2 || 0) - (da || 0);
        });

        var recent = sorted.slice(0, 10);
        var tbody = document.getElementById('recentSignups');
        document.getElementById('signupCount').textContent = allUsers.length + ' total';

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No users yet</td></tr>';
            return;
        }

        tbody.innerHTML = recent.map(function(u) {
            var planClass = u.plan === 'pro' ? 'plan-badge-pro' : 'plan-badge-free';
            var planLabel = u.plan === 'pro' ? 'Pro' : 'Free';
            return '<tr>' +
                '<td style="color:var(--text);font-weight:500;">' + escHtml(u.displayName || '—') + '</td>' +
                '<td>' + escHtml(u.email || '—') + '</td>' +
                '<td><span class="plan-badge ' + planClass + '">' + planLabel + '</span></td>' +
                '<td>' + formatDate(u.createdAt) + '</td>' +
                '</tr>';
        }).join('');
    }

    /* ===== GROWTH CHART ===== */
    function updateGrowthChart() {
        var months = getLast12Months();
        var totalByMonth = {};
        var proByMonth = {};
        months.forEach(function(m) { totalByMonth[m] = 0; proByMonth[m] = 0; });

        allUsers.forEach(function(u) {
            var d = getCreatedDate(u);
            if (!d) return;
            var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (totalByMonth.hasOwnProperty(key)) totalByMonth[key]++;
        });

        // Pro users counted by upgrade date or created date
        getProUsers().forEach(function(u) {
            var d = u.upgradedAt ? (u.upgradedAt.toDate ? u.upgradedAt.toDate() : new Date(u.upgradedAt)) : getCreatedDate(u);
            if (!d) return;
            var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (proByMonth.hasOwnProperty(key)) proByMonth[key]++;
        });

        var labels = months.map(function(m) {
            var parts = m.split('-');
            var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0].slice(2);
        });

        var totalData = months.map(function(m) { return totalByMonth[m]; });
        var proData = months.map(function(m) { return proByMonth[m]; });

        // Cumulative
        for (var i = 1; i < totalData.length; i++) { totalData[i] += totalData[i - 1]; }
        for (var j = 1; j < proData.length; j++) { proData[j] += proData[j - 1]; }

        if (charts.growth) charts.growth.destroy();
        charts.growth = new Chart(document.getElementById('growthChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Users',
                        data: totalData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.08)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#3b82f6'
                    },
                    {
                        label: 'Pro Users',
                        data: proData,
                        borderColor: '#eab308',
                        backgroundColor: 'rgba(234,179,8,0.08)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#eab308'
                    }
                ]
            },
            options: chartOptions()
        });
    }

    /* ===== PLAN DISTRIBUTION CHART ===== */
    function updatePlanChart() {
        var proCount = getProUsers().length;
        var freeCount = allUsers.length - proCount;

        if (charts.plan) charts.plan.destroy();
        charts.plan = new Chart(document.getElementById('planChart'), {
            type: 'doughnut',
            data: {
                labels: ['Free', 'Pro'],
                datasets: [{
                    data: [freeCount, proCount],
                    backgroundColor: ['#27272a', '#eab308'],
                    borderColor: ['#3f3f46', '#ca8a04'],
                    borderWidth: 1,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa', padding: 16, font: { size: 12 } }
                    }
                }
            }
        });
    }

    /* ===== REVENUE SECTION ===== */
    function updateRevenueSection() {
        var proUsers = getProUsers();
        var monthlyCount = proUsers.filter(function(u) { return u.planType === 'monthly'; }).length;
        var annualCount = proUsers.filter(function(u) { return u.planType === 'annual'; }).length;
        var mrr = (monthlyCount * MONTHLY_PRICE) + (annualCount * (ANNUAL_PRICE / 12));
        var arr = mrr * 12;
        var arpu = allUsers.length > 0 ? mrr / allUsers.length : 0;
        var ltv = mrr > 0 && proUsers.length > 0 ? (mrr / proUsers.length) * 12 : 0;

        document.getElementById('revMRR2').textContent = formatCurrency(mrr);
        document.getElementById('revARR2').textContent = formatCurrency(arr);
        document.getElementById('revAvgRev').textContent = formatCurrency(arpu);
        document.getElementById('revLTV').textContent = formatCurrency(ltv);

        // Revenue trend chart (cumulative MRR over months)
        var months = getLast12Months();
        var mrrByMonth = months.map(function() { return 0; });
        proUsers.forEach(function(u) {
            var d = u.upgradedAt ? (u.upgradedAt.toDate ? u.upgradedAt.toDate() : new Date(u.upgradedAt)) : getCreatedDate(u);
            if (!d) return;
            var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            var idx = months.indexOf(key);
            if (idx >= 0) {
                var rev = u.planType === 'annual' ? ANNUAL_PRICE / 12 : MONTHLY_PRICE;
                for (var i = idx; i < months.length; i++) mrrByMonth[i] += rev;
            }
        });

        var labels = months.map(function(m) {
            var parts = m.split('-');
            var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0].slice(2);
        });

        if (charts.revenue) charts.revenue.destroy();
        charts.revenue = new Chart(document.getElementById('revenueChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'MRR',
                    data: mrrByMonth,
                    backgroundColor: 'rgba(34,197,94,0.3)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: chartOptions('$')
        });

        // Plan type split doughnut
        if (charts.planType) charts.planType.destroy();
        charts.planType = new Chart(document.getElementById('planTypeChart'), {
            type: 'doughnut',
            data: {
                labels: ['Monthly ($4.99)', 'Annual ($49.99)'],
                datasets: [{
                    data: [monthlyCount, annualCount],
                    backgroundColor: ['#3b82f6', '#a855f7'],
                    borderColor: ['#2563eb', '#9333ea'],
                    borderWidth: 1,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa', padding: 16, font: { size: 12 } }
                    }
                }
            }
        });

        // Pro users table in revenue section
        var tbody = document.getElementById('proUsersTable');
        if (proUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="table-empty">No Pro users yet</td></tr>';
            return;
        }
        tbody.innerHTML = proUsers.map(function(u) {
            var expiry = u.planExpiry ? (u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry)) : null;
            return '<tr>' +
                '<td style="color:var(--text);font-weight:500;">' + escHtml(u.displayName || u.email || '—') + '</td>' +
                '<td>' + (u.planType === 'annual' ? 'Annual' : 'Monthly') + '</td>' +
                '<td>' + (expiry ? formatDate(u.planExpiry) : '—') + '</td>' +
                '</tr>';
        }).join('');
    }

    /* ===== USERS TABLE (FULL) ===== */
    function updateUsersTable(filter, search) {
        filter = filter || 'all';
        search = (search || '').toLowerCase();

        var filtered = allUsers.filter(function(u) {
            if (filter === 'pro' && u.plan !== 'pro') return false;
            if (filter === 'free' && u.plan === 'pro') return false;
            if (search) {
                var name = (u.displayName || '').toLowerCase();
                var email = (u.email || '').toLowerCase();
                if (name.indexOf(search) === -1 && email.indexOf(search) === -1) return false;
            }
            return true;
        });

        filtered.sort(function(a, b) {
            var da = getCreatedDate(a);
            var db2 = getCreatedDate(b);
            return (db2 || 0) - (da || 0);
        });

        var tbody = document.getElementById('allUsersTable');
        document.getElementById('userCountLabel').textContent = filtered.length + ' user' + (filtered.length !== 1 ? 's' : '');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(function(u) {
            var planClass = u.plan === 'pro' ? 'plan-badge-pro' : 'plan-badge-free';
            var planLabel = u.plan === 'pro' ? 'Pro' : 'Free';
            var expiry = u.planExpiry ? formatDate(u.planExpiry) : '—';
            return '<tr>' +
                '<td style="color:var(--text);font-weight:500;">' + escHtml(u.displayName || '—') + '</td>' +
                '<td>' + escHtml(u.email || '—') + '</td>' +
                '<td><span class="plan-badge ' + planClass + '">' + planLabel + '</span></td>' +
                '<td>' + (u.planType || '—') + '</td>' +
                '<td>' + expiry + '</td>' +
                '<td>' + formatDate(u.createdAt) + '</td>' +
                '</tr>';
        }).join('');
    }

    // Search & filter handlers
    document.getElementById('userSearch').addEventListener('input', function() {
        updateUsersTable(currentFilter, this.value);
    });

    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            updateUsersTable(currentFilter, document.getElementById('userSearch').value);
        });
    });

    /* ===== ANALYTICS SECTION ===== */
    function updateAnalyticsSection() {
        var now = new Date();
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        var today = 0, week = 0, month = 0, emailCount = 0, googleCount = 0;

        allUsers.forEach(function(u) {
            var d = getCreatedDate(u);
            if (d) {
                if (d >= todayStart) today++;
                if (d >= weekStart) week++;
                if (d >= monthStart) month++;
            }
            // Guess provider from email domain or providerData if available
            var email = (u.email || '').toLowerCase();
            if (email.indexOf('@gmail.com') > -1 || email.indexOf('@googlemail.com') > -1) {
                googleCount++;
            } else {
                emailCount++;
            }
        });

        document.getElementById('statToday').textContent = today;
        document.getElementById('statWeek').textContent = week;
        document.getElementById('statMonth').textContent = month;
        document.getElementById('statEmail').textContent = emailCount;
        document.getElementById('statGoogle').textContent = googleCount;

        // Signup timeline
        var months = getLast12Months();
        var signupsByMonth = {};
        months.forEach(function(m) { signupsByMonth[m] = 0; });

        allUsers.forEach(function(u) {
            var d = getCreatedDate(u);
            if (!d) return;
            var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (signupsByMonth.hasOwnProperty(key)) signupsByMonth[key]++;
        });

        var labels = months.map(function(m) {
            var parts = m.split('-');
            var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0].slice(2);
        });

        if (charts.timeline) charts.timeline.destroy();
        charts.timeline = new Chart(document.getElementById('signupTimeline'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'New Signups',
                    data: months.map(function(m) { return signupsByMonth[m]; }),
                    backgroundColor: 'rgba(59,130,246,0.3)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: chartOptions()
        });

        // Provider chart
        if (charts.provider) charts.provider.destroy();
        charts.provider = new Chart(document.getElementById('providerChart'), {
            type: 'doughnut',
            data: {
                labels: ['Email/Password', 'Google'],
                datasets: [{
                    data: [emailCount, googleCount],
                    backgroundColor: ['#3b82f6', '#ef4444'],
                    borderColor: ['#2563eb', '#dc2626'],
                    borderWidth: 1,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#a1a1aa', padding: 16, font: { size: 12 } }
                    }
                }
            }
        });
    }

    /* ===== TRAFFIC SECTION ===== */
    function getTrafficForPeriod(period) {
        var now = new Date();
        var cutoff = null;
        var todayStr = todayKey();

        if (period === 'today') {
            cutoff = todayStr;
        } else if (period === 'week') {
            var w = new Date(now); w.setUTCDate(w.getUTCDate() - 6);
            cutoff = w.getUTCFullYear() + '-' + String(w.getUTCMonth()+1).padStart(2,'0') + '-' + String(w.getUTCDate()).padStart(2,'0');
        } else if (period === 'month') {
            var m = new Date(now); m.setUTCDate(m.getUTCDate() - 29);
            cutoff = m.getUTCFullYear() + '-' + String(m.getUTCMonth()+1).padStart(2,'0') + '-' + String(m.getUTCDate()).padStart(2,'0');
        }

        var result = { tools: {}, total: 0 };
        TOOLS.forEach(function(t) { result.tools[t.id] = 0; });

        dailyStats.forEach(function(d) {
            if (period === 'today' && d.date !== todayStr) return;
            if (cutoff && d.date < cutoff) return;
            result.total += d.total || 0;
            if (d.tools) {
                Object.keys(d.tools).forEach(function(k) {
                    if (result.tools[k] !== undefined) result.tools[k] += d.tools[k] || 0;
                });
            }
        });
        return result;
    }

    function renderTrafficToolCards(period) {
        var data = getTrafficForPeriod(period);
        var container = document.getElementById('trafficToolCards');
        if (!container) return;
        var max = Math.max(1, Math.max.apply(null, TOOLS.map(function(t) { return data.tools[t.id] || 0; })));
        container.innerHTML = TOOLS.map(function(t) {
            var count = data.tools[t.id] || 0;
            var pct = Math.round((count / max) * 100);
            return '<div class="traffic-tool-card">' +
                '<div class="traffic-tool-header">' +
                    '<span class="traffic-tool-name">' + t.name + '</span>' +
                    '<span class="traffic-tool-count" style="color:' + t.color + '">' + count.toLocaleString() + '</span>' +
                '</div>' +
                '<div class="traffic-bar-bg"><div class="traffic-bar-fill" style="width:' + pct + '%;background:' + t.color + '"></div></div>' +
            '</div>';
        }).join('');
    }

    function updateTrafficSection() {
        // KPI figures
        var allTime = getTrafficForPeriod('all');
        var todayData = getTrafficForPeriod('today');
        var weekData = getTrafficForPeriod('week');
        var monthData = getTrafficForPeriod('month');

        var setEl = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('trafficTotal', allTime.total.toLocaleString());
        setEl('trafficToday', todayData.total.toLocaleString());
        setEl('trafficWeek', weekData.total.toLocaleString());
        setEl('trafficMonth', monthData.total.toLocaleString());

        // Overview KPI cards
        setEl('kpiTotalVisits', allTime.total.toLocaleString());
        setEl('kpiVisitsToday', todayData.total.toLocaleString());

        // Tool cards
        renderTrafficToolCards(currentTrafficPeriod || 'week');

        // Daily visits chart (last 30 days)
        var days = [];
        var now = new Date();
        for (var i = 29; i >= 0; i--) {
            var d = new Date(now); d.setUTCDate(d.getUTCDate() - i);
            days.push(d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0'));
        }
        var labels = days.map(function(d) { return d.slice(5); });
        var data = days.map(function(day) {
            var entry = dailyStats.find(function(s) { return s.date === day; });
            return (entry && entry.total) || 0;
        });

        var canvas = document.getElementById('trafficDailyChart');
        if (!canvas) return;
        if (charts.trafficDaily) charts.trafficDaily.destroy();
        charts.trafficDaily = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Visits',
                    data: data,
                    backgroundColor: 'rgba(6,182,212,0.4)',
                    borderColor: '#06b6d4',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: chartOptions()
        });
    }

    /* ===== CHART OPTIONS ===== */
    function chartOptions(prefix) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#52525b', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#52525b',
                        font: { size: 11 },
                        callback: function(val) { return prefix ? prefix + val : val; }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10
                }
            }
        };
    }

    /* ===== UTILITIES ===== */
    function getLast12Months() {
        var months = [];
        var now = new Date();
        for (var i = 11; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        return months;
    }

    function escHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
