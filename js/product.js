// The product page: build a drink, watch the price change, add it to the cart.

document.addEventListener('DOMContentLoaded', function () {
  const NB = window.NileBean;
  const $ = id => document.getElementById(id);

  const slug = new URLSearchParams(window.location.search).get('id');

  const loading = $('productLoading');
  const detail = $('productDetail');
  const notFound = $('productNotFound');
  const priceEl = $('productPrice');
  const qtyEl = $('quantityValue');
  const dec = $('decreaseQuantity');
  const inc = $('increaseQuantity');

  let product = null;
  let quantity = 1;
  let lastPrice = null;

  function showNotFound(title, text) {
    loading.classList.add('hidden');
    detail.classList.add('hidden');
    notFound.classList.remove('hidden');
    if (title) $('productNotFoundTitle').textContent = title;
    if (text) $('productNotFoundText').textContent = text;
  }

  // ----- option plates ---------------------------------------------------

  // One builder for every option kind. Inputs are native radios/checkboxes
  // inside a label, so keyboard behaviour and form semantics come for free.
  function renderGroup(groupId, platesId, items, { type, name, checkedFirst, priced, arabic }) {
    const group = $(groupId);
    const plates = $(platesId);
    if (!items || items.length === 0) {
      group.hidden = true;
      return;
    }
    group.hidden = false;
    plates.innerHTML = items
      .map((item, i) => {
        const label = typeof item === 'string' ? item : item.name;
        const price = typeof item === 'string' ? 0 : item.price;
        const ar = arabic && arabic[label];
        const priceText = priced
          ? price > 0 ? `+ ${NB.formatEGP(price)}` : 'Included'
          : '';
        return `
          <label class="option-plate">
            <input type="${type}" name="${name}" value="${NB.escapeHtml(label)}"${checkedFirst && i === 0 ? ' checked' : ''} />
            ${ar ? `<span class="option-plate__ar" lang="ar" dir="rtl">${ar}</span>` : ''}
            <span class="option-plate__name">${NB.escapeHtml(label)}</span>
            ${priceText ? `<span class="option-plate__price">${priceText}</span>` : ''}
          </label>`;
      })
      .join('');
  }

  function chosen(name) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || null;
  }

  function chosenExtras() {
    return [...document.querySelectorAll('input[name="extras"]:checked')].map(i => i.value);
  }

  // ----- price ----------------------------------------------------------

  function updatePrice() {
    const unit = NB.calculateTotalPrice(product, chosen('size'), chosenExtras());
    const total = unit * quantity;
    priceEl.textContent = NB.formatEGP(total);

    // Flip the numerals when the price actually changes.
    if (lastPrice !== null && total !== lastPrice) {
      priceEl.classList.remove('flip');
      void priceEl.offsetWidth;
      priceEl.classList.add('flip');
    }
    lastPrice = total;
    dec.disabled = quantity <= 1;
  }

  // ----- render ---------------------------------------------------------

  function render() {
    loading.classList.add('hidden');
    notFound.classList.add('hidden');
    detail.classList.remove('hidden');

    document.title = `${product.name}, Nile & Bean`;

    const img = document.createElement('img');
    img.width = 800;
    img.height = 1000;
    img.decoding = 'async';
    img.src = NB.imageUrl(product.image, 900, '4:5');
    img.srcset = NB.imageSrcset(product.image, [600, 900, 1200], '4:5');
    img.sizes = '(max-width: 860px) 92vw, 45vw';
    img.alt = product.name;
    $('productPhoto').replaceChildren(img);
    NB.guardPhoto(img, product);

    $('productNameAr').textContent = product.nameAr || '';
    $('productNameAr').hidden = !product.nameAr;
    $('productName').textContent = product.name;
    $('productDescription').textContent = product.longDescription || product.shortDescription;

    const o = product.options || {};
    renderGroup('sizeOptions', 'sizePlates', o.sizes, { type: 'radio', name: 'size', checkedFirst: true, priced: true });
    renderGroup('sugarOptions', 'sugarPlates', o.sugar, { type: 'radio', name: 'sugar', checkedFirst: true, arabic: NB.SUGAR_AR });
    renderGroup('milkOptions', 'milkPlates', o.milk, { type: 'radio', name: 'milk', checkedFirst: true });
    renderGroup('extraOptions', 'extraPlates', o.extras, { type: 'checkbox', name: 'extras', priced: true });

    updatePrice();
  }

  // ----- events ---------------------------------------------------------

  $('productForm').addEventListener('change', updatePrice);

  dec.addEventListener('click', () => {
    if (quantity > 1) {
      quantity -= 1;
      qtyEl.textContent = quantity;
      updatePrice();
    }
  });

  inc.addEventListener('click', () => {
    if (quantity < 99) {
      quantity += 1;
      qtyEl.textContent = quantity;
      updatePrice();
    }
  });

  $('productForm').addEventListener('submit', event => {
    event.preventDefault();
    NB.addToCart(product, quantity, {
      size: chosen('size') || undefined,
      milk: chosen('milk') || undefined,
      sugar: chosen('sugar') || undefined,
      extras: chosenExtras().length ? chosenExtras() : undefined,
      specialInstructions: $('specialInstructions').value.trim() || undefined
    });
    window.location.href = 'cart.html';
  });

  // ----- load -----------------------------------------------------------

  if (!slug) {
    showNotFound('No drink chosen', 'Pick something from the menu to see it here.');
    return;
  }

  // The catalogue is fetched from the API, so nothing resolves until it lands.
  NB.whenProductsReady().then(() => {
    const { state, error } = NB.getLoadState();
    if (state === 'error') {
      showNotFound("We couldn't load this drink", error.message);
      return;
    }
    product = NB.getProductById(slug);
    if (!product) {
      showNotFound();
      return;
    }
    render();
  });
});
