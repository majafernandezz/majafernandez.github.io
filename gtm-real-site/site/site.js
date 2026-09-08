/* ==========================================================================
   Fika & Co — site script.

   This file plays the role of "the developer". It does two things a real
   site's code does:

   1. At the top of every page, BEFORE Tag Manager loads, it pushes the
      page data (what page is this, who is looking at it) into the dataLayer.

   2. When something happens (a click, a form, a purchase) it pushes an
      event with a nested object describing what happened.

   Nothing in here talks to Google. It only writes to window.dataLayer.
   Your Tag Manager container reads from it.
   ========================================================================== */

/* --------------------------------------------------------------------------
   PART 1 — runs immediately, in <head>, before any container loads
   -------------------------------------------------------------------------- */

window.dataLayer = window.dataLayer || [];

(function () {
    'use strict';

    var PAGE = window.FIKA_PAGE || { type: 'unknown', category: null };

    function readUser() {
        try { return JSON.parse(sessionStorage.getItem('fika.user')) || null; } catch (e) { return null; }
    }

    var user = readUser();

    // The page-data push. No "event" key: it fires no triggers by itself,
    // it just makes these values available to every tag on the page.
    window.dataLayer.push({
        page: {
            type: PAGE.type,              // home | listing | product | checkout | signup
            category: PAGE.category,      // coffee | null
            language: 'en',
            template: 'fika-' + PAGE.type
        },
        user: {
            id: user ? user.id : null,
            logged_in: !!user,
            tier: user ? user.tier : 'guest',
            consent: {
                analytics: true,
                marketing: user ? !!user.marketing : false
            }
        }
    });
})();

/* --------------------------------------------------------------------------
   PART 2 — runs after the page has loaded: catalogue, cart, events
   -------------------------------------------------------------------------- */

