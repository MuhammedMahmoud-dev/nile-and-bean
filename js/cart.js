
document.addEventListener('DOMContentLoaded', function() {
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

  const TAX_RATE = 0.08;

  // The cart lives in main.js. This file used to parse its own copy out of
  // localStorage, so mutations made through NileBean were invisible here and
  // the UI never updated (AUDIT.md section 2.2). Always read it fresh.
  const cart = () => window.NileBean.getCart();

  // Initialize the cart page
  function initCartPage() {
    if (cart().length === 0) {
      // Show empty cart message
      emptyCartElement.classList.remove('hidden');
      cartContentElement.classList.add('hidden');
      checkoutFormElement.classList.add('hidden');
      // Drop the rendered rows rather than just hiding their container, so
      // stale line items cannot linger in the DOM.
      if (cartItemsList) cartItemsList.innerHTML = '';
    } else {
      // Show cart content
      emptyCartElement.classList.add('hidden');
      cartContentElement.classList.remove('hidden');
      checkoutFormElement.classList.add('hidden');

      renderCartItems();
      updateOrderSummary();
    }
  }

  // Render cart items
  function renderCartItems() {
    if (!cartItemsList) return;

    cartItemsList.innerHTML = '';

    cart().forEach((item, index) => {
      const cartItemElement = document.createElement('div');
      cartItemElement.className = 'cart-item';

      let optionsList = '';

      if (item.size) {
        optionsList += `<div>Size: ${item.size}</div>`;
      }

      if (item.milk) {
        optionsList += `<div>Milk: ${item.milk}</div>`;
      }

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

    // Add event listeners to quantity buttons
    document.querySelectorAll('.decrease-btn').forEach(button => {
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

    document.querySelectorAll('.increase-btn').forEach(button => {
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

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-button').forEach(button => {
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

  // Update order summary
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

  // Render checkout items
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

  // Set up event listeners
  function setupEventListeners() {
    // Clear cart button
    if (clearCartButton) {
      clearCartButton.addEventListener('click', function() {
        window.NileBean.clearCart();
        initCartPage();
      });
    }

    // Checkout button
    if (checkoutButton) {
      checkoutButton.addEventListener('click', function() {
        cartContentElement.classList.add('hidden');
        checkoutFormElement.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'Checkout';
        renderCheckoutItems();
      });
    }

    // Back to cart button
    if (backToCartButton) {
      backToCartButton.addEventListener('click', function() {
        cartContentElement.classList.remove('hidden');
        checkoutFormElement.classList.add('hidden');
        if (pageTitle) pageTitle.textContent = 'Your Cart';
      });
    }

    // Place order button
    if (placeOrderButton) {
      placeOrderButton.addEventListener('click', function() {
        alert('Thank you for your order! It will be ready shortly.');
        window.NileBean.clearCart();
        window.location.href = 'index.html';
      });
    }

    // Order type radio buttons
    orderTypeRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        deliveryAddressElement.classList.toggle('hidden', this.value !== 'delivery');
      });
    });

    // Payment method radio buttons
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
