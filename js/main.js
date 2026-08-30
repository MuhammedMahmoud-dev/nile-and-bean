// Nile & Bean - shared application state and helpers.
//
// This module is the single owner of cart and catalogue state. Other scripts
// reach it through the accessor functions on window.NileBean and must not keep
// their own copies: a second copy drifts out of sync with this one the moment
// either is mutated (AUDIT.md section 2.2).

const CART_STORAGE_KEY = 'nilebeanCart';

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

// Read through this, never through a captured reference. fetchProducts()
// replaces the array, so a snapshot taken at load time stays empty forever
// (AUDIT.md section 2.1).
function getProducts() {
  return products;
}

function getProductById(id) {
  return products.find(product => product.id === id);
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

  return total;
}

function fetchProducts() {
  // In a real app, this would be an API call
  products = [

    {
      id: "espresso",
      name: "Espresso",
      image: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
      price: 2.99,
      category: "coffee",
      shortDescription: "Our signature espresso is bold and full-bodied",
      longDescription: "Our signature espresso is a careful blend of Arabica beans from Ethiopia and Colombia, resulting in a bold and full-bodied flavor profile with notes of dark chocolate and caramel.",
      options: {
        sizes: [
          { name: "Single", price: 0 },
          { name: "Double", price: 1 },
          { name: "Triple", price: 2 }
        ],
        extras: [
          { name: "Extra Shot", price: 0.99 },
          { name: "Vanilla Syrup", price: 0.50 },
          { name: "Caramel Syrup", price: 0.50 },
          { name: "Mocha Syrup", price: 0.50 }
        ]
      },
      featured: true,
      popular: true
    },
    {
      id: "latte",
      name: "Latte",
      image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?q=80&w=2875&auto=format&fit=crop",
      price: 4.49,
      category: "coffee",
      shortDescription: "Smooth espresso with steamed milk and light foam",
      longDescription: "Our latte combines our rich espresso with smooth steamed milk and a light layer of foam, creating a perfectly balanced coffee experience that's both comforting and sophisticated.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        milk: ["Whole", "Oat", "Almond", "Soy", "No Milk"],
        extras: [
          { name: "Extra Shot", price: 0.99 },
          { name: "Vanilla Syrup", price: 0.50 },
          { name: "Caramel Syrup", price: 0.50 },
          { name: "Mocha Syrup", price: 0.50 }
        ]
      },
      featured: true,
      popular: true
    },
    {
      id: "cappuccino",
      name: "Cappuccino",
      image: "https://images.unsplash.com/photo-1534617580475-4439e80c4324?q=80&w=2787&auto=format&fit=crop",
      price: 4.29,
      category: "coffee",
      shortDescription: "Equal parts espresso, steamed milk, and foam",
      longDescription: "Our cappuccino follows the traditional Italian recipe with equal parts espresso, steamed milk, and milk foam. The result is a perfect balance of rich flavors and creamy textures.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        milk: ["Whole", "Oat", "Almond", "Soy", "No Milk"],
        extras: [
          { name: "Extra Shot", price: 0.99 },
          { name: "Vanilla Syrup", price: 0.50 },
          { name: "Caramel Syrup", price: 0.50 },
          { name: "Mocha Syrup", price: 0.50 }
        ]
      },
      featured: false,
      popular: true
    },
    {
      id: "americano",
      name: "Americano",
      image: "https://images.unsplash.com/photo-1580661962569-fa5a658896d2?q=80&w=3000&auto=format&fit=crop",
      price: 3.29,
      category: "coffee",
      shortDescription: "Espresso diluted with hot water",
      longDescription: "Our Americano starts with our signature espresso and is diluted with hot water to create a coffee that's similar in strength to drip coffee but with the unique flavor profile of espresso.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        extras: [
          { name: "Extra Shot", price: 0.99 }
        ]
      },
      featured: false,
      popular: false
    },
    {
      id: "green-tea",
      name: "Green Tea",
      image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?q=80&w=2940&auto=format&fit=crop",
      price: 3.49,
      category: "tea",
      shortDescription: "Delicate tea with earthy, grassy notes",
      longDescription: "Our premium green tea is sourced from the mountains of Japan. It has a delicate flavor with subtle earthy and grassy notes, providing a refreshing experience with every sip.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        extras: [
          { name: "Honey", price: 0.30 },
          { name: "Lemon", price: 0.30 }
        ]
      },
      featured: true,
      popular: false
    },
    {
      id: "chai-latte",
      name: "Chai Latte",
      image: "https://images.unsplash.com/photo-1577805947697-89e18249d767?q=80&w=2893&auto=format&fit=crop",
      price: 4.79,
      category: "tea",
      shortDescription: "Spiced tea blend with steamed milk",
      longDescription: "Our Chai Latte features a house-made blend of black tea and aromatic spices including cinnamon, cardamom, and cloves, combined with steamed milk for a comforting, spiced beverage.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        milk: ["Whole", "Oat", "Almond", "Soy", "No Milk"],
        extras: [
          { name: "Vanilla Syrup", price: 0.50 },
          { name: "Extra Spice", price: 0.30 }
        ]
      },
      featured: true,
      popular: true
    },
    {
      id: "croissant",
      name: "Butter Croissant",
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=2726&auto=format&fit=crop",
      price: 3.29,
      category: "pastry",
      shortDescription: "Flaky, buttery pastry, freshly baked",
      longDescription: "Our classic butter croissants are made from scratch daily. The dough is laminated with European butter, creating dozens of flaky layers and a rich, buttery flavor.",
      featured: false,
      popular: true
    },
    {
      id: "chocolate-muffin",
      name: "Double Chocolate Muffin",
      image: "https://images.unsplash.com/photo-1604882767135-80fdacf6e84c?q=80&w=2874&auto=format&fit=crop",
      price: 3.79,
      category: "pastry",
      shortDescription: "Rich chocolate muffin with chocolate chips",
      longDescription: "Our double chocolate muffins are made with Dutch-processed cocoa powder and filled with rich chocolate chips, creating a decadent treat that's perfect for chocolate lovers.",
      featured: false,
      popular: false
    },
    {
      id: "pumpkin-spice",
      name: "Pumpkin Spice Latte",
      image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2940&auto=format&fit=crop",
      price: 5.49,
      category: "seasonal",
      shortDescription: "Our famous seasonal fall favorite",
      longDescription: "Our Pumpkin Spice Latte combines our signature espresso with real pumpkin, warm spices like cinnamon and nutmeg, and steamed milk, topped with whipped cream and pumpkin pie spice.",
      options: {
        sizes: [
          { name: "Small", price: 0 },
          { name: "Medium", price: 0.50 },
          { name: "Large", price: 1 }
        ],
        milk: ["Whole", "Oat", "Almond", "Soy", "No Milk"],
        extras: [
          { name: "Extra Shot", price: 0.99 },
          { name: "Whipped Cream", price: 0.50 },
          { name: "Extra Spice", price: 0.30 }
        ]
      },
      featured: true,
      popular: true
    }  ];

  renderFeaturedProducts();
  renderSpecialProducts();
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
      <a href="product.html?id=${product.id}" class="button">View Details</a>
    </div>
  `;
  return productCard;
}

function renderFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;

  container.innerHTML = '';
  getProducts()
    .filter(product => product.featured)
    .forEach(product => container.appendChild(createProductCard(product)));
}

function renderSpecialProducts() {
  const container = document.getElementById('specialProducts');
  if (!container) return;

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
        <a href="product.html?id=${product.id}" class="button light-button">Order Now</a>
      `;
      container.appendChild(specialCard);
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
  getProducts,
  getProductById,
  createProductCard,
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

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('#currentYear').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  updateCartCount();

  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function () {
      const isOpen = mobileMenu.classList.toggle('active');
      mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  fetchProducts();
});