(function () {
    'use strict';

    var CURRENCY = 'SEK';
    var BRAND = 'Fika & Co';

    var CATALOGUE = [
        { item_id: 'FK-001', item_name: 'Morning Ritual', item_brand: BRAND, item_category: 'Coffee', item_category2: 'Light roast', item_variant: '250 g', price: 129, colour: '#C98A5B', blurb: 'Washed Ethiopian. Bright, floral, a little like tea. The one you drink before anyone else is awake.' },
        { item_id: 'FK-002', item_name: 'Slow Sunday',    item_brand: BRAND, item_category: 'Coffee', item_category2: 'Medium roast', item_variant: '500 g', price: 219, colour: '#8B5A3C', blurb: 'A Brazil and Colombia blend. Caramel and hazelnut. Made for a big pot and a long morning.' },
        { item_id: 'FK-003', item_name: 'Midnight Oil',   item_brand: BRAND, item_category: 'Coffee', item_category2: 'Dark roast', item_variant: '250 g', price: 139, colour: '#3E2A20', blurb: 'Sumatran, roasted dark. Cocoa and smoke. Holds up to milk, holds up to deadlines.' }
    ];

    var LIST = { item_list_id: 'all_coffees', item_list_name: 'All coffees' };

    /* ------------------------------------------------------------- storage */

    function readJSON(key, fallback) {
        try { return JSON.parse(sessionStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
    }
    function writeJSON(key, value) {
        try {
            if (value === null) { sessionStorage.removeItem(key); }
            else { sessionStorage.setItem(key, JSON.stringify(value)); }
        } catch (e) { /* private mode: the site still works, it just forgets */ }
    }

    function readCart() { return readJSON('fika.cart', []); }
    function writeCart(cart) { writeJSON('fika.cart', cart); }
    function readUser() { return readJSON('fika.user', null); }

    /* ------------------------------------------------------------- helpers */

    function product(id) {
        return CATALOGUE.filter(function (p) { return p.item_id === id; })[0] || null;
    }

    // A GA4 "item" object: the catalogue entry minus the fields GA4 does not want.
    function item(p, extra) {
        var out = {
            item_id: p.item_id,
            item_name: p.item_name,
            item_brand: p.item_brand,
            item_category: p.item_category,
            item_category2: p.item_category2,
            item_variant: p.item_variant,
            price: p.price,
            quantity: 1
        };
        return Object.assign(out, extra || {});
    }

    function money(n) { return n.toLocaleString('sv-SE') + ' kr'; }

    function cartItems() {
        return readCart().map(function (line, index) {
            return item(product(line.item_id), { quantity: line.quantity, index: index });
        });
    }
    function cartValue(items) {
        return items.reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
    }

    /* ------------------------------------------------------- the two pushes */

    // Plain event with a nested payload.
    function push(payload) {
        window.dataLayer.push(payload);
    }

    // Ecommerce event. The clear-then-push pattern: without the first push,
    // items from the previous event would still be in the ecommerce object
    // (objects merge in the dataLayer — see exercise 3).
    function pushEcommerce(eventName, ecommerce) {
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({ event: eventName, ecommerce: ecommerce });
    }

    /* --------------------------------------------------------- shared UI */

    function renderAccount() {
        var host = document.getElementById('account');
        if (!host) { return; }
        var user = readUser();
        host.innerHTML = user
            ? '<span>Hi, member ' + user.id + '</span><button type="button" data-act="logout">Log out</button>'
            : '<span>Not logged in</span><button type="button" data-act="login">Log in (demo)</button>';
    }

    function login() {
        // A pretend login. A real site would get this from its backend.
        var user = { id: 'u-48213', tier: 'member', marketing: true };
        writeJSON('fika.user', user);
        push({
            event: 'login',
            method: 'demo_button',
            user: { id: user.id, logged_in: true, tier: user.tier, consent: { marketing: true } }
        });
        renderAccount();
    }

    function logout() {
        writeJSON('fika.user', null);
        push({
            event: 'logout',
            user: { id: null, logged_in: false, tier: 'guest', consent: { marketing: false } }
        });
        renderAccount();
    }

    function bindShared() {
        document.addEventListener('click', function (e) {
            var act = e.target.getAttribute && e.target.getAttribute('data-act');
            if (act === 'login') { login(); }
            if (act === 'logout') { logout(); }
        });

        // Footer newsletter form.
        // EXERCISE 6: this form does not push anything to the dataLayer yet.
        // Writing that push is part of the last exercise in module 5.
        var news = document.getElementById('footer-newsletter');
        if (news) {
            news.addEventListener('submit', function (e) {
                e.preventDefault();
                news.innerHTML = '<p class="notice">Thanks — you are on the list.</p>';
            });
        }

        // Call-to-action links. Push first, then follow the link.
        document.querySelectorAll('[data-cta]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                var href = el.getAttribute('href');
                push({
                    event: 'cta_click',
                    cta: {
                        text: el.textContent.trim(),
                        location: el.getAttribute('data-cta'),
                        destination: href
                    }
                });
                setTimeout(function () { window.location.href = href; }, 200);
            });
        });
    }

    /* --------------------------------------------------------------- pages */

    function swatch(p, cls) {
        return '<div class="' + (cls || 'swatch') + '" style="background:' + p.colour + '"></div>';
    }

    function pageListing() {
        var grid = document.getElementById('product-grid');
        grid.innerHTML = CATALOGUE.map(function (p, i) {
            return '<div class="product" data-item-id="' + p.item_id + '">' +
                swatch(p) +
                '<h3><a class="title" href="product.html?sku=' + p.item_id + '" data-select="' + i + '">' + p.item_name + '</a></h3>' +
                '<p class="meta">' + p.item_category2 + ' · ' + p.item_variant + '</p>' +
                '<p class="price">' + money(p.price) + '</p>' +
                '<div class="row">' +
                    '<a class="btn ghost small" href="product.html?sku=' + p.item_id + '" data-select="' + i + '">View</a>' +
                    '<button class="btn small" type="button" data-add="' + p.item_id + '">Add to cart</button>' +
                '</div>' +
            '</div>';
        }).join('');

        // The list is on screen.
        pushEcommerce('view_item_list', {
            item_list_id: LIST.item_list_id,
            item_list_name: LIST.item_list_name,
            items: CATALOGUE.map(function (p, i) {
                return item(p, { index: i, item_list_id: LIST.item_list_id, item_list_name: LIST.item_list_name });
            })
        });

        grid.addEventListener('click', function (e) {
            var sel = e.target.closest('[data-select]');
            if (sel) {
                e.preventDefault();
                var i = Number(sel.getAttribute('data-select'));
                var p = CATALOGUE[i];
                pushEcommerce('select_item', {
                    item_list_id: LIST.item_list_id,
                    item_list_name: LIST.item_list_name,
                    items: [item(p, { index: i, item_list_id: LIST.item_list_id, item_list_name: LIST.item_list_name })]
                });
                setTimeout(function () { window.location.href = sel.getAttribute('href'); }, 200);
                return;
            }
            var add = e.target.closest('[data-add]');
            if (add) { addToCart(add.getAttribute('data-add'), 1, add); }
        });
    }

    function addToCart(id, qty, button) {
        var p = product(id);
        var cart = readCart();
        var line = cart.filter(function (l) { return l.item_id === id; })[0];
        if (line) { line.quantity += qty; } else { cart.push({ item_id: id, quantity: qty }); }
        writeCart(cart);

        pushEcommerce('add_to_cart', {
            currency: CURRENCY,
            value: p.price * qty,
            items: [item(p, { quantity: qty })]
        });

        if (button) {
            var was = button.textContent;
            button.textContent = 'Added';
            setTimeout(function () { button.textContent = was; }, 1200);
        }
        var notice = document.getElementById('notice');
        if (notice) { notice.textContent = qty + ' × ' + p.item_name + ' added. ' + cartCount() + ' in cart.'; }
    }

    function cartCount() {
        return readCart().reduce(function (n, l) { return n + l.quantity; }, 0) + ' item(s)';
    }

    function pageProduct() {
        var id = new URLSearchParams(window.location.search).get('sku') || 'FK-001';
        var p = product(id) || CATALOGUE[0];

        document.title = p.item_name + ' — Fika & Co';
        document.getElementById('pdp').innerHTML =
            swatch(p) +
            '<div>' +
                '<p class="meta">' + p.item_category2 + ' · ' + p.item_variant + ' · ' + p.item_id + '</p>' +
                '<h1>' + p.item_name + '</h1>' +
                '<p class="price">' + money(p.price) + '</p>' +
                '<p>' + p.blurb + '</p>' +
                '<div class="qty"><label for="qty">Bags</label><input id="qty" type="number" min="1" max="9" value="1"></div>' +
                '<button class="btn" type="button" id="add">Add to cart</button> ' +
                '<a class="btn ghost" href="checkout.html">Go to checkout</a>' +
                '<p class="notice" id="notice"></p>' +
            '</div>';

        // Note: the product is described inside ecommerce.items[0], not at the
        // top level. That is the shape GA4 expects, and the shape you will read
        // with dot notation in Tag Manager: ecommerce.items.0.item_name
        pushEcommerce('view_item', {
            currency: CURRENCY,
            value: p.price,
            items: [item(p)]
        });

        document.getElementById('add').addEventListener('click', function () {
            var qty = Math.max(1, Math.min(9, Number(document.getElementById('qty').value) || 1));
            addToCart(p.item_id, qty, this);
        });
    }

    function pageCheckout() {
        var items = cartItems();
        var host = document.getElementById('cart');
        var form = document.getElementById('checkout-form');

        function render() {
            if (!items.length) {
                host.innerHTML = '<p class="empty">Your cart is empty. <a href="products.html">Pick a coffee.</a></p>';
                var submit = form.querySelector('button');
                if (submit) { submit.disabled = true; }
                return;
            }
            host.innerHTML = '<table><thead><tr><th>Coffee</th><th class="num">Qty</th><th class="num">Price</th></tr></thead><tbody>' +
                items.map(function (i) {
                    return '<tr><td>' + i.item_name + '<br><span class="meta">' + i.item_variant + '</span></td>' +
                        '<td class="num">' + i.quantity + '</td><td class="num">' + money(i.price * i.quantity) + '</td></tr>';
                }).join('') +
                '</tbody><tfoot><tr><td>Shipping</td><td></td><td class="num">' + money(49) + '</td></tr>' +
                '<tr><td>Total</td><td></td><td class="num">' + money(cartValue(items) + 49) + '</td></tr></tfoot></table>';
        }
        render();

        if (items.length) {
            pushEcommerce('begin_checkout', {
                currency: CURRENCY,
                value: cartValue(items),
                items: items
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!items.length) { return; }
            var value = cartValue(items);
            var txn = 'FK-' + Date.now().toString().slice(-6);
            var shipping = form.elements.shipping.value;

            pushEcommerce('purchase', {
                transaction_id: txn,
                currency: CURRENCY,
                value: value + 49,
                tax: Math.round((value + 49) * 0.12),
                shipping: 49,
                coupon: form.elements.coupon.value.trim() || undefined,
                items: items
            });

            // Real sites also push non-ecommerce facts about the order.
            push({
                event: 'order_details',
                order: {
                    id: txn,
                    delivery: { method: shipping, country: 'SE' },
                    payment: { method: form.elements.payment.value },
                    lines: items.length
                }
            });

            writeCart([]);
            items = [];
            form.innerHTML = '<div class="done"><b>Order ' + txn + ' placed.</b> This is a demo: nothing was charged and no coffee is coming, sadly.</div>';
            render();
        });
    }

    function pageSignup() {
        var form = document.getElementById('signup-form');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var plan = form.elements.plan.value;
            var bag = form.elements.bag.value;
            var marketing = form.elements.marketing.checked;

            // Note the two nested objects: "lead" is new, "user" already exists
            // from the page-data push. Pushing user.consent.marketing here does
            // not remove user.id or user.tier: objects MERGE in the dataLayer.
            push({
                event: 'generate_lead',
                lead: {
                    plan: plan,
                    bag_size: bag,
                    source: 'signup_page',
                    value: plan === 'weekly' ? 129 * 4 : 129
                },
                user: {
                    consent: { marketing: marketing }
                }
            });

            var user = readUser();
            if (user) { user.marketing = marketing; writeJSON('fika.user', user); }

            form.innerHTML = '<div class="done"><b>Welcome to the club.</b> Plan: ' + plan + ', ' + bag + ' bags. ' +
                (marketing ? 'We will email you.' : 'We will not email you.') + ' (Demo: nothing was sent.)</div>';
        });
    }

    /* ---------------------------------------------------------------- boot */

    function init() {
        renderAccount();
        bindShared();
        var page = document.body.getAttribute('data-page');
        if (page === 'listing')  { pageListing(); }
        if (page === 'product')  { pageProduct(); }
        if (page === 'checkout') { pageCheckout(); }
        if (page === 'signup')   { pageSignup(); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
