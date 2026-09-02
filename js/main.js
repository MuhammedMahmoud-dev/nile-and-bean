// Nile & Bean - shared application state and helpers.
//
// This module is the single owner of cart and catalogue state. Other scripts
// reach it through the accessor functions on window.NileBean and must not keep
// their own copies: a second copy drifts out of sync with this one the moment
// either is mutated (AUDIT.md section 2.2).
//
// The catalogue is loaded from the API. It used to be a nine-item array
// hardcoded in this file; those nine products are now seed data for the
// database (Backend/seed_data.json).

const CART_STORAGE_KEY = 'nilebeanCart';
const TAX_RATE = 0.08; // Display only. The server computes the authoritative total.

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
// Every localStorage read goes through readJSON. A malformed value used to
// throw at the top of this file, aborting the whole script and leaving
// window.NileBean undefined, which blanked every page (AUDIT.md section 6.4).

function readJSON(key, fallback) {
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (err) {
    // Storage can be unavailable entirely: private mode, disabled site data.
    console.warn(`localStorage is unavailable; continuing without it (${err.message})`);
    return fallback;
  }

  if (raw === null) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn(`Discarding corrupt localStorage entry "${key}": ${err.message}`);
    try {
      localStorage.removeItem(key);
    } catch (_) {
      /* nothing further we can do */
    }
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // Most likely a quota error, or site data disabled.
    console.error(`Could not save "${key}": ${err.message}`);
    showToast('Your browser is blocking storage, so this could not be saved.');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cart state - one array, owned here
// ---------------------------------------------------------------------------

let cart = readJSON(CART_STORAGE_KEY, []);
if (!Array.isArray(cart)) {
  // Well-formed JSON of the wrong shape, e.g. an object left by an old build.
  console.warn('Stored cart was not an array; starting from an empty cart.');
  cart = [];
}

// Call this on every read. Holding the returned array across a mutation is
// precisely the bug this replaces.
function getCart() {
  return cart;
}

// Price of one unit including the chosen size and extras. Entries written
// before unitPrice existed fall back to the base price.
function getUnitPrice(item) {
  return typeof item.unitPrice === 'number' ? item.unitPrice : item.price;
}

function getLineTotal(item) {
  return getUnitPrice(item) * item.quantity;
}

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + getLineTotal(item), 0);
}

function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function persistCart() {
  writeJSON(CART_STORAGE_KEY, cart);
  updateCartCount();
}

function updateCartCount() {
  const cartCountElement = document.getElementById('cartCount');
  if (cartCountElement) {
    cartCountElement.textContent = getCartCount();
  }
}

function addToCart(product, quantity = 1, options = {}) {
  // Resolve the price the customer was actually shown and store it on the
  // line. Previously only the base price survived, so size and extras were
  // priced in the UI and then silently dropped (AUDIT.md section 2.3).
  const unitPrice = calculateTotalPrice(product, options.size, options.extras || []);

  cart.push({
    ...product,
    quantity,
    ...options,
    unitPrice
  });

  persistCart();
  showToast(`Added ${product.name} to cart`);
}

function updateCartItem(index, updates) {
  if (index >= 0 && index < cart.length) {
    cart[index] = { ...cart[index], ...updates };
    persistCart();
  }
}

function removeCartItem(index) {
  if (index >= 0 && index < cart.length) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    persistCart();
    showToast(`Removed ${removedItem.name} from cart`);
  }
}

