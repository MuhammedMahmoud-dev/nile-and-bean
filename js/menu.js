
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
    const { state, error } = window.NileBean.getLoadState();

    if (categoryTitle) {
      categoryTitle.textContent = categoryNames[activeCategory];
    }

    if (state === 'loading') {
      if (noProductsMessage) noProductsMessage.classList.add('hidden');
      window.NileBean.renderMessage(menuProductsContainer, 'loading', 'Loading the menu...');
      return;
    }

    if (state === 'error') {
      if (noProductsMessage) noProductsMessage.classList.add('hidden');
      window.NileBean.renderMessage(menuProductsContainer, 'error', error.message, true);
      return;
    }

    // getProducts() reads the live catalogue. This page used to read
    // NileBean.products, a snapshot captured while the array was still empty,
    // so every category rendered zero results (AUDIT.md section 2.1).
    const allProducts = window.NileBean.getProducts();
    const filteredProducts = activeCategory === 'all'
      ? allProducts
      : allProducts.filter(product => product.category === activeCategory);

    if (noProductsMessage) {
      noProductsMessage.classList.toggle('hidden', filteredProducts.length > 0);
    }

    renderProducts(filteredProducts);
  }

  // Render products in the container
  function renderProducts(products) {
    if (!menuProductsContainer) return;

    menuProductsContainer.innerHTML = '';

    // createProductCard lives in main.js. This file used to carry a
    // near-identical second copy of it.
    products.forEach(product => {
      menuProductsContainer.appendChild(window.NileBean.createProductCard(product));
    });
  }

  // Add event listeners to category buttons
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      categoryButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });

      this.classList.add('active');
      this.setAttribute('aria-pressed', 'true');

      activeCategory = this.getAttribute('data-category');
      filterProducts();
    });
  });

  // Paint the loading state, then re-render once the catalogue arrives.
  filterProducts();
  window.NileBean.whenProductsReady().then(filterProducts);
});
