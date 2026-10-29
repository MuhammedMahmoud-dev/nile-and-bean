// The order ticket: shown straight after checkout, and from My orders.

document.addEventListener('DOMContentLoaded', async function () {
  const NB = window.NileBean;
  const api = window.NileBeanAPI;
  const $ = id => document.getElementById(id);
  const esc = NB.escapeHtml;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const justPlaced = params.get('placed') === '1';

  const STATUS_TEXT = {
    pending: 'Received, waiting for the barista',
    preparing: 'Being made',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  const PAYMENT_TEXT = { card: 'Card (demo)', applepay: 'Apple Pay (demo)', googlepay: 'Google Pay (demo)' };

  function fail(title, text) {
    $('orderLoading').classList.add('hidden');
    $('orderError').classList.remove('hidden');
    $('orderErrorTitle').textContent = title;
    $('orderErrorText').textContent = text;
  }

  if (!id || !/^\d+$/.test(id)) return fail('No order chosen', 'Open an order from My orders.');
  if (!api.isLoggedIn()) {
    window.location.replace(`login.html?next=${encodeURIComponent(`order.html?id=${id}`)}`);
    return;
  }

  // The catalogue gives Arabic names for the lines; it is not required.
  await NB.whenProductsReady();

  let order;
  try {
    order = await api.getOrder(id);
  } catch (err) {
    if (err.status === 401) {
      window.location.replace(`login.html?next=${encodeURIComponent(`order.html?id=${id}`)}`);
      return;
    }
    return fail(err.status === 404 ? 'Order not found' : "We couldn't load that order",
                err.status === 404 ? 'It may belong to another account.' : err.message);
  }

  const placed = new Date(order.created_at);
  document.title = `Order ${order.id}, Nile & Bean`;

  $('ticketNo').textContent = `Order #${order.id}`;
  $('ticketLeadAr').textContent = `طلب رقم ${NB.toArabicDigits(order.id)}`;
  $('ticketLead').textContent = justPlaced
    ? `Thank you. Your order is in, and ${order.order_type === 'delivery' ? 'it will be delivered' : 'it will be ready for pickup'}. This is a demo: nothing is really made.`
    : `Placed ${placed.toLocaleString()}.`;

  const where = order.order_type === 'delivery'
    ? `Delivery to ${[order.address_street, order.address_city, order.address_zip].filter(Boolean).join(', ')}`
    : 'Pickup at the counter';

  $('ticketMeta').innerHTML = `
    <div><dt>Status</dt><dd><span class="status status--${esc(order.status)}">${esc(order.status)}</span>
      <span class="visually-hidden">${esc(STATUS_TEXT[order.status] || '')}</span></dd></div>
    <div><dt>${order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}</dt><dd>${esc(where)}</dd></div>
    <div><dt>Payment</dt><dd>${esc(PAYMENT_TEXT[order.payment_method] || order.payment_method)}</dd></div>
    <div><dt>Contact</dt><dd>${esc(order.contact_name)}<br>${esc(order.contact_phone)}</dd></div>`;

  $('ticketItems').innerHTML = order.items
    .map(line => {
      const product = NB.getProducts().find(p => p.productId === line.product_id);
      const chips = [line.size, line.sugar, line.milk && `${line.milk} milk`, ...(line.extras || []).map(e => `+ ${e}`)]
        .filter(Boolean)
        .map(c => `<span class="chip">${esc(c)}</span>`)
        .join('');
      return `
        <div class="cart-line" style="grid-template-columns: minmax(0, 1fr) auto">
          <div>
            ${product?.nameAr ? `<div class="cart-line__ar" lang="ar" dir="rtl">${esc(product.nameAr)}</div>` : ''}
            <div class="cart-line__name">${line.quantity} &times; ${esc(line.product_name || product?.name || 'Item')}</div>
            ${chips ? `<div class="cart-line__opts">${chips}</div>` : ''}
            ${line.special_instructions ? `<p class="cart-line__note">Note: ${esc(line.special_instructions)}</p>` : ''}
          </div>
          <div class="cart-line__price">${esc(NB.formatEGP(line.line_total))}</div>
        </div>`;
    })
    .join('');

  $('ticketTotals').innerHTML = `
    <div class="totals__line"><span>Subtotal</span><span>${esc(NB.formatEGP(order.subtotal))}</span></div>
    <div class="totals__line"><span>VAT (14%)</span><span>${esc(NB.formatEGP(order.tax))}</span></div>
    <div class="totals__line totals__line--grand"><span>Total</span><span>${esc(NB.formatEGP(order.total))}</span></div>`;

  $('orderLoading').classList.add('hidden');
  $('orderTicket').classList.remove('hidden');
});