function clearCart() {
  cart.length = 0;
  persistCart();
  showToast('Cart cleared');
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

let products = [];
let loadState = 'idle'; // idle | loading | ready | error
let loadError = null;
let readyPromise = null;

// Read through this, never through a captured reference. The catalogue is
// replaced when it loads, so a snapshot taken at load time would stay empty
// forever (AUDIT.md section 2.1).
function getProducts() {
  return products;
}

function getProductById(id) {
  return products.find(product => product.id === id);
}

function getLoadState() {
  return { state: loadState, error: loadError };
}

// The API speaks snake_case and serialises Decimal prices as JSON strings,
// while the option prices nested in the JSON column stay numbers. Normalise
// both here so every page script sees one consistent shape.
function normaliseProduct(raw) {
  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const options = raw.options ? { ...raw.options } : undefined;
  if (options?.sizes) {
    options.sizes = options.sizes.map(s => ({ name: s.name, price: num(s.price) }));
  }
  if (options?.extras) {
    options.extras = options.extras.map(e => ({ name: e.name, price: num(e.price) }));
  }

  return {
    id: raw.slug,
    productId: raw.id,
    name: raw.name,
    image: raw.image,
    price: num(raw.price),
    category: raw.category,
    shortDescription: raw.short_description || '',
    longDescription: raw.long_description || '',
    options,
    featured: Boolean(raw.featured),
    popular: Boolean(raw.popular),
    available: raw.available !== false
  };
}

function loadProducts() {
  if (readyPromise) return readyPromise;

  loadState = 'loading';
  loadError = null;

  readyPromise = window.NileBeanAPI.listProducts()
    .then(raw => {
      products = raw.map(normaliseProduct);
      loadState = 'ready';
      document.dispatchEvent(new CustomEvent('products:loaded'));
      return products;
    })
    .catch(err => {
      loadState = 'error';
      loadError = err;
      console.error('Could not load the catalogue:', err);
      document.dispatchEvent(new CustomEvent('products:error', { detail: err }));
      return [];
    });

  return readyPromise;
}

// Page scripts await this before rendering anything catalogue-driven.
function whenProductsReady() {
  return readyPromise || loadProducts();
}

function calculateTotalPrice(product, size = null, extras = []) {
  let total = product.price;

  if (size && product.options?.sizes) {
    const sizeOption = product.options.sizes.find(s => s.name === size);
    if (sizeOption) total += sizeOption.price;
  }

  if (extras.length > 0 && product.options?.extras) {
    extras.forEach(extra => {
      const extraOption = product.options.extras.find(e => e.name === extra);
      if (extraOption) total += extraOption.price;
    });
  }

  // Round to cents: 4.49 + 0.99 is 5.4799999999999995 in binary floating point.
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// The one definition. menu.js used to carry a near-identical copy of this.
function createProductCard(product) {
  const productCard = document.createElement('div');
  productCard.className = 'product-card';
  productCard.innerHTML = `
    <div class="product-image">
      <img src="${product.image}" alt="${product.name}">
    </div>
    <div class="product-details">
      <h3 class="product-title">${product.name}</h3>
      <div class="product-price">$${product.price.toFixed(2)}</div>
      <p class="product-description">${product.shortDescription}</p>
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="button">View Details</a>
    </div>
  `;
  return productCard;
}

function renderMessage(container, kind, text, retry = false) {
  if (!container) return;
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = `state-message state-${kind}`;
  box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  box.textContent = text;
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = 'Try again';
    button.addEventListener('click', () => window.location.reload());
    box.appendChild(document.createElement('br'));
    box.appendChild(button);
  }
  container.appendChild(box);
}

function renderFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  if (loadState === 'loading') return renderMessage(container, 'loading', 'Loading the menu...');
  if (loadState === 'error') {
    return renderMessage(container, 'error', loadError.message, true);
  }

  container.innerHTML = '';
  getProducts()
    .filter(product => product.featured)
    .forEach(product => container.appendChild(createProductCard(product)));
}

function renderSpecialProducts() {
  const container = document.getElementById('specialProducts');
  if (!container || loadState !== 'ready') return;

  container.innerHTML = '';
  getProducts()
    .filter(product => product.featured)
    .slice(0, 2)
    .forEach(product => {
      const specialCard = document.createElement('div');
      specialCard.className = 'special-card';
      specialCard.innerHTML = `
        <h3>${product.name}</h3>
        <p>${product.shortDescription}</p>
        <div class="special-price">$${product.price.toFixed(2)}</div>
        <a href="product.html?id=${encodeURIComponent(product.id)}" class="button light-button">Order Now</a>
      `;
      container.appendChild(specialCard);
    });
}

// ---------------------------------------------------------------------------
// Account-aware navigation
// ---------------------------------------------------------------------------

function renderAccountNav() {
  const slot = document.getElementById('accountNav');
  if (!slot) return;

  const api = window.NileBeanAPI;
  const user = api.getUser();

  // slot is itself the <li>; fill it rather than nesting another one.
  slot.innerHTML = '';
  const link = document.createElement('a');
  if (user) {
    link.href = 'logout.html';
    link.textContent = `Sign out (${user.username})`;
  } else {
    link.href = 'login.html';
    link.textContent = 'Sign in';
  }
  slot.appendChild(link);

  // The Admin link is only meaningful to an administrator. The guard on the
  // page itself is what actually enforces this; hiding the link is courtesy.
  document.querySelectorAll('[data-admin-only]').forEach(el => {
    el.hidden = !api.isAdmin();
  });
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);

  // Force a style flush so the transition off the base class actually runs.
  // requestAnimationFrame would be throttled in a background tab, leaving the
  // toast permanently invisible.
  void toast.offsetWidth;
  toast.classList.add('toast-visible');

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------
// Accessors only. Exporting the arrays themselves is what broke the menu page:
// a snapshot captured here never sees data loaded afterwards.

window.NileBean = {
  TAX_RATE,
  getProducts,
  getProductById,
  getLoadState,
  whenProductsReady,
  createProductCard,
  renderMessage,
  calculateTotalPrice,
  getCart,
  getCartCount,
  getCartSubtotal,
  getUnitPrice,
  getLineTotal,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  showToast
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Start the request immediately rather than waiting for DOMContentLoaded, so
// the network round trip overlaps with parsing the rest of the page.
loadProducts();

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('#currentYear').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  updateCartCount();
  renderAccountNav();

  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('active');
      mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Paint the loading state, then the result.
  renderFeaturedProducts();
  whenProductsReady().then(() => {
    renderFeaturedProducts();
    renderSpecialProducts();
  });
});
