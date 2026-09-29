/* The Quiet Hour - all site behaviour, plain ES5-compatible JavaScript.
   No frameworks, no build step, no external requests.
   Sections: 1 mobile menu  2 cart (localStorage)  3 accordions
             4 shop filter + sort  5 forms  6 (none)
*/
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     CHECKOUT_URL - set this to a real hosted checkout (for example a
     Stripe Payment Link or a Shopify cart permalink) before launch.
     While it is an empty string the cart tells the customer plainly
     that online checkout is not open yet and gives the phone and email.
     --------------------------------------------------------------- */
  var CHECKOUT_URL = "";

  var STORE      = "quiet_hour_cart_v1";
  var SHIPPING   = 7.50;
  var FREE_OVER  = 59.00;
  var PHONE      = "(608) 555-0167";
  var EMAIL      = "care@quiethourshop.com";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function usd(n) {
    return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* --- 1. mobile menu ------------------------------------------- */
  var navToggle = $('[data-nav-toggle]');
  var navPanel  = $('[data-nav-panel]');
  if (navToggle && navPanel) {
    navToggle.addEventListener('click', function () {
      var open = navPanel.hasAttribute('data-open');
      if (open) { navPanel.removeAttribute('data-open'); } else { navPanel.setAttribute('data-open', ''); }
      navToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      navToggle.querySelector('[data-nav-label]').textContent = open ? 'Menu' : 'Close';
    });
  }

  /* --- 2. cart -------------------------------------------------- */
  function read() {
    try {
      var raw = window.localStorage.getItem(STORE);
      var arr = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(arr) === '[object Array]' ? arr : [];
    } catch (e) { return []; }
  }
  function save(items) {
    try { window.localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) { /* private mode */ }
    paintCount(items);
  }
  function count(items) {
    var n = 0;
    for (var i = 0; i < items.length; i++) { n += items[i].qty; }
    return n;
  }
  function paintCount(items) {
    items = items || read();
    var n = count(items);
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = String(n);
      el.setAttribute('data-empty', n === 0 ? 'true' : 'false');
    });
    $$('[data-cart-words]').forEach(function (el) {
      el.textContent = n === 1 ? '1 item' : n + ' items';
    });
  }

  $$('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var items = read();
      var slug  = btn.getAttribute('data-slug');
      var qtyIn = btn.getAttribute('data-qty-from') ? $(btn.getAttribute('data-qty-from')) : null;
      var add   = qtyIn ? Math.max(1, Math.min(20, parseInt(qtyIn.value, 10) || 1)) : 1;
      var found = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].slug === slug) { items[i].qty = Math.min(20, items[i].qty + add); found = true; }
      }
      if (!found) {
        items.push({
          slug:  slug,
          name:  btn.getAttribute('data-name'),
          price: parseFloat(btn.getAttribute('data-price')),
          img:   btn.getAttribute('data-img'),
          url:   btn.getAttribute('data-url'),
          qty:   add
        });
      }
      save(items);
      var live = $('[data-add-status]');
      if (live) {
        live.textContent = btn.getAttribute('data-name') + ' added to your cart. ' +
                           count(items) + (count(items) === 1 ? ' item' : ' items') + ' in cart.';
      }
      btn.setAttribute('data-added', '');
      var label = btn.querySelector('[data-add-label]');
      if (label) {
        var original = label.getAttribute('data-original') || label.textContent;
        label.setAttribute('data-original', original);
        label.textContent = 'Added to Cart';
        window.setTimeout(function () {
          label.textContent = original;
          btn.removeAttribute('data-added');
        }, 2200);
      }
    });
  });

  function renderCart() {
    var wrap = $('[data-cart-body]');
    if (!wrap) { return; }
    var items = read();
    var empty = $('[data-cart-empty]');
    var full  = $('[data-cart-full]');
    if (!items.length) {
      if (empty) { empty.hidden = false; }
      if (full)  { full.hidden = true; }
      return;
    }
    if (empty) { empty.hidden = true; }
    if (full)  { full.hidden = false; }

    var rows = '', subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var line = it.price * it.qty;
      subtotal += line;
      rows +=
        '<tr>' +
          '<th scope="row" class="cart-item">' +
            '<img src="' + it.img + '" alt="" width="96" height="69" loading="lazy">' +
            '<a href="' + it.url + '">' + it.name + '</a>' +
          '</th>' +
          '<td class="cart-price" data-label="Price">' + usd(it.price) + '</td>' +
          '<td class="cart-qty" data-label="Quantity">' +
            '<label class="sr-only" for="qty-' + it.slug + '">Quantity for ' + it.name + '</label>' +
            '<input id="qty-' + it.slug + '" type="number" min="0" max="20" step="1" value="' + it.qty + '" ' +
              'inputmode="numeric" data-qty="' + it.slug + '">' +
          '</td>' +
          '<td class="cart-line" data-label="Line total">' + usd(line) + '</td>' +
          '<td class="cart-remove">' +
            '<button type="button" class="link-btn" data-remove="' + it.slug + '">' +
              'Remove<span class="sr-only"> ' + it.name + ' from cart</span></button>' +
          '</td>' +
        '</tr>';
    }
    wrap.innerHTML = rows;

    var ship = subtotal >= FREE_OVER ? 0 : SHIPPING;
    var setText = function (sel, val) { var el = $(sel); if (el) { el.textContent = val; } };
    setText('[data-subtotal]', usd(subtotal));
    setText('[data-shipping]', ship === 0 ? 'Free' : usd(ship));
    setText('[data-total]', usd(subtotal + ship));
    var note = $('[data-ship-note]');
    if (note) {
      note.textContent = ship === 0
        ? 'Standard shipping is free on this order because your subtotal is ' + usd(FREE_OVER) + ' or more.'
        : 'Add ' + usd(FREE_OVER - subtotal) + ' more to qualify for free standard shipping (' +
          usd(FREE_OVER) + ' and over).';
    }

    $$('[data-qty]').forEach(function (input) {
      input.addEventListener('change', function () {
        var slug = input.getAttribute('data-qty');
        var q = parseInt(input.value, 10);
        if (isNaN(q) || q < 0) { q = 0; }
        if (q > 20) { q = 20; }
        var list = read(), out = [];
        for (var i = 0; i < list.length; i++) {
          if (list[i].slug === slug) { if (q > 0) { list[i].qty = q; out.push(list[i]); } }
          else { out.push(list[i]); }
        }
        save(out);
        renderCart();
      });
    });
    $$('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = btn.getAttribute('data-remove');
        var list = read(), out = [];
        for (var i = 0; i < list.length; i++) { if (list[i].slug !== slug) { out.push(list[i]); } }
        save(out);
        renderCart();
        var live = $('[data-cart-status]');
        if (live) { live.textContent = 'Item removed. ' + (out.length ? '' : 'Your cart is now empty.'); }
      });
    });
  }

  var checkoutBtn = $('[data-checkout]');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () {
      if (CHECKOUT_URL) { window.location.href = CHECKOUT_URL; return; }
      var panel = $('[data-checkout-message]');
      if (panel) {
        panel.hidden = false;
        panel.setAttribute('tabindex', '-1');
        panel.focus();
      }
    });
  }

  /* --- 3. accordions -------------------------------------------- */
  $$('[data-accordion] button[aria-expanded]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) { panel.hidden = open; }
    });
  });

  /* --- 4. shop filter + sort ------------------------------------ */
  var grid = $('[data-shop-grid]');
  if (grid) {
    var cards = $$('[data-category]', grid);
    var resultLine = $('[data-shop-count]');
    var activeCat = 'all';

    function apply() {
      var shown = 0;
      cards.forEach(function (card) {
        var match = activeCat === 'all' || card.getAttribute('data-category') === activeCat;
        card.hidden = !match;
        if (match) { shown++; }
      });
      if (resultLine) {
        resultLine.textContent = shown + (shown === 1 ? ' product' : ' products') +
          (activeCat === 'all' ? ' in the shop.' : ' in this category.');
      }
    }
    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeCat = btn.getAttribute('data-filter');
        $$('[data-filter]').forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        apply();
      });
    });
    var sortSel = $('[data-sort]');
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        var mode = sortSel.value;
        var sorted = cards.slice();
        if (mode === 'price-asc' || mode === 'price-desc') {
          sorted.sort(function (a, b) {
            var pa = parseFloat(a.getAttribute('data-price'));
            var pb = parseFloat(b.getAttribute('data-price'));
            return mode === 'price-asc' ? pa - pb : pb - pa;
          });
        } else {
          sorted.sort(function (a, b) {
            return parseInt(a.getAttribute('data-order'), 10) - parseInt(b.getAttribute('data-order'), 10);
          });
        }
        sorted.forEach(function (c) { grid.appendChild(c); });
      });
    }
    apply();
  }

  /* --- 5. forms ------------------------------------------------- */
  function fieldError(input, message) {
    var box = document.getElementById(input.id + '-error');
    if (box) { box.textContent = message || ''; }
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }

  var contact = $('[data-contact-form]');
  if (contact) {
    contact.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-message');
      var order = $('#cf-order');
      var ok = true;
      ok = fieldError(name, name.value.trim() ? '' : 'Please enter your name.') && ok;
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      ok = fieldError(email, emailOk ? '' : 'Please enter an email address we can reply to, like name@example.org.') && ok;
      ok = fieldError(msg, msg.value.trim().length >= 10 ? '' : 'Please tell us a little more - at least 10 characters.') && ok;
      var summary = $('[data-form-summary]');
      if (!ok) {
        if (summary) {
          summary.hidden = false;
          summary.textContent = 'Please check the highlighted fields below and try again.';
          summary.setAttribute('data-state', 'error');
          summary.setAttribute('tabindex', '-1');
          summary.focus();
        }
        return;
      }
      if (summary) { summary.hidden = true; }
      var done = $('[data-form-success]');
      if (done) {
        done.hidden = false;
        var who = $('[data-form-name]');
        if (who) { who.textContent = name.value.trim().split(/\s+/)[0]; }
        var link = $('[data-mailto]');
        if (link) {
          var body = 'Name: ' + name.value.trim() +
                     '\nEmail: ' + email.value.trim() +
                     (order && order.value.trim() ? '\nOrder number: ' + order.value.trim() : '') +
                     '\n\n' + msg.value.trim();
          link.setAttribute('href', 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent('Website enquiry from ' + name.value.trim()) +
            '&body=' + encodeURIComponent(body));
        }
        done.setAttribute('tabindex', '-1');
        done.focus();
      }
      contact.hidden = true;
    });
  }

  var news = $('[data-news-form]');
  if (news) {
    news.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var input = $('#news-email');
      var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      if (!fieldError(input, okEmail ? '' : 'Please enter a valid email address.')) { return; }
      var done = $('[data-news-success]');
      if (done) {
        done.hidden = false;
        var link = $('[data-news-mailto]');
        if (link) {
          link.setAttribute('href', 'mailto:' + EMAIL +
            '?subject=' + encodeURIComponent('Please add me to the mailing list') +
            '&body=' + encodeURIComponent('Please add ' + input.value.trim() + ' to your mailing list.'));
        }
        done.setAttribute('tabindex', '-1');
        done.focus();
      }
      news.hidden = true;
    });
  }


  /* --- init ----------------------------------------------------- */
  paintCount();
  renderCart();
  if (PHONE && EMAIL) { /* referenced above; kept for the checkout message copy */ }
})();
