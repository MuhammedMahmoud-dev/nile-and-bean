
// Global variables
const cart = JSON.parse(localStorage.getItem('nilebeanCart')) || [];
let products = [];

// DOM Elements
const cartCountElement = document.getElementById('cartCount');
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const currentYearElements = document.querySelectorAll('#currentYear');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Set current year in footer
  const currentYear = new Date().getFullYear();
  currentYearElements.forEach(el => {
    el.textContent = currentYear;
  });
  
  // Update cart count
  updateCartCount();
  
  // Mobile menu toggle
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', function() {
      mobileMenu.classList.toggle('active');
    });
  }
  
  // Fetch products data
  fetchProducts();
});

// Cart Functions
function updateCartCount() {
  if (cartCountElement) {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountElement.textContent = itemCount;
  }
}

function addToCart(product, quantity = 1, options = {}) {
  const cartItem = {
    ...product,
    quantity,
    ...options
  };
  
  cart.push(cartItem);
  localStorage.setItem('nilebeanCart', JSON.stringify(cart));
  updateCartCount();
  showToast(`Added ${product.name} to cart`);
}

function updateCartItem(index, updates) {
  if (index >= 0 && index < cart.length) {
    cart[index] = { ...cart[index], ...updates };
    localStorage.setItem('nilebeanCart', JSON.stringify(cart));
    updateCartCount();
  }
}

function removeCartItem(index) {
  if (index >= 0 && index < cart.length) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    localStorage.setItem('nilebeanCart', JSON.stringify(cart));
    updateCartCount();
    showToast(`Removed ${removedItem.name} from cart`);
  }
}

function clearCart() {
  cart.length = 0;
  localStorage.setItem('nilebeanCart', JSON.stringify(cart));
  updateCartCount();
  showToast('Cart cleared');
}

// Products Data & Rendering
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
    }
  ];

  // Render featured products on homepage
  renderFeaturedProducts();
  renderSpecialProducts();
}

function renderFeaturedProducts() {
  const featuredProductsContainer = document.getElementById('featuredProducts');
  if (!featuredProductsContainer) return;

  const featuredProducts = products.filter(product => product.featured);
  featuredProductsContainer.innerHTML = '';

  featuredProducts.forEach(product => {
    const productElement = createProductCard(product);
    featuredProductsContainer.appendChild(productElement);
  });
}

function renderSpecialProducts() {
  const specialProductsContainer = document.getElementById('specialProducts');
  if (!specialProductsContainer) return;

  const specialProducts = products.filter(product => product.featured).slice(0, 2);
  specialProductsContainer.innerHTML = '';

  specialProducts.forEach(product => {
    const specialCard = document.createElement('div');
    specialCard.className = 'special-card';
    specialCard.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.shortDescription}</p>
      <div class="special-price">$${product.price.toFixed(2)}</div>
      <a href="product.html?id=${product.id}" class="button light-button">Order Now</a>
    `;
    specialProductsContainer.appendChild(specialCard);
  });
}

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

// Utility Functions
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Add styles for the toast
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
  toast.style.color = 'white';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '1000';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  
  // Show the toast
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // Hide and remove the toast
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

function getProductById(id) {
  return products.find(product => product.id === id);
}

function calculateTotalPrice(product, size = null, extras = []) {
  let total = product.price;
  
  // Add size price
  if (size && product.options?.sizes) {
    const sizeOption = product.options.sizes.find(s => s.name === size);
    if (sizeOption) {
      total += sizeOption.price;
    }
  }
  
  // Add extras price
  if (extras.length > 0 && product.options?.extras) {
    extras.forEach(extra => {
      const extraOption = product.options.extras.find(e => e.name === extra);
      if (extraOption) {
        total += extraOption.price;
      }
    });
  }
  
  return total;
}

// Export functions for use in other files
window.NileBean = {
  products,
  getProductById,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  calculateTotalPrice,
  showToast
};
