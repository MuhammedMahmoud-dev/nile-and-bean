// My orders: every order the signed-in customer has placed, newest first.
// The /api/orders/me endpoint existed before this page did; nothing used it.

document.addEventListener('DOMContentLoaded', async function () {
  const NB = window.NileBean;
  const api = window.NileBeanAPI;
  const $ = id => document.getElementById(id);
  const esc = NB.escapeHtml;
  const list = $('orderList');

  if (!api.isLoggedIn()) {
    list.innerHTML = '';
    $('ordersSignedOut').classList.remove('hidden');
    return;
  }

  let orders;
  try {
    orders = await api.listMyOrders();
  } catch (err) {
    list.innerHTML = '';
    if (err.status === 401) {
      $('ordersSignedOut').classList.remove('hidden');
      return;
    }
    $('ordersErrorText').textContent = err.message;
    $('ordersError').classList.remove('hidden');
    return;
  }

  if (orders.length === 0) {
    list.innerHTML = '';
    $('ordersEmpty').classList.remove('hidden');
    return;
  }

  list.innerHTML = orders
    .map(order => {
      const items = order.items.map(i => `${i.quantity} × ${i.product_name || 'item'}`).join(', ');
      const when = new Date(order.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `
        <a class="order-row" href="order.html?id=${order.id}">
          <span class="order-row__no">#${order.id}</span>
          <span style="min-width: 0">
            <span class="order-row__items" style="display: block">${esc(items)}</span>
            <span class="order-row__when">${esc(when)} &middot; ${order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</span>
          </span>
          <span class="status status--${esc(order.status)}">${esc(order.status)}</span>
          <span class="order-row__total">${esc(NB.formatEGP(order.total))}</span>
        </a>`;
    })
    .join('');
});
