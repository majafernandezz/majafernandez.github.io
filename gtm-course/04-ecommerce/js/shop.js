/* ==========================================================================
   Demo shop — pushes the standard GA4 ecommerce events.
   Every push follows the same two-step pattern:
     1. dataLayer.push({ ecommerce: null })  — clear the previous product
     2. dataLayer.push({ event, ecommerce }) — send the new one
   ========================================================================== */

(function () {
    'use strict';

    var CURRENCY = 'SEK';
    var LIST_ID = 'featured';
    var LIST_NAME = 'Featured products';

    var CATALOGUE = [
        { item_id: 'SKU-101', item_name: 'Blue running shoe',  item_category: 'Shoes',     item_brand: 'Demo', price: 899 },
        { item_id: 'SKU-102', item_name: 'Wool training sock', item_category: 'Accessories', item_brand: 'Demo', price: 119 },
        { item_id: 'SKU-103', item_name: 'Reflective jacket',  item_category: 'Outerwear', item_brand: 'Demo', price: 1490 }
    ];

    var cart = [];

    /* ------------------------------------------------------------- helpers */

    function push(eventName, ecommerce) {
        // Step 1: clear. Without this, items from the previous event linger.
        window.dataLayer.push({ ecommerce: null });

        // Step 2: send.
        var payload = { event: eventName, ecommerce: ecommerce };
        window.dataLayer.push(payload);
        console.log('%cecommerce → ' + eventName, 'color:#FF9900;font-weight:bold', payload);
    }

    function cartValue() {
        return cart.reduce(function (sum, item) {
            return sum + (item.price * item.quantity);
        }, 0);
    }

    function money(amount) {
        return amount.toLocaleString('sv-SE') + ' ' + CURRENCY;
    }

    function findProduct(id) {
        return CATALOGUE.filter(function (p) { return p.item_id === id; })[0];
    }

    /* ---------------------------------------------------------------- view */

    function renderProducts() {
        var grid = document.getElementById('product-grid');

        grid.innerHTML = CATALOGUE.map(function (product, index) {
            return '' +
                '<div class="product" data-item-id="' + product.item_id + '">' +
                    '<h4>' + product.item_name + '</h4>' +
                    '<p class="price">' + money(product.price) + '</p>' +
                    '<p class="sku">' + product.item_id + ' · ' + product.item_category + '</p>' +
                    '<div class="row">' +
                        '<button class="btn secondary select-item" data-item-id="' + product.item_id + '">View</button>' +
                        '<button class="btn signal add-to-cart" data-item-id="' + product.item_id + '">Add to cart</button>' +
                    '</div>' +
                '</div>';
        }).join('');

        // The list is on screen — report it once.
        push('view_item_list', {
            item_list_id: LIST_ID,
            item_list_name: LIST_NAME,
            items: CATALOGUE.map(function (product, index) {
                return Object.assign({}, product, {
                    index: index,
                    item_list_id: LIST_ID,
                    item_list_name: LIST_NAME
                });
            })
        });
    }

    function renderCart() {
        var list = document.getElementById('cart-lines');
        var total = document.getElementById('cart-total');
        var checkoutBtn = document.getElementById('begin-checkout');

        if (!cart.length) {
            list.innerHTML = '<li class="empty">The cart is empty.</li>';
            total.textContent = money(0);
            checkoutBtn.disabled = true;
            return;
        }

        list.innerHTML = cart.map(function (item) {
            return '' +
                '<li>' +
                    '<span>' + item.item_name + ' × ' + item.quantity + '</span>' +
                    '<span class="line-right">' +
                        money(item.price * item.quantity) +
                        ' <button class="link-btn remove-from-cart" data-item-id="' + item.item_id + '">remove</button>' +
                    '</span>' +
                '</li>';
        }).join('');

        total.textContent = money(cartValue());
        checkoutBtn.disabled = false;
    }

    function status(text) {
        document.getElementById('shop-status').textContent = text;
    }

    /* -------------------------------------------------------------- events */

    function selectItem(id) {
        var product = findProduct(id);
        var index = CATALOGUE.indexOf(product);

        push('select_item', {
            item_list_id: LIST_ID,
            item_list_name: LIST_NAME,
            items: [Object.assign({}, product, { index: index, item_list_id: LIST_ID, item_list_name: LIST_NAME })]
        });

        // On a real shop the visitor now lands on the product page, which sends view_item.
        push('view_item', {
            currency: CURRENCY,
            value: product.price,
            items: [Object.assign({}, product, { quantity: 1 })]
        });

        status('Viewed ' + product.item_name + '. Two events went out: select_item, then view_item.');
    }

    function addToCart(id) {
        var product = findProduct(id);
        var line = cart.filter(function (item) { return item.item_id === id; })[0];

        if (line) { line.quantity += 1; }
        else { cart.push(Object.assign({}, product, { quantity: 1 })); }

        push('add_to_cart', {
            currency: CURRENCY,
            value: product.price,
            items: [Object.assign({}, product, { quantity: 1 })]
        });

        renderCart();
        status('Added ' + product.item_name + '. Note that value is the price of what was added, not the cart total.');
    }

    function removeFromCart(id) {
        var line = cart.filter(function (item) { return item.item_id === id; })[0];
        if (!line) { return; }

        push('remove_from_cart', {
            currency: CURRENCY,
            value: line.price * line.quantity,
            items: [Object.assign({}, line)]
        });

        cart = cart.filter(function (item) { return item.item_id !== id; });
        renderCart();
        status('Removed ' + line.item_name + '.');
    }

    function beginCheckout() {
        if (!cart.length) { return; }

        push('begin_checkout', {
            currency: CURRENCY,
            value: cartValue(),
            items: cart.map(function (item) { return Object.assign({}, item); })
        });

        document.getElementById('purchase').disabled = false;
        status('Checkout started. The whole cart is in items, and value is the cart total.');
    }

    function purchase() {
        if (!cart.length) { return; }

        var transactionId = 'T-' + Date.now().toString().slice(-8);
        var shipping = 49;
        var goods = cartValue();

        push('purchase', {
            transaction_id: transactionId,
            currency: CURRENCY,
            value: goods + shipping,
            tax: Math.round(goods * 0.25 * 100) / 100,
            shipping: shipping,
            items: cart.map(function (item) { return Object.assign({}, item); })
        });

        status('Order ' + transactionId + ' placed. transaction_id is what stops GA4 counting it twice.');

        cart = [];
        renderCart();
        document.getElementById('purchase').disabled = true;
    }

    /* ----------------------------------------------------------- bootstrap */

    function init() {
        renderProducts();
        renderCart();

        document.getElementById('product-grid').addEventListener('click', function (event) {
            var button = event.target.closest('button');
            if (!button) { return; }

            if (button.classList.contains('select-item')) { selectItem(button.dataset.itemId); }
            if (button.classList.contains('add-to-cart')) { addToCart(button.dataset.itemId); }
        });

        document.getElementById('cart-lines').addEventListener('click', function (event) {
            var button = event.target.closest('.remove-from-cart');
            if (button) { removeFromCart(button.dataset.itemId); }
        });

        document.getElementById('begin-checkout').addEventListener('click', beginCheckout);
        document.getElementById('purchase').addEventListener('click', purchase);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
