// The menu page: category street plates over a grid of product plates.

document.addEventListener('DOMContentLoaded', function () {
  const NB = window.NileBean;
  const grid = document.getElementById('menuProducts');
  const count = document.getElementById('menuCount');
  const empty = document.getElementById('noProductsMessage');
  const filters = document.querySelectorAll('.filter-plate');

  // Deep-linkable: menu.html?category=tea opens on tea.
  const params = new URLSearchParams(window.location.search);
  let active = params.get('category') || 'all';

  function render() {
    const { state, error } = NB.getLoadState();

    if (state === 'error') {
      empty.classList.add('hidden');
      count.textContent = '';
      NB.renderMessage(grid, 'error', error.message, true);
      return;
    }
    if (state !== 'ready') return; // skeleton plates from the markup stay up

    // getProducts() reads the live catalogue. This page used to read
    // NileBean.products, a snapshot captured while the array was still empty,
    // so every category rendered zero results (AUDIT.md section 2.1).
    const all = NB.getProducts();
    const shown = active === 'all' ? all : all.filter(p => p.category === active);

    grid.innerHTML = '';
    shown.forEach(p => grid.appendChild(NB.createProductCard(p)));

    empty.classList.toggle('hidden', shown.length > 0);
    count.textContent = `${shown.length} ${shown.length === 1 ? 'item' : 'items'}`;
  }

  function select(category) {
    active = category;
    filters.forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.category === category));
    });
    const url = new URL(window.location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    history.replaceState(null, '', url);
    render();
  }

  filters.forEach(btn => btn.addEventListener('click', () => select(btn.dataset.category)));

  // An unknown ?category= falls back to everything rather than an empty page.
  if (![...filters].some(btn => btn.dataset.category === active)) active = 'all';
  select(active);

  NB.whenProductsReady().then(render);
});
