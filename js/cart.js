// The cart and checkout page.

document.addEventListener('DOMContentLoaded', function () {
  const NB = window.NileBean;
  const api = window.NileBeanAPI;
  const $ = id => document.getElementById(id);
  const esc = NB.escapeHtml;

  const empty = $('emptyCart');
  const content = $('cartContent');
  const checkout = $('checkoutForm');
  const list = $('cartItemsList');
  const checkoutError = $('checkoutError');
  const checkoutNotice = $('checkoutNotice');

  // The cart lives in main.js. This file used to parse its own copy out of
  // localStorage, so mutations made through NileBean were invisible here and
  // the UI never updated (AUDIT.md section 2.2). Always read it fresh.
  const cart = () => NB.getCart();

  // ----- view switching --------------------------------------------------

  function setTitle(en, ar) {
    $('pageTitle').textContent = en;
    $('pageTitleAr').textContent = ar;
  }

  function showCart() {
    checkout.classList.add('hidden');
    setTitle('Your cart', 'السلة');
    if (cart().length === 0) {
      empty.classList.remove('hidden');
      content.classList.add('hidden');
      list.innerHTML = '';
      return;
    }
    empty.classList.add('hidden');
    content.classList.remove('hidden');
    renderLines();
    guardLinePhotos();
    renderTotals();
  }

  function showCheckout() {
    content.classList.add('hidden');
    checkout.classList.remove('hidden');
    setTitle('Checkout', 'الدفع');
    renderCheckoutItems();
    renderTotals();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Ordering requires an account, because an order belongs to someone.
    if (!api.isLoggedIn()) {
      checkoutNotice.innerHTML =
        'You will need to <a href="login.html?next=cart.html" style="color: var(--saffron)">sign in</a> to place this order. Your cart is kept.';
    } else {
      const user = api.getUser();
      checkoutNotice.textContent = `Ordering as ${user.username}.`;
      if (!$('fullName').value) $('fullName').value = user.full_name || '';
      if (!$('email').value) $('email').value = user.email || '';
    }
  }

  // ----- rendering -------------------------------------------------------

  function optionChips(item) {
    const chips = [];
    if (item.size) chips.push(item.size);
    if (item.sugar) {
      const ar = NB.SUGAR_AR[item.sugar];
      chips.push(ar ? `${item.sugar.split(' · ')[0]} · ${ar}` : item.sugar);
    }
    if (item.milk) chips.push(`${item.milk} milk`);
    (item.extras || []).forEach(e => chips.push(`+ ${e}`));
    return chips.map(c => `<span class="chip">${esc(c)}</span>`).join('');
  }

  function renderLines() {
    list.innerHTML = cart()
      .map(
        (item, index) => `
      <div class="cart-line">
        <img class="cart-line__photo" src="${esc(NB.imageUrl(item.image, 200, '1:1'))}" alt="" width="96" height="96" loading="lazy" decoding="async">
        <div>
          ${item.nameAr ? `<div class="cart-line__ar" lang="ar" dir="rtl">${esc(item.nameAr)}</div>` : ''}
          <div class="cart-line__name">${esc(item.name)}</div>
          <div class="cart-line__opts">${optionChips(item)}</div>
          ${item.specialInstructions ? `<p class="cart-line__note">Note: ${esc(item.specialInstructions)}</p>` : ''}
          <div class="cart-line__controls">
            <div class="qty" role="group" aria-label="Quantity of ${esc(item.name)}">
              <button type="button" data-action="dec" data-index="${index}" aria-label="Decrease quantity of ${esc(item.name)}"${item.quantity <= 1 ? ' disabled' : ''}>${NB.icon('minus')}</button>
              <output aria-live="polite">${item.quantity}</output>
              <button type="button" data-action="inc" data-index="${index}" aria-label="Increase quantity of ${esc(item.name)}">${NB.icon('plus')}</button>
            </div>
            <button type="button" class="link-btn" data-action="remove" data-index="${index}">
              ${NB.icon('trash')} Remove<span class="visually-hidden"> ${esc(item.name)}</span>
            </button>
          </div>
        </div>
        <div class="cart-line__price">${esc(NB.formatEGP(NB.getLineTotal(item)))}</div>
      </div>`
      )
      .join('');
  }

  // A dead photo link becomes a name plate rather than a broken-image box.
  function guardLinePhotos() {
    list.querySelectorAll('.cart-line').forEach((row, i) => {
      NB.guardPhoto(row.querySelector('img'), cart()[i]);
    });
  }

  function renderTotals() {
    const subtotal = NB.getCartSubtotal();
    const tax = Math.round(subtotal * NB.TAX_RATE * 100) / 100;
    const total = subtotal + tax;
    [['subtotal', subtotal], ['tax', tax], ['total', total],
     ['checkoutSubtotal', subtotal], ['checkoutTax', tax], ['checkoutTotal', total]]
      .forEach(([id, value]) => { $(id).textContent = NB.formatEGP(value); });
  }

  function renderCheckoutItems() {
    $('checkoutItems').innerHTML = cart()
      .map(
        item => `
      <div class="summary__line">
        <span>${item.quantity} &times; ${esc(item.name)}</span>
        <span>${esc(NB.formatEGP(NB.getLineTotal(item)))}</span>
      </div>`
      )
      .join('');
  }

  // One delegated listener for every line control, attached once.
  list.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    const item = cart()[index];
    if (!item) return;

    if (button.dataset.action === 'inc') NB.updateCartItem(index, { quantity: Math.min(item.quantity + 1, 99) });
    if (button.dataset.action === 'dec' && item.quantity > 1) NB.updateCartItem(index, { quantity: item.quantity - 1 });
    if (button.dataset.action === 'remove') NB.removeCartItem(index);

    showCart();
    // Keep keyboard focus on the same control after the re-render.
    const again = list.querySelector(`button[data-action="${button.dataset.action}"][data-index="${index}"]`);
    if (again && !again.disabled) again.focus();
  });

  // ----- validation ------------------------------------------------------
  // The checkout form originally had no validation and nothing read what was
  // typed into it (AUDIT.md section 6.5).

  const value = id => ($(id)?.value || '').trim();
  const selected = name => document.querySelector(`input[name="${name}"]:checked`)?.value || null;

  function clearErrors() {
    checkoutError.textContent = '';
    checkoutError.classList.add('hidden');
    checkout.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    checkout.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFormError(message) {
    checkoutError.textContent = message;
    checkoutError.classList.remove('hidden');
  }

  function validate() {
    clearErrors();
    const errors = [];
    const orderType = selected('orderType');
    const payment = selected('paymentMethod');

    if (!value('fullName')) errors.push(['fullName', 'Enter your full name.']);

    const phone = value('phone');
    if (!phone) errors.push(['phone', 'Enter a phone number.']);
    else if (!/^[+()\d][\d\s()+-]{4,}$/.test(phone)) errors.push(['phone', 'Enter a valid phone number.']);

    const email = value('email');
    if (!email) errors.push(['email', 'Enter an email address.']);
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(['email', 'Enter a valid email address.']);

    if (orderType === 'delivery') {
      if (!value('street')) errors.push(['street', 'Enter a street address for delivery.']);
      if (!value('city')) errors.push(['city', 'Enter a city.']);
      if (!value('zipCode')) errors.push(['zipCode', 'Enter a postal code.']);
    }

    if (payment === 'card') {
      // No card is charged; these only stop obviously wrong input. Card
      // details are never sent anywhere.
      const number = value('cardNumber').replace(/[\s-]/g, '');
      if (!number) errors.push(['cardNumber', 'Enter a card number.']);
      else if (!/^\d{12,19}$/.test(number)) errors.push(['cardNumber', 'A card number is 12 to 19 digits.']);
      const expiry = value('cardExpiry');
      if (!expiry) errors.push(['cardExpiry', 'Enter the expiry date.']);
      else if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry)) errors.push(['cardExpiry', 'Use MM/YY.']);
      const cvc = value('cardCvc');
      if (!cvc) errors.push(['cardCvc', 'Enter the CVC.']);
      else if (!/^\d{3,4}$/.test(cvc)) errors.push(['cardCvc', 'A CVC is 3 or 4 digits.']);
      if (!value('cardName')) errors.push(['cardName', 'Enter the name on the card.']);
    }

    errors.forEach(([id, message]) => {
      $(`${id}Error`).textContent = message;
      $(id).setAttribute('aria-invalid', 'true');
    });

    if (errors.length) {
      showFormError(`Please correct ${errors.length} field${errors.length === 1 ? '' : 's'}.`);
      $(errors[0][0]).focus();
      return null;
    }

    return {
      order_type: orderType,
      payment_method: payment,
      contact_name: value('fullName'),
      contact_phone: phone,
      contact_email: email,
      address_street: orderType === 'delivery' ? value('street') : null,
      address_city: orderType === 'delivery' ? value('city') : null,
      address_zip: orderType === 'delivery' ? value('zipCode') : null,
      // What and how many, never a price: the server prices every line.
      items: cart().map(item => ({
        product_slug: item.id,
        quantity: item.quantity,
        size: item.size || null,
        milk: item.milk || null,
        sugar: item.sugar || null,
        extras: item.extras || [],
        special_instructions: item.specialInstructions || null
      }))
    };
  }

  // ----- events ----------------------------------------------------------

  $('clearCartButton').addEventListener('click', () => {
    NB.clearCart();
    showCart();
  });

  $('checkoutButton').addEventListener('click', showCheckout);
  $('backToCartButton').addEventListener('click', showCart);

  document.querySelectorAll('input[name="orderType"]').forEach(radio =>
    radio.addEventListener('change', () => {
      $('deliveryAddress').classList.toggle('hidden', selected('orderType') !== 'delivery');
    })
  );

  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio =>
    radio.addEventListener('change', () => {
      $('cardDetails').classList.toggle('hidden', selected('paymentMethod') !== 'card');
    })
  );

  checkout.addEventListener('submit', async event => {
    event.preventDefault();
    if (cart().length === 0) return showFormError('Your cart is empty.');
    if (!api.isLoggedIn()) {
      window.location.href = 'login.html?next=cart.html';
      return;
    }

    const payload = validate();
    if (!payload) return;

    const button = $('placeOrderButton');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Placing your order...';

    try {
      const order = await api.createOrder(payload);
      NB.clearCart();
      // The confirmation shows the server's total, not this page's preview.
      window.location.href = `order.html?id=${order.id}&placed=1`;
    } catch (err) {
      if (err.status === 401) {
        window.location.href = 'login.html?next=cart.html';
        return;
      }
      showFormError(err.message);
      button.disabled = false;
      button.innerHTML = original;
    }
  });

  showCart();
});
