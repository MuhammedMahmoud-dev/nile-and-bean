// Nile & Bean - shared application state and helpers.
//
// This module is the single owner of cart and catalogue state. Other scripts
// reach it through the accessor functions on window.NileBean and must not keep
// their own copies: a second copy drifts out of sync with this one the moment
// either is mutated (AUDIT.md section 2.2).

const CART_STORAGE_KEY = 'nilebeanCart';

// Egyptian VAT. Display only: the server computes the authoritative total.
const TAX_RATE = 0.14;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// Whole pounds read as "EGP 95"; piastres appear only when there are some.
function formatEGP(amount) {
  const n = Number(amount) || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return `EGP ${whole ? Math.round(n).toLocaleString('en') : n.toFixed(2)}`;
}

// Escape anything interpolated into innerHTML. Product names now come from an
// admin form rather than a hardcoded array, so unescaped they would be a
// stored-XSS path from the admin area to every customer.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Unsplash serves any width on request; ask for what the slot needs, not the
// 3000px originals the seed data points at.
function imageUrl(src, width, ratio = '4:3') {
  if (!src) return '';
  if (!/images\.unsplash\.com/.test(src)) return src;
  const base = src.split('?')[0];
  return `${base}?w=${width}&q=70&auto=format&fit=crop&ar=${ratio}`;
}

function imageSrcset(src, widths, ratio) {
  if (!src || !/images\.unsplash\.com/.test(src)) return '';
  return widths.map(w => `${imageUrl(src, w, ratio)} ${w}w`).join(', ');
}

// The sugar levels carry their Arabic name on the plate.
const SUGAR_AR = {
  'Sada · no sugar': 'سادة',
  "'Al-reeha · a hint": 'ع الريحة',
  'Mazboot · medium': 'مظبوط',
  'Ziyada · sweet': 'زيادة'
};

const CATEGORY_AR = {
  coffee: 'قهوة',
  tea: 'شاي',
  pastry: 'معجنات',
  seasonal: 'موسمي'
};

// Eastern Arabic numerals, as a Cairo price board writes them.
function toArabicDigits(value) {
  return String(value).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatArabicPrice(amount) {
  const n = Number(amount) || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return `${toArabicDigits(whole ? Math.round(n) : n.toFixed(2))} ج.م`;
}

// A photo that fails to load is swapped for a plate carrying the name, so a
// dead image link can never show a broken-image box (finish review, fix 1).
function photoFallback(img, product) {
  const plate = document.createElement('div');
  plate.className = 'photo-fallback';
  plate.setAttribute('role', 'img');
  plate.setAttribute('aria-label', product.name);
  plate.innerHTML =
    (product.nameAr ? `<span class="ar" lang="ar" dir="rtl">${escapeHtml(product.nameAr)}</span>` : '') +
    `<span>${escapeHtml(product.name)}</span>`;
  img.replaceWith(plate);
}

function guardPhoto(img, product) {
  if (!img) return;
  img.addEventListener('error', () => photoFallback(img, product), { once: true });
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#${name}"></use></svg>`;
}

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

let lastShownCount = null;

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  const count = getCartCount();
  el.textContent = count;
  // A small bump when the number changes, so adding to the cart is felt.
  if (lastShownCount !== null && count !== lastShownCount) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  lastShownCount = count;
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
  showToast(`Added ${product.name} to your cart`);
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
    showToast(`Removed ${removedItem.name} from your cart`);
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
    nameAr: raw.name_ar || '',
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

  // Round to piastres: binary floating point would otherwise leak through.
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// The one definition of a product plate: photo, cobalt enamel name plate with
// the Arabic name over the English, and a saffron price tag.
function createProductCard(product) {
  const link = document.createElement('a');
  link.className = 'product-plate';
  link.href = `product.html?id=${encodeURIComponent(product.id)}`;
  link.innerHTML = `
    <img class="product-plate__photo"
         src="${escapeHtml(imageUrl(product.image, 600))}"
         srcset="${escapeHtml(imageSrcset(product.image, [400, 600, 900]))}"
         sizes="(max-width: 600px) 92vw, (max-width: 1100px) 45vw, 300px"
         width="600" height="450" loading="lazy" decoding="async"
         alt="${escapeHtml(product.name)}">
    <span class="price-tag">${escapeHtml(formatEGP(product.price))}</span>
    <span class="product-plate__body">
      ${product.nameAr ? `<span class="product-plate__ar" lang="ar" dir="rtl">${escapeHtml(product.nameAr)}</span>` : ''}
      <span class="product-plate__en">${escapeHtml(product.name)}</span>
      <span class="product-plate__desc">${escapeHtml(product.shortDescription)}</span>
    </span>
  `;
  guardPhoto(link.querySelector('img'), product);
  return link;
}

function renderMessage(container, kind, text, retry = false) {
  if (!container) return;
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = `state-message state-${kind}`;
  box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  box.innerHTML = `${icon(kind === 'error' ? 'alert' : 'cup')}<p>${escapeHtml(text)}</p>`;
  if (retry) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--red';
    button.textContent = 'Try again';
    button.addEventListener('click', () => window.location.reload());
    box.appendChild(button);
  }
  container.appendChild(box);
}

function renderFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  if (loadState === 'loading') return; // skeletons from the markup stay up
  if (loadState === 'error') {
    return renderMessage(container, 'error', loadError.message, true);
  }

  container.innerHTML = '';
  getProducts()
    .filter(product => product.featured)
    .slice(0, 6)
    .forEach(product => container.appendChild(createProductCard(product)));
}

// The price board on the shop front: today's drinks, priced by the API.
function renderPriceBoard() {
  const board = document.getElementById('priceBoard');
  if (!board) return;

  if (loadState === 'error') {
    board.innerHTML = `<p class="state-message state-error" role="alert">${icon('alert')}${escapeHtml(loadError.message)}</p>`;
    return;
  }

  const rows = getProducts().filter(p => p.featured).slice(0, 6);
  board.innerHTML = rows
    .map(
      (p, i) => `
      <a class="price-row" href="product.html?id=${encodeURIComponent(p.id)}" style="--i:${i}">
        <span class="price-row__names">
          ${p.nameAr ? `<span class="price-row__ar" lang="ar" dir="rtl">${escapeHtml(p.nameAr)}</span>` : ''}
          <span class="price-row__en">${escapeHtml(p.name)}</span>
        </span>
        <span class="price-row__prices">
          <span class="price-row__price">${escapeHtml(formatEGP(p.price))}</span>
          <span class="price-row__ar-price" lang="ar" dir="rtl">${formatArabicPrice(p.price)}</span>
        </span>
      </a>`
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Account-aware navigation
// ---------------------------------------------------------------------------

function renderAccountNav() {
  const api = window.NileBeanAPI;
  const user = api.getUser();

  ['accountNav', 'accountNavMobile'].forEach(id => {
    const link = document.getElementById(id);
    if (!link) return;
    if (user) {
      link.href = 'logout.html';
      link.innerHTML = `${icon('logout')}<span>Sign out <span class="visually-hidden">${escapeHtml(user.username)}</span></span>`;
      link.title = `Signed in as ${user.username}`;
    } else {
      link.href = 'login.html';
      link.innerHTML = `${icon('user')}<span>Sign in</span>`;
      link.removeAttribute('title');
    }
  });

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
  toast.innerHTML = `${icon('check')}<span></span>`;
  toast.querySelector('span').textContent = message;
  document.body.appendChild(toast);

  // Force a style flush so the transition off the base class actually runs.
  // requestAnimationFrame would be throttled in a background tab, leaving the
  // toast permanently invisible.
  void toast.offsetWidth;
  toast.classList.add('toast-visible');

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 600); // reduced motion fires no transitionend
  }, 3000);
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------
// Accessors only. Exporting the arrays themselves is what broke the menu page:
// a snapshot captured here never sees data loaded afterwards.

window.NileBean = {
  TAX_RATE,
  SUGAR_AR,
  CATEGORY_AR,
  formatEGP,
  formatArabicPrice,
  toArabicDigits,
  guardPhoto,
  escapeHtml,
  imageUrl,
  imageSrcset,
  icon,
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

  const toggle = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('active');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      toggle.innerHTML = icon(isOpen ? 'close' : 'menu');
    });
  }

  whenProductsReady().then(() => {
    renderFeaturedProducts();
    renderPriceBoard();
  });
});
