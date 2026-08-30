
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
  
  // Get cart from localStorage
  const cart = JSON.parse(localStorage.getItem('nilebeanCart')) || [];
  
  // Initialize the cart page
  function initCartPage() {
    if (cart.length === 0) {
      // Show empty cart message
      emptyCartElement.classList.remove('hidden');
      cartContentElement.classList.add('hidden');
      checkoutFormElement.classList.add('hidden');
    } else {
      // Show cart content
      emptyCartElement.classList.add('hidden');
      cartContentElement.classList.remove('hidden');
      checkoutFormElement.classList.add('hidden');
      
      // Render cart items
      renderCartItems();
      updateOrderSummary();
    }
    
    // Set up event listeners
    setupEventListeners();
  }
  
  // Render cart items
  function renderCartItems() {
    if (!cartItemsList) return;
    
    cartItemsList.innerHTML = '';
    
    cart.forEach((item, index) => {
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
      
      cartItemElement.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <div class="cart-item-header">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
          <div class="cart-item-options">
            ${optionsList}
          </div>
          <div class="cart-item-actions">
            <div class="cart-quantity-selector">
              <button class="quantity-btn cart-quantity-btn decrease-btn" data-index="${index}">-</button>
              <span>${item.quantity}</span>
              <button class="quantity-btn cart-quantity-btn increase-btn" data-index="${index}">+</button>
            </div>
            <button class="remove-button" data-index="${index}">Remove</button>
          </div>
        </div>
      `;
      
      cartItemsList.appendChild(cartItemElement);
    });
    
    // Add event listeners to quantity buttons
    document.querySelectorAll('.decrease-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        if (cart[index].quantity > 1) {
          window.NileBean.updateCartItem(index, { quantity: cart[index].quantity - 1 });
          renderCartItems();
          updateOrderSummary();
        }
      });
    });
    
    document.querySelectorAll('.increase-btn').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        window.NileBean.updateCartItem(index, { quantity: cart[index].quantity + 1 });
        renderCartItems();
        updateOrderSummary();
      });
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        window.NileBean.removeCartItem(index);
        
        if (cart.length === 0) {
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
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
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
    
    cart.forEach(item => {
      const checkoutItem = document.createElement('div');
      checkoutItem.className = 'checkout-item';
      checkoutItem.innerHTML = `
        <span>${item.quantity}x ${item.name}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
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
        if (this.value === 'delivery') {
          deliveryAddressElement.classList.remove('hidden');
        } else {
          deliveryAddressElement.classList.add('hidden');
        }
      });
    });
    
    // Payment method radio buttons
    paymentMethodRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'card') {
          cardDetailsElement.classList.remove('hidden');
        } else {
          cardDetailsElement.classList.add('hidden');
        }
      });
    });
  }
  
  // Initialize the cart page
  initCartPage();
});
