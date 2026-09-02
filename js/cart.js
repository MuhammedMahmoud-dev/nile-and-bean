
document.addEventListener('DOMContentLoaded', function() {
  const api = window.NileBeanAPI;

  // DOM elements
  const cartItemsList = document.getElementById('cartItemsList');
  const clearCartButton = document.getElementById('clearCartButton');
  const checkoutButton = document.getElementById('checkoutButton');
  const backToCartButton = document.getElementById('backToCartButton');
  const placeOrderButton = document.getElementById('placeOrderButton');
  const subtotalElement = document.getElementById('subtotal');
  const taxElement = document.getElementById('tax');
  const totalElement = document.getElementById('total');
  const checkoutSubtotalElement = document.getElementById('checkoutSubtotal');
  const checkoutTaxElement = document.getElementById('checkoutTax');
  const checkoutTotalElement = document.getElementById('checkoutTotal');
  const checkoutItemsElement = document.getElementById('checkoutItems');
  const pageTitle = document.getElementById('pageTitle');

  // Page elements
  const emptyCartElement = document.getElementById('emptyCart');
  const cartContentElement = document.getElementById('cartContent');
  const checkoutFormElement = document.getElementById('checkoutForm');

  // Checkout form elements
  const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
  const deliveryAddressElement = document.getElementById('deliveryAddress');
  const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
  const cardDetailsElement = document.getElementById('cardDetails');
  const checkoutError = document.getElementById('checkoutError');
  const checkoutNotice = document.getElementById('checkoutNotice');

  // Display only. The server computes the authoritative total from the product
  // rows, so a total sent by this page would be ignored.
  const TAX_RATE = window.NileBean.TAX_RATE;

  // The cart lives in main.js. This file used to parse its own copy out of
  // localStorage, so mutations made through NileBean were invisible here and
  // the UI never updated (AUDIT.md section 2.2). Always read it fresh.
  const cart = () => window.NileBean.getCart();

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  function initCartPage() {
    if (cart().length === 0) {
      emptyCartElement.classList.remove('hidden');
      cartContentElement.classList.add('hidden');
      checkoutFormElement.classList.add('hidden');
      // Drop the rendered rows rather than just hiding their container, so
      // stale line items cannot linger in the DOM.
      if (cartItemsList) cartItemsList.innerHTML = '';
    } else {
      emptyCartElement.classList.add('hidden');
      cartContentElement.classList.remove('hidden');
      checkoutFormElement.classList.add('hidden');

      renderCartItems();
      updateOrderSummary();
    }
  }

  function renderCartItems() {
    if (!cartItemsList) return;

    cartItemsList.innerHTML = '';

    cart().forEach((item, index) => {
      const cartItemElement = document.createElement('div');
      cartItemElement.className = 'cart-item';

      let optionsList = '';
      if (item.size) optionsList += `<div>Size: ${item.size}</div>`;
      if (item.milk) optionsList += `<div>Milk: ${item.milk}</div>`;
      if (item.extras && item.extras.length > 0) {
        optionsList += `<div>Extras: ${item.extras.join(', ')}</div>`;
      }
      if (item.specialInstructions) {
        optionsList += `<div>Notes: ${item.specialInstructions}</div>`;
      }

      // getLineTotal uses the unit price the customer was shown, which
      // includes size and extras. This used to bill item.price, the base
      // price, discarding every upcharge (AUDIT.md section 2.3).
      const lineTotal = window.NileBean.getLineTotal(item);

      cartItemElement.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <div class="cart-item-header">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">$${lineTotal.toFixed(2)}</div>
          </div>
          <div class="cart-item-options">
            ${optionsList}
          </div>
          <div class="cart-item-actions">
            <div class="cart-quantity-selector">
              <button class="quantity-btn cart-quantity-btn decrease-btn" data-index="${index}"
                      aria-label="Decrease quantity of ${item.name}">-</button>
              <span aria-label="Quantity">${item.quantity}</span>
              <button class="quantity-btn cart-quantity-btn increase-btn" data-index="${index}"
                      aria-label="Increase quantity of ${item.name}">+</button>
            </div>
            <button class="remove-button" data-index="${index}"
                    aria-label="Remove ${item.name} from cart">Remove</button>
          </div>
        </div>
      `;

      cartItemsList.appendChild(cartItemElement);
    });

    cartItemsList.querySelectorAll('.decrease-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        const item = cart()[index];
        if (item && item.quantity > 1) {
          window.NileBean.updateCartItem(index, { quantity: item.quantity - 1 });
          renderCartItems();
          updateOrderSummary();
        }
      });
    });

    cartItemsList.querySelectorAll('.increase-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        const item = cart()[index];
        if (item) {
          window.NileBean.updateCartItem(index, { quantity: item.quantity + 1 });
          renderCartItems();
          updateOrderSummary();
        }
      });
    });

    cartItemsList.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        window.NileBean.removeCartItem(index);

        // cart() is read fresh, so this now correctly reaches zero and the
        // empty-cart state becomes reachable without a page reload.
        if (cart().length === 0) {
          initCartPage();
        } else {
          renderCartItems();
          updateOrderSummary();
        }
      });
    });
  }

  function updateOrderSummary() {
    const subtotal = window.NileBean.getCartSubtotal();
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `$${tax.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;

    if (checkoutSubtotalElement) checkoutSubtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (checkoutTaxElement) checkoutTaxElement.textContent = `$${tax.toFixed(2)}`;
    if (checkoutTotalElement) checkoutTotalElement.textContent = `$${total.toFixed(2)}`;
  }

  function renderCheckoutItems() {
    if (!checkoutItemsElement) return;

    checkoutItemsElement.innerHTML = '';

    cart().forEach(item => {
      const checkoutItem = document.createElement('div');
      checkoutItem.className = 'checkout-item';
      checkoutItem.innerHTML = `
        <span>${item.quantity}x ${item.name}</span>
        <span>$${window.NileBean.getLineTotal(item).toFixed(2)}</span>
      `;
      checkoutItemsElement.appendChild(checkoutItem);
    });
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  // The checkout form previously had no validation of any kind, and nothing
  // read what was typed into it (AUDIT.md section 6.5).

  function clearErrors() {
    checkoutError.textContent = '';
    checkoutError.classList.add('hidden');
    checkoutFormElement.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    checkoutFormElement.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFormError(message) {
    checkoutError.textContent = message;
    checkoutError.classList.remove('hidden');
    checkoutError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function fieldError(id, message) {
    const slot = document.getElementById(`${id}Error`);
    if (slot) slot.textContent = message;
    document.getElementById(id)?.setAttribute('aria-invalid', 'true');
  }

  const value = id => (document.getElementById(id)?.value || '').trim();
  const selectedRadio = name =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || null;

  function validateCheckout() {
    clearErrors();
    const errors = [];

    const orderType = selectedRadio('orderType');
    const paymentMethod = selectedRadio('paymentMethod');

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
      if (!value('zipCode')) errors.push(['zipCode', 'Enter a zip code.']);
    }

    if (paymentMethod === 'card') {
      // No card is charged; these checks only stop obviously wrong input from
      // being submitted. Card details are never sent anywhere.
      const number = value('cardNumber').replace(/[\s-]/g, '');
      if (!number) errors.push(['cardNumber', 'Enter a card number.']);
      else if (!/^\d{12,19}$/.test(number)) errors.push(['cardNumber', 'A card number is 12 to 19 digits.']);

      const expiry = value('cardExpiry');
      if (!expiry) errors.push(['cardExpiry', 'Enter the expiry date.']);
      else if (!/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry)) {
        errors.push(['cardExpiry', 'Use MM/YY.']);
      }

      const cvc = value('cardCvc');
      if (!cvc) errors.push(['cardCvc', 'Enter the CVC.']);
      else if (!/^\d{3,4}$/.test(cvc)) errors.push(['cardCvc', 'A CVC is 3 or 4 digits.']);

      if (!value('cardName')) errors.push(['cardName', 'Enter the name on the card.']);
    }

    errors.forEach(([id, message]) => fieldError(id, message));

    if (errors.length > 0) {
      showFormError(`Please correct ${errors.length} field${errors.length === 1 ? '' : 's'} below.`);
      document.getElementById(errors[0][0])?.focus();
      return null;
    }

    return {
      order_type: orderType,
      payment_method: paymentMethod,
      contact_name: value('fullName'),
      contact_phone: phone,
      contact_email: email,
      address_street: orderType === 'delivery' ? value('street') : null,
      address_city: orderType === 'delivery' ? value('city') : null,
      address_zip: orderType === 'delivery' ? value('zipCode') : null,
      // Only what was chosen and how many. No price is sent: the server prices
      // every line from the product rows.
      items: cart().map(item => ({
        product_slug: item.id,
        quantity: item.quantity,
        size: item.size || null,
        milk: item.milk || null,
        extras: item.extras || [],
        special_instructions: item.specialInstructions || null
      }))
    };
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  function showCheckout() {
    cartContentElement.classList.add('hidden');
    checkoutFormElement.classList.remove('hidden');
    if (pageTitle) pageTitle.textContent = 'Checkout';
    renderCheckoutItems();
    updateOrderSummary();

    // Ordering requires an account, because an order belongs to someone.
    if (!api.isLoggedIn()) {
      checkoutNotice.innerHTML =
        'You will need to <a href="login.html?next=cart.html">sign in</a> to place this order.';
    } else {
      const user = api.getUser();
      checkoutNotice.textContent = `Ordering as ${user.username}.`;
      // Pre-fill what we already know about them.
      const nameField = document.getElementById('fullName');
      const emailField = document.getElementById('email');
      if (nameField && !nameField.value) nameField.value = user.full_name || '';
      if (emailField && !emailField.value) emailField.value = user.email || '';
    }
  }

  function setupEventListeners() {
    if (clearCartButton) {
      clearCartButton.addEventListener('click', function() {
        window.NileBean.clearCart();
        initCartPage();
      });
    }

    if (checkoutButton) checkoutButton.addEventListener('click', showCheckout);

    if (backToCartButton) {
      backToCartButton.addEventListener('click', function() {
        cartContentElement.classList.remove('hidden');
        checkoutFormElement.classList.add('hidden');
        if (pageTitle) pageTitle.textContent = 'Your Cart';
      });
    }

    if (placeOrderButton) {
      placeOrderButton.addEventListener('click', async function() {
        if (cart().length === 0) {
          showFormError('Your cart is empty.');
          return;
        }

        if (!api.isLoggedIn()) {
          window.location.href = 'login.html?next=cart.html';
          return;
        }

        const payload = validateCheckout();
        if (!payload) return;

        const original = placeOrderButton.textContent;
        placeOrderButton.disabled = true;
        placeOrderButton.textContent = 'Placing order...';

        try {
          const order = await api.createOrder(payload);
          window.NileBean.clearCart();
          // The server's total is the real one; show that, not our preview.
          window.NileBean.showToast(`Order #${order.id} placed - $${Number(order.total).toFixed(2)}`);
          window.location.href = `index.html?ordered=${order.id}`;
        } catch (err) {
          if (err.status === 401) {
            window.location.href = 'login.html?next=cart.html';
            return;
          }
          // Surface what the server actually said, including per-field
          // validation messages, rather than a generic failure.
          showFormError(err.message);
        } finally {
          placeOrderButton.disabled = false;
          placeOrderButton.textContent = original;
        }
      });
    }

    orderTypeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        deliveryAddressElement.classList.toggle('hidden', this.value !== 'delivery');
      });
    });

    paymentMethodRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        cardDetailsElement.classList.toggle('hidden', this.value !== 'card');
      });
    });
  }

  // Listeners are attached once, to elements that are never re-created.
  // initCartPage() re-renders the list, so wiring them there attached a fresh
  // duplicate set on every render.
  setupEventListeners();
  initCartPage();
});
