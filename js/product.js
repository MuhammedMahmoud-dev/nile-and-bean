
document.addEventListener('DOMContentLoaded', function() {
  // Get product ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  // DOM Elements
  const productDetailElement = document.getElementById('productDetail');
  const productNotFoundElement = document.getElementById('productNotFound');
  
  const productNameElement = document.getElementById('productName');
  const productPriceElement = document.getElementById('productPrice');
  const productImageElement = document.getElementById('productImage');
  const productDescriptionElement = document.getElementById('productDescription');
  
  const sizeOptionsElement = document.getElementById('sizeOptions');
  const sizeRadioGroupElement = document.getElementById('sizeRadioGroup');
  const milkOptionsElement = document.getElementById('milkOptions');
  const milkRadioGroupElement = document.getElementById('milkRadioGroup');
  const extraOptionsElement = document.getElementById('extraOptions');
  const extrasCheckboxGroupElement = document.getElementById('extrasCheckboxGroup');
  
  const specialInstructionsElement = document.getElementById('specialInstructions');
  const decreaseQuantityButton = document.getElementById('decreaseQuantity');
  const increaseQuantityButton = document.getElementById('increaseQuantity');
  const quantityValueElement = document.getElementById('quantityValue');
  const addToCartButton = document.getElementById('addToCartButton');
  
  // Product state
  let product;
  let selectedSize = '';
  let selectedMilk = '';
  let selectedExtras = [];
  let quantity = 1;
  
  // Get product data
  if (productId) {
    product = window.NileBean.getProductById(productId);
    
    if (product) {
      // Show product detail
      productDetailElement.classList.remove('hidden');
      productNotFoundElement.classList.add('hidden');
      
      // Set initial product options
      if (product.options?.sizes?.length > 0) {
        selectedSize = product.options.sizes[0].name;
      }
      
      if (product.options?.milk?.length > 0) {
        selectedMilk = product.options.milk[0];
      }
      
      // Display product information
      displayProductDetails();
      updateTotalPrice();
      
      // Set up event handlers
      setupEventHandlers();
    } else {
      // Show product not found message
      productDetailElement.classList.add('hidden');
      productNotFoundElement.classList.remove('hidden');
    }
  } else {
    // No product ID provided
    productDetailElement.classList.add('hidden');
    productNotFoundElement.classList.remove('hidden');
  }
  
  // Display product details
  function displayProductDetails() {
    productNameElement.textContent = product.name;
    productImageElement.src = product.image;
    productImageElement.alt = product.name;
    productDescriptionElement.textContent = product.longDescription || product.shortDescription;
    
    // Size options
    if (product.options?.sizes?.length > 0) {
      sizeOptionsElement.classList.remove('hidden');
      renderSizeOptions();
    } else {
      sizeOptionsElement.classList.add('hidden');
    }
    
    // Milk options
    if (product.options?.milk?.length > 0) {
      milkOptionsElement.classList.remove('hidden');
      renderMilkOptions();
    } else {
      milkOptionsElement.classList.add('hidden');
    }
    
    // Extra options
    if (product.options?.extras?.length > 0) {
      extraOptionsElement.classList.remove('hidden');
      renderExtraOptions();
    } else {
      extraOptionsElement.classList.add('hidden');
    }
  }
  
  // Render size options
  function renderSizeOptions() {
    sizeRadioGroupElement.innerHTML = '';
    
    product.options.sizes.forEach((size, index) => {
      const sizeOption = document.createElement('div');
      sizeOption.className = 'radio-option';
      sizeOption.innerHTML = `
        <input type="radio" id="size-${index}" name="size" value="${size.name}" ${index === 0 ? 'checked' : ''}>
        <label for="size-${index}">${size.name}${size.price > 0 ? ` (+$${size.price.toFixed(2)})` : ''}</label>
      `;
      sizeRadioGroupElement.appendChild(sizeOption);
      
      // Add event listener
      sizeOption.querySelector('input').addEventListener('change', function() {
        selectedSize = this.value;
        updateTotalPrice();
      });
    });
  }
  
  // Render milk options
  function renderMilkOptions() {
    milkRadioGroupElement.innerHTML = '';
    
    product.options.milk.forEach((milk, index) => {
      const milkOption = document.createElement('div');
      milkOption.className = 'radio-option';
      milkOption.innerHTML = `
        <input type="radio" id="milk-${index}" name="milk" value="${milk}" ${index === 0 ? 'checked' : ''}>
        <label for="milk-${index}">${milk}</label>
      `;
      milkRadioGroupElement.appendChild(milkOption);
      
      // Add event listener
      milkOption.querySelector('input').addEventListener('change', function() {
        selectedMilk = this.value;
      });
    });
  }
  
  // Render extra options
  function renderExtraOptions() {
    extrasCheckboxGroupElement.innerHTML = '';
    
    product.options.extras.forEach((extra, index) => {
      const extraOption = document.createElement('div');
      extraOption.className = 'checkbox-option';
      extraOption.innerHTML = `
        <input type="checkbox" id="extra-${index}" name="extras" value="${extra.name}">
        <label for="extra-${index}">${extra.name} (+$${extra.price.toFixed(2)})</label>
      `;
      extrasCheckboxGroupElement.appendChild(extraOption);
      
      // Add event listener
      extraOption.querySelector('input').addEventListener('change', function() {
        if (this.checked) {
          selectedExtras.push(this.value);
        } else {
          selectedExtras = selectedExtras.filter(item => item !== this.value);
        }
        updateTotalPrice();
      });
    });
  }
  
  // Setup event handlers
  function setupEventHandlers() {
    // Quantity buttons
    decreaseQuantityButton.addEventListener('click', function() {
      if (quantity > 1) {
        quantity--;
        quantityValueElement.textContent = quantity;
        updateTotalPrice();
      }
    });
    
    increaseQuantityButton.addEventListener('click', function() {
      quantity++;
      quantityValueElement.textContent = quantity;
      updateTotalPrice();
    });
    
    // Add to cart button
    addToCartButton.addEventListener('click', function() {
      const options = {
        size: selectedSize || undefined,
        milk: selectedMilk || undefined,
        extras: selectedExtras.length > 0 ? selectedExtras : undefined,
        specialInstructions: specialInstructionsElement.value.trim() || undefined
      };
      
      window.NileBean.addToCart(product, quantity, options);
      window.location.href = 'cart.html';
    });
  }
  
  // Update total price
  function updateTotalPrice() {
    const totalPrice = window.NileBean.calculateTotalPrice(product, selectedSize, selectedExtras) * quantity;
    productPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
    addToCartButton.textContent = `Add to Cart - $${totalPrice.toFixed(2)}`;
  }
});
