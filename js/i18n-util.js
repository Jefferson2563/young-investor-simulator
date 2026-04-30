/* ============================================================
   YOUNG INVESTOR — Shared i18n utility for tool pages
   Loaded on /dividends/, /portfolio/, /tax/, /goals/, /blog/
   Requires: js/i18n.js (window.YIS_TRANSLATIONS) loaded first
   ============================================================ */
(function() {
    'use strict';
    if (!window.YIS_TRANSLATIONS) return;

    var STORAGE_KEY = 'yis-lang';
    var DEFAULT_LANG = 'en';

    function getLang() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    }

    function setLang(lang) {
        if (!window.YIS_TRANSLATIONS[lang]) lang = DEFAULT_LANG;
        localStorage.setItem(STORAGE_KEY, lang);
        applyI18n();
        // Set RTL for Arabic
        document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }

    function t(key) {
        var lang = getLang();
        var dict = window.YIS_TRANSLATIONS[lang] || window.YIS_TRANSLATIONS[DEFAULT_LANG];
        return dict[key] || window.YIS_TRANSLATIONS[DEFAULT_LANG][key] || '';
    }

    function applyI18n() {
        var lang = getLang();
        var dict = window.YIS_TRANSLATIONS[lang] || window.YIS_TRANSLATIONS[DEFAULT_LANG];

        // textContent updates
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            var v = dict[key];
            if (v != null) el.textContent = v;
        });
        // innerHTML updates (for keys with markup)
        document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-html');
            var v = dict[key];
            if (v != null) el.innerHTML = v;
        });
        // placeholder updates
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-placeholder');
            var v = dict[key];
            if (v != null) el.setAttribute('placeholder', v);
        });
        // title attribute updates
        document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-title');
            var v = dict[key];
            if (v != null) el.setAttribute('title', v);
        });
        // aria-label updates
        document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-aria');
            var v = dict[key];
            if (v != null) el.setAttribute('aria-label', v);
        });

        // Update flag button if present
        var flagBtn = document.getElementById('langFlag');
        if (flagBtn) flagBtn.textContent = dict.flag || lang.toUpperCase();

        // Update active state in language picker
        document.querySelectorAll('.lang-option').forEach(function(opt) {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });

        // Direction
        document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }

    // Wire up language picker if present
    function wireLangPicker() {
        document.querySelectorAll('.lang-option').forEach(function(opt) {
            opt.addEventListener('click', function(e) {
                e.preventDefault();
                setLang(opt.dataset.lang);
                var dropdown = document.getElementById('langDropdown');
                if (dropdown) dropdown.classList.remove('open');
            });
        });
        var langBtn = document.getElementById('langBtn');
        var langDropdown = document.getElementById('langDropdown');
        if (langBtn && langDropdown) {
            langBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langDropdown.classList.toggle('open');
            });
            document.addEventListener('click', function() {
                langDropdown.classList.remove('open');
            });
        }
    }

    // Run on DOM ready
    function ready() {
        applyI18n();
        wireLangPicker();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready);
    } else {
        ready();
    }

    // Expose API
    window.YIS_I18N = {
        getLang: getLang,
        setLang: setLang,
        t: t,
        apply: applyI18n
    };
})();
