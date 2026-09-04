/* ==========================================================================
   GTM Course — shared runtime
   Two jobs:
   1. Let a student attach their OWN Google Tag Manager container to these
      pages, with no code editing: ?gtm=GTM-XXXXXXX once, then it is
      remembered in localStorage for every page in the course.
   2. Show the dataLayer live on the page, so beginners can see what they are
      tracking before they are comfortable in the browser console.
   ========================================================================== */

window.dataLayer = window.dataLayer || [];

(function () {
    'use strict';

    var STORE_KEY = 'gtmCourse.containerId';
    var HIDE_KEY  = 'gtmCourse.hideGtmEvents';

    // assets/config.js is where a teacher or student sets their container once.
    var CONFIG = window.GTM_COURSE_CONFIG || {};

    /* ---------------------------------------------------------------- utils */

    function read(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try {
            if (value === null) { window.localStorage.removeItem(key); }
            else { window.localStorage.setItem(key, value); }
        } catch (e) { /* private mode — the page still works, it just forgets */ }
    }
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function isValidId(id) {
        return /^GTM-[A-Z0-9]{4,10}$/.test(String(id || '').trim().toUpperCase());
    }

    /* ------------------------------------------------------- container load */

    var containerId = null;

    function loadContainer(id) {
        if (!isValidId(id) || window.google_tag_manager) { return false; }
        id = id.trim().toUpperCase();
        containerId = id;

        // This is the standard Google Tag Manager snippet. On a real website you
        // paste it directly into the <head> of every page instead.
        (function (w, d, s, l, i) {
            w[l] = w[l] || [];
            w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s),
                dl = l !== 'dataLayer' ? '&l=' + l : '';
            j.async = true;
            j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
            f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', id);

        return true;
    }

    // A ?gtm= parameter always wins, and is remembered for the next page.
    var fromUrl = new URLSearchParams(window.location.search).get('gtm');
    if (fromUrl && isValidId(fromUrl)) {
        write(STORE_KEY, fromUrl.trim().toUpperCase());
    }
    var stored = read(STORE_KEY) || CONFIG.containerId;
    if (stored) { loadContainer(stored); }

    /* ---------------------------------------------------------- the monitor */

    var feed, countEl, statusEl, statusDot, rendered = 0, hideGtm = read(HIDE_KEY) === '1';

    function formatValue(value, depth) {
        depth = depth || 0;
        if (value === null) { return '<span class="n">null</span>'; }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return '<span class="n">' + esc(value) + '</span>';
        }
        if (typeof value === 'function') { return '<span class="n">function</span>'; }
        if (typeof value !== 'object') { return '<span class="s">"' + esc(value) + '"</span>'; }
        if (depth > 4) { return '<span class="n">{…}</span>'; }

        var pad = '  '.repeat(depth + 1);
        var closePad = '  '.repeat(depth);

        if (Array.isArray(value)) {
            if (!value.length) { return '[]'; }
            return '[\n' + value.map(function (v) {
                return pad + formatValue(v, depth + 1);
            }).join(',\n') + '\n' + closePad + ']';
        }
        var keys = Object.keys(value);
        if (!keys.length) { return '{}'; }
        return '{\n' + keys.map(function (k) {
            return pad + '<span class="k">' + esc(k) + '</span>: ' + formatValue(value[k], depth + 1);
        }).join(',\n') + '\n' + closePad + '}';
    }

    function describe(entry) {
        if (Array.isArray(entry)) {
            // gtag() calls land in the dataLayer as arguments objects / arrays
            return { name: String(entry[0] || 'arguments'), body: formatValue(Array.prototype.slice.call(entry, 1)) };
        }
        if (entry && typeof entry === 'object') {
            var name = entry.event || entry['gtm.start'] ? (entry.event || 'gtm.start') : '(no event key)';
            var rest = {};
            Object.keys(entry).forEach(function (k) {
                if (k !== 'event') { rest[k] = entry[k]; }
            });
            return { name: name, body: Object.keys(rest).length ? formatValue(rest) : '' };
        }
        return { name: '(' + typeof entry + ')', body: esc(String(entry)) };
    }

    function renderEntry(entry, index, animate) {
        var info = describe(entry);
        var row = document.createElement('div');
        row.className = 'evt' + (animate ? ' new' : '');
        row.dataset.gtmEvent = /^gtm\./.test(info.name) ? '1' : '0';
        if (hideGtm && row.dataset.gtmEvent === '1') { row.style.display = 'none'; }
        row.innerHTML =
            '<span class="evt-time">[' + index + ']</span>' +
            '<span class="evt-name">' + esc(info.name) + '</span>' +
            (info.body ? '<pre class="evt-body">' + info.body + '</pre>' : '');
        feed.appendChild(row);
    }

    function sync() {
        if (!feed) { return; }
        var animate = rendered > 0;
        while (rendered < window.dataLayer.length) {
            renderEntry(window.dataLayer[rendered], rendered, animate);
            rendered++;
        }
        countEl.textContent = window.dataLayer.length + (window.dataLayer.length === 1 ? ' entry' : ' entries');
        feed.scrollTop = feed.scrollHeight;
        updateStatus();
    }

    function updateStatus() {
        if (!statusEl) { return; }
        if (window.google_tag_manager) {
            var ids = Object.keys(window.google_tag_manager).filter(isValidId);
            statusDot.className = 'dot live';
            statusEl.textContent = 'Container ' + (ids[0] || containerId || 'loaded') + ' is running on this page';
        } else if (containerId) {
            statusDot.className = 'dot';
            statusEl.textContent = 'Loading ' + containerId + '…';
        } else {
            statusDot.className = 'dot off';
            statusEl.textContent = 'No container connected — the dataLayer still works';
        }
    }

    /* ------------------------------------------------------------- build UI */

    function buildMonitor(host) {
        host.innerHTML =
            '<div class="monitor">' +
                '<div class="monitor-head"><span>dataLayer</span><span class="count">0 entries</span></div>' +
                '<div class="monitor-status"><span class="dot off"></span><span class="status-text">No container connected</span></div>' +
                '<div class="monitor-feed" role="log" aria-live="polite" aria-label="Live dataLayer events"></div>' +
                '<div class="monitor-foot">' +
                    '<button type="button" data-act="toggle"></button>' +
                    '<button type="button" data-act="copy">Copy as JSON</button>' +
                    '<button type="button" data-act="console">Log to console</button>' +
                '</div>' +
            '</div>' +
            '<div class="connect">' +
                '<p class="connect-copy"></p>' +
                '<div class="row">' +
                    '<input type="text" id="gtm-id-input" placeholder="GTM-XXXXXXX" spellcheck="false" aria-label="Your GTM container ID">' +
                    '<button type="button" class="btn" data-act="connect">Connect</button>' +
                '</div>' +
            '</div>';

        feed = host.querySelector('.monitor-feed');
        countEl = host.querySelector('.count');
        statusEl = host.querySelector('.status-text');
        statusDot = host.querySelector('.monitor-status .dot');

        var toggleBtn = host.querySelector('[data-act="toggle"]');
        function labelToggle() {
            toggleBtn.textContent = hideGtm ? 'Show gtm.* events' : 'Hide gtm.* events';
        }
        labelToggle();

        host.addEventListener('click', function (e) {
            var act = e.target.getAttribute && e.target.getAttribute('data-act');
            if (!act) { return; }

            if (act === 'toggle') {
                hideGtm = !hideGtm;
                write(HIDE_KEY, hideGtm ? '1' : '0');
                labelToggle();
                feed.querySelectorAll('.evt').forEach(function (row) {
                    row.style.display = (hideGtm && row.dataset.gtmEvent === '1') ? 'none' : '';
                });
            }

            if (act === 'copy') {
                var json = JSON.stringify(window.dataLayer, function (k, v) {
                    return typeof v === 'function' ? '[function]' : v;
                }, 2);
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(json).then(function () {
                        e.target.textContent = 'Copied';
                        setTimeout(function () { e.target.textContent = 'Copy as JSON'; }, 1400);
                    });
                }
            }

            if (act === 'console') {
                console.log('%cdataLayer', 'color:#FF9900;font-weight:bold', window.dataLayer);
                console.table(window.dataLayer.map(function (entry, i) {
                    return { index: i, event: (entry && entry.event) || '', keys: Object.keys(entry || {}).join(', ') };
                }));
            }

            if (act === 'connect') {
                var input = host.querySelector('#gtm-id-input');
                var id = input.value.trim().toUpperCase();
                if (!isValidId(id)) {
                    input.value = '';
                    input.placeholder = 'Looks like GTM-XXXXXXX';
                    input.focus();
                    return;
                }
                write(STORE_KEY, id);
                window.location.search = new URLSearchParams(
                    Object.assign(
                        Object.fromEntries(new URLSearchParams(window.location.search)),
                        { gtm: id }
                    )
                ).toString();
            }

            if (act === 'disconnect') {
                write(STORE_KEY, null);
                var params = new URLSearchParams(window.location.search);
                params.delete('gtm');
                window.location.search = params.toString();
            }
        });

        refreshConnectBox(host);
        sync();
        setInterval(sync, 250);
    }

    function refreshConnectBox(host) {
        var box = host.querySelector('.connect');
        if (CONFIG.hideConnectBox && containerId) {
            box.parentNode.removeChild(box);
            return;
        }
        var copy = host.querySelector('.connect-copy');
        var row = host.querySelector('.connect .row');
        if (containerId) {
            copy.innerHTML = 'Your container <b>' + esc(containerId) + '</b> is attached to every page in this course. ' +
                'Open <b>Preview</b> in Tag Manager to debug it.';
            row.innerHTML = '<button type="button" class="btn secondary" data-act="disconnect">Disconnect container</button>';
        } else {
            copy.innerHTML = 'Paste your container ID to load Tag Manager on this page. It is remembered for every ' +
                'exercise. To set it permanently, edit <b>assets/config.js</b>.';
        }
    }

    /* ------------------------------------------------------------ bootstrap */

    function init() {
        var host = document.getElementById('monitor');
        if (host) { buildMonitor(host); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* Small helper the exercise pages use, so every page pushes the same way. */
    window.Course = {
        push: function (payload) {
            window.dataLayer.push(payload);
            console.log('%cdataLayer.push', 'color:#FF9900;font-weight:bold', payload);
            return payload;
        },
        param: function (name) {
            return new URLSearchParams(window.location.search).get(name);
        },
        containerId: function () { return containerId; }
    };
})();
