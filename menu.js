
document.addEventListener('DOMContentLoaded', function() {
  const menuProductsContainer = document.getElementById('menuProducts');
  const categoryButtons = document.querySelectorAll('.category-button');
  const categoryTitle = document.getElementById('categoryTitle');
  const noProductsMessage = document.getElementById('noProductsMessage');
  
  let activeCategory = 'all';
  
  // Category names mapping
  const categoryNames = {
    all: 'All Items',
    coffee: 'Coffee',
    tea: 'Tea',
    pastry: 'Pastries',
    seasonal: 'Seasonal Specials'
  };
  
  // Filter products by category
  function filterProducts() {
    const filteredProducts = activeCategory === 'all' 
      ? window.NileBean.products 
      : window.NileBean.products.filter(product => product.category === activeCategory);
    
    // Update category title
    if (categoryTitle) {
      categoryTitle.textContent = categoryNames[activeCategory];
    }
    
    // Show/hide no products message
    if (noProductsMessage) {
      if (filteredProducts.length === 0) {
        noProductsMessage.classList.remove('hidden');
      } else {
        noProductsMessage.classList.add('hidden');
      }
    }
    
    // Render products
    renderProducts(filteredProducts);
  }
  
  // Render products in the container
  function renderProducts(products) {
    if (!menuProductsContainer) return;
    
    menuProductsContainer.innerHTML = '';
    
    products.forEach(product => {
      const productCard = createProductCard(product);
      menuProductsContainer.appendChild(productCard);
    });
  }
  
  // Create a product card element
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
  
  // Add event listeners to category buttons
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      categoryButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Update active category
      activeCategory = this.getAttribute('data-category');
      
      // Filter products
      filterProducts();
    });
  });
  
  // Initial filter
  filterProducts();
});
