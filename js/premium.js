/* ============================================
   PREMIUM / PRO USER SYSTEM

   Checks Firestore for user subscription status.
   Shared across all pages in the ecosystem.

   Firestore document: users/{uid}
   Fields: { plan: 'free'|'pro', planExpiry: timestamp, planType: 'monthly'|'annual' }

   Usage:
     <script src="js/premium.js"></script>
     // Then in your code:
     // window.YIS_PREMIUM.isPro → boolean
     // window.YIS_PREMIUM.onStatusChange(callback)
     // window.YIS_PREMIUM.checkStatus(user) → Promise
   ============================================ */

(function() {
    'use strict';

    var state = {
        isPro: false,
        plan: 'free',
        planExpiry: null,
        planType: null,
        loaded: false,
        listeners: []
    };

    // Notify all listeners when status changes
    function notify() {
        state.listeners.forEach(function(fn) {
            try { fn(state); } catch(e) { console.error('[Premium] listener error:', e); }
        });
    }

    // Update all UI elements that show Pro/Free status
    function updateUI() {
        // Profile badge
        var badges = document.querySelectorAll('.profile-badge, #profileBadge');
        badges.forEach(function(b) {
            if (state.isPro) {
                b.innerHTML = '<span class="badge-icon" style="color:#D4A843;">★</span> Pro Plan';
                b.style.color = '#D4A843';
                b.style.fontWeight = '700';
            } else {
                b.innerHTML = '<span class="badge-icon">☆</span> Free Plan';
                b.style.color = '';
                b.style.fontWeight = '';
            }
        });

        // Upgrade links — hide if Pro
        var upgradeLinks = document.querySelectorAll('.profile-link[href*="#pro"], a.profile-link[href*="#pro"]');
        upgradeLinks.forEach(function(l) {
            l.style.display = state.isPro ? 'none' : '';
        });

        // Body class for CSS-based gating
        if (state.isPro) {
            document.body.classList.add('is-pro');
            document.body.classList.remove('is-free');
        } else {
            document.body.classList.add('is-free');
            document.body.classList.remove('is-pro');
        }

        // Pro CTA sections — hide if Pro
        var proCTAs = document.querySelectorAll('.dc-pro, .pro-cta, [data-pro-cta]');
        proCTAs.forEach(function(el) { el.style.display = state.isPro ? 'none' : ''; });

        // Pro-only elements — show only if Pro
        var proOnly = document.querySelectorAll('[data-pro-only]');
        proOnly.forEach(function(el) { el.style.display = state.isPro ? '' : 'none'; });

        // Free-only elements — show only if Free
        var freeOnly = document.querySelectorAll('[data-free-only]');
        freeOnly.forEach(function(el) { el.style.display = state.isPro ? 'none' : ''; });
    }

    // Check Firestore for user's subscription status
    async function checkStatus(user) {
        if (!user) {
            state.isPro = false;
            state.plan = 'free';
            state.planExpiry = null;
            state.planType = null;
            state.loaded = true;
            updateUI();
            notify();
            return state;
        }

        try {
            var doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                var data = doc.data();
                var now = new Date();

                // Check if Pro and not expired
                if (data.plan === 'pro') {
                    var expiry = data.planExpiry ? data.planExpiry.toDate ? data.planExpiry.toDate() : new Date(data.planExpiry) : null;
                    if (!expiry || expiry > now) {
                        state.isPro = true;
                        state.plan = 'pro';
                        state.planExpiry = expiry;
                        state.planType = data.planType || 'monthly';
                    } else {
                        // Expired
                        state.isPro = false;
                        state.plan = 'expired';
                        state.planExpiry = expiry;
                    }
                } else {
                    state.isPro = false;
                    state.plan = data.plan || 'free';
                }
            } else {
                // No document yet — create one with free plan
                state.isPro = false;
                state.plan = 'free';
                await db.collection('users').doc(user.uid).set({
                    plan: 'free',
                    email: user.email || '',
                    displayName: user.displayName || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch(err) {
            console.warn('[Premium] Could not check status:', err.message);
            state.isPro = false;
            state.plan = 'free';
        }

        state.loaded = true;
        updateUI();
        notify();
        return state;
    }

    // === ADMIN / TEST COMMANDS (run in browser console) ===
    // Set current user as Pro:  YIS_PREMIUM.setProTest()
    // Set current user as Free: YIS_PREMIUM.setFreeTest()
    // Set any user as Pro:      YIS_PREMIUM.setProByEmail('email@example.com')

    async function setProTest() {
        var user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        if (!user) { console.error('[Premium] No user logged in. Sign in first.'); return; }
        var expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1); // 1 year from now
        await db.collection('users').doc(user.uid).set({
            plan: 'pro',
            planType: 'annual',
            planExpiry: expiry,
            email: user.email || '',
            displayName: user.displayName || '',
            upgradedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('[Premium] ✅ ' + user.email + ' is now PRO until ' + expiry.toDateString());
        await checkStatus(user);
    }

    async function setFreeTest() {
        var user = (typeof auth !== 'undefined') ? auth.currentUser : null;
        if (!user) { console.error('[Premium] No user logged in. Sign in first.'); return; }
        await db.collection('users').doc(user.uid).set({
            plan: 'free',
            planType: null,
            planExpiry: null,
            downgradedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('[Premium] ' + user.email + ' is now FREE');
        await checkStatus(user);
    }

    async function setProByEmail(email) {
        if (!email) { console.error('[Premium] Please provide an email.'); return; }
        try {
            var snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (snap.empty) { console.error('[Premium] No user found with email: ' + email); return; }
            var uid = snap.docs[0].id;
            var expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            await db.collection('users').doc(uid).set({
                plan: 'pro',
                planType: 'annual',
                planExpiry: expiry,
                upgradedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('[Premium] ✅ ' + email + ' is now PRO until ' + expiry.toDateString());
        } catch(err) {
            console.error('[Premium] Error:', err.message);
        }
    }

    // Expose globally
    window.YIS_PREMIUM = {
        get isPro() { return state.isPro; },
        get plan() { return state.plan; },
        get planExpiry() { return state.planExpiry; },
        get loaded() { return state.loaded; },
        checkStatus: checkStatus,
        onStatusChange: function(fn) { state.listeners.push(fn); },
        updateUI: updateUI,
        // Test/admin commands
        setProTest: setProTest,
        setFreeTest: setFreeTest,
        setProByEmail: setProByEmail
    };

})();
