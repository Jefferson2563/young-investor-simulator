/* ============================================
   TOOL USAGE TRACKER

   Scalable per-tool analytics for the Young Investor ecosystem.

   Records:
   - Per-user: toolsUsed counter, lastTool, lastSeen (only for logged-in users)
   - Aggregate: stats/daily-{YYYY-MM-DD} → { tool: count } (all visits, anon + logged)

   Usage on each tool page:
     <script src="../js/tool-tracker.js" data-tool="dividends"></script>
   ============================================ */

(function() {
    'use strict';

    // Determine which tool this page is
    var script = document.currentScript || (function() {
        var scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    var toolName = script.getAttribute('data-tool') || 'home';

    // Throttle: don't double-count if user reloads quickly (within 30s)
    var throttleKey = 'yis-tracked-' + toolName;
    var lastTracked = parseInt(sessionStorage.getItem(throttleKey) || '0');
    if (Date.now() - lastTracked < 30000) return;
    sessionStorage.setItem(throttleKey, Date.now());

    // Helper: today's date as YYYY-MM-DD (UTC)
    function today() {
        var d = new Date();
        return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    }

    function trackVisit() {
        if (typeof db === 'undefined' || typeof firebase === 'undefined') return;

        try {
            // 1. Aggregate daily counter (scales to any volume — single doc per day)
            var dailyRef = db.collection('stats').doc('daily-' + today());
            var inc = firebase.firestore.FieldValue.increment(1);
            var update = {};
            update['tools.' + toolName] = inc;
            update['total'] = inc;
            update['date'] = today();
            dailyRef.set(update, { merge: true }).catch(function() {});

            // 2. Per-user counter (only if logged in)
            var user = (typeof auth !== 'undefined') ? auth.currentUser : null;
            if (user) {
                var userUpdate = {};
                userUpdate['toolsUsed.' + toolName] = inc;
                userUpdate['lastTool'] = toolName;
                userUpdate['lastSeen'] = firebase.firestore.FieldValue.serverTimestamp();
                db.collection('users').doc(user.uid).set(userUpdate, { merge: true }).catch(function() {});
            }
        } catch (e) {
            // Silent fail — analytics should never break the app
        }
    }

    // Wait for Firebase auth to be ready, then track
    if (typeof auth !== 'undefined') {
        var tracked = false;
        auth.onAuthStateChanged(function() {
            if (tracked) return;
            tracked = true;
            trackVisit();
        });
        // Fallback: track after 2s even if auth never resolves
        setTimeout(function() {
            if (!tracked) { tracked = true; trackVisit(); }
        }, 2000);
    } else {
        // No auth available — still track aggregate
        setTimeout(trackVisit, 1000);
    }
})();
