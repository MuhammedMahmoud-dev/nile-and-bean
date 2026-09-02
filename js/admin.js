// Admin page behaviour.
//
// One file for all six admin pages; each block runs only if its container is
// present. Every page previously held hardcoded table rows and handlers that
// only touched the DOM - "Delete" removed a row without telling the server,
// "Edit" opened an alert() and changed nothing, and "Update Products" appended
// a row rather than updating anything (AUDIT.md section 6.6).

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const api = window.NileBeanAPI;

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  const money = value => `$${Number(value).toFixed(2)}`;

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatDate = iso => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
  };

  function setStatus(el, message, kind = 'info') {
    if (!el) return;
    el.textContent = message;
    el.className = `admin-status admin-status-${kind}`;
    el.hidden = !message;
  }

  function rowMessage(tbody, columns, message) {
    tbody.innerHTML = `<tr><td colspan="${columns}" class="table-empty">${escapeHtml(message)}</td></tr>`;
  }

  // Wraps a load: shows "Loading...", then either renders or reports why not.
  async function load(tbody, columns, statusEl, fetcher, render) {
    rowMessage(tbody, columns, 'Loading...');
    setStatus(statusEl, '');
    try {
      const data = await fetcher();
      if (!data || data.length === 0) {
        rowMessage(tbody, columns, 'Nothing to show yet.');
        return [];
      }
      tbody.innerHTML = '';
      render(data);
      return data;
    } catch (err) {
      rowMessage(tbody, columns, 'Could not load this data.');
      setStatus(statusEl, err.message, 'error');
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  const ordersBody = document.querySelector('#ordersTable tbody');
  if (ordersBody) {
    const statusEl = document.getElementById('ordersStatus');
    const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

    const refresh = () =>
      load(ordersBody, 7, statusEl, () => api.listAllOrders(), orders => {
        orders.forEach(order => {
          const items = order.items
            .map(i => `${i.quantity}x ${escapeHtml(i.product_name || `#${i.product_id}`)}`)
            .join('<br>');

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${order.id}</td>
            <td>${escapeHtml(order.contact_name)}<br><small>${escapeHtml(order.contact_email)}</small></td>
            <td>${items}</td>
            <td>${escapeHtml(order.order_type)}</td>
            <td>${money(order.total)}</td>
            <td>
              <label class="visually-hidden" for="status-${order.id}">Status for order ${order.id}</label>
              <select class="status-select" id="status-${order.id}" data-order="${order.id}">
                ${STATUSES.map(s =>
                  `<option value="${s}"${s === order.status ? ' selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
            <td>${formatDate(order.created_at)}</td>
          `;
          ordersBody.appendChild(tr);
        });

        ordersBody.querySelectorAll('.status-select').forEach(select => {
          select.addEventListener('change', async function () {
            const id = this.getAttribute('data-order');
            const previous = this.getAttribute('data-previous') || '';
            this.disabled = true;
            try {
              await api.setOrderStatus(id, this.value);
              setStatus(statusEl, `Order #${id} set to ${this.value}.`, 'success');
              this.setAttribute('data-previous', this.value);
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
              if (previous) this.value = previous;
            } finally {
              this.disabled = false;
            }
          });
          select.setAttribute('data-previous', select.value);
        });
      });

    refresh();
  }

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  const usersBody = document.querySelector('#userTable tbody');
  if (usersBody) {
    const statusEl = document.getElementById('usersStatus');

    const refresh = () =>
      load(usersBody, 5, statusEl, () => api.listUsers(), users => {
        const me = api.getUser();
        users.forEach(user => {
          const isSelf = me && me.id === user.id;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${user.id}</td>
            <td>${escapeHtml(user.full_name || '-')}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.is_admin ? 'Admin' : 'Customer'}</td>
            <td class="actions">
              <button class="edit-btn" data-id="${user.id}" data-admin="${user.is_admin}"
                      ${isSelf ? 'disabled title="You cannot change your own role"' : ''}>
                ${user.is_admin ? 'Make Customer' : 'Make Admin'}
              </button>
              <button class="delete-btn" data-id="${user.id}" data-name="${escapeHtml(user.username)}"
                      ${isSelf ? 'disabled title="You cannot delete your own account"' : ''}>Delete</button>
            </td>
          `;
          usersBody.appendChild(tr);
        });

        usersBody.querySelectorAll('.edit-btn').forEach(button => {
          button.addEventListener('click', async function () {
            const id = this.getAttribute('data-id');
            const makeAdmin = this.getAttribute('data-admin') !== 'true';
            this.disabled = true;
            try {
              await api.updateUser(id, { is_admin: makeAdmin });
              await refresh();
              setStatus(statusEl, `Updated user #${id}.`, 'success');
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
              this.disabled = false;
            }
          });
        });

        usersBody.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', async function () {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
            this.disabled = true;
            try {
              await api.deleteUser(id);
              await refresh();
              setStatus(statusEl, `Deleted user "${name}".`, 'success');
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
              this.disabled = false;
            }
          });
        });
      });

    refresh();
  }

  // -------------------------------------------------------------------------
  // Reviews
  // -------------------------------------------------------------------------

  const reviewsBody = document.querySelector('#reviewsTable tbody');
  if (reviewsBody) {
    const statusEl = document.getElementById('reviewsStatus');

    const refresh = () =>
      load(reviewsBody, 6, statusEl, () => api.listReviews(), reviews => {
        reviews.forEach(review => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>#${review.id}</td>
            <td>${escapeHtml(review.user_name || `#${review.user_id}`)}</td>
            <td>${escapeHtml(review.product_name || `#${review.product_id}`)}</td>
            <td aria-label="${review.rating} out of 5">${review.rating}/5</td>
            <td>${escapeHtml(review.comment || '')}</td>
            <td class="actions">
              <button class="delete-btn" data-id="${review.id}">Delete</button>
            </td>
          `;
          reviewsBody.appendChild(tr);
        });

        reviewsBody.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', async function () {
            const id = this.getAttribute('data-id');
            if (!window.confirm(`Delete review #${id}?`)) return;
            this.disabled = true;
            try {
              await api.deleteReview(id);
              await refresh();
              setStatus(statusEl, `Deleted review #${id}.`, 'success');
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
              this.disabled = false;
            }
          });
        });
      });

    refresh();
  }

  // -------------------------------------------------------------------------
  // Products - shared by add-product, update-product and remove-product
  // -------------------------------------------------------------------------

  const productsBody = document.querySelector('#productTable tbody');
  if (productsBody) {
    const statusEl = document.getElementById('productsStatus');
    const mode = document.body.getAttribute('data-product-mode') || 'list';

    function productRow(product) {
      const tr = document.createElement('tr');
      const actions =
        mode === 'remove'
          ? `<button class="delete-btn" data-id="${product.id}" data-name="${escapeHtml(product.name)}">Remove</button>`
          : mode === 'update'
            ? `<button class="edit-btn" data-id="${product.id}">Edit</button>
               <button class="toggle-btn" data-id="${product.id}" data-available="${product.available}">
                 ${product.available ? 'Withdraw' : 'Restore'}
               </button>`
            : '';

      tr.innerHTML = `
        <td>${escapeHtml(product.slug)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${money(product.price)}</td>
        <td>${product.available ? 'On sale' : 'Withdrawn'}</td>
        ${actions ? `<td class="actions">${actions}</td>` : ''}
      `;
      return tr;
    }

    const columnCount = mode === 'list' ? 5 : 6;

    const refresh = () =>
      load(productsBody, columnCount, statusEl, () => api.listAllProducts(), products => {
        products.forEach(p => productsBody.appendChild(productRow(p)));
        wireProductActions();
      });

    function wireProductActions() {
      productsBody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function () {
          const id = this.getAttribute('data-id');
          const name = this.getAttribute('data-name');
          if (!window.confirm(`Remove "${name}" from the catalogue?`)) return;
          this.disabled = true;
          try {
            await api.deleteProduct(id);
            await refresh();
            setStatus(statusEl, `Removed "${name}".`, 'success');
          } catch (err) {
            // A product that appears in an order cannot be deleted; the server
            // says so and suggests withdrawing it instead.
            setStatus(statusEl, err.message, 'error');
            this.disabled = false;
          }
        });
      });

      productsBody.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', async function () {
          const id = this.getAttribute('data-id');
          const nowAvailable = this.getAttribute('data-available') !== 'true';
          this.disabled = true;
          try {
            await api.updateProduct(id, { available: nowAvailable });
            await refresh();
            setStatus(statusEl, nowAvailable ? 'Restored to sale.' : 'Withdrawn from sale.', 'success');
          } catch (err) {
            setStatus(statusEl, err.message, 'error');
            this.disabled = false;
          }
        });
      });

      productsBody.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => startEdit(button.getAttribute('data-id')));
      });
    }

    // --- create / edit form ------------------------------------------------

    const form = document.getElementById('productForm');
    if (form) {
      const idField = document.getElementById('productDbId');
      const slugField = document.getElementById('productSlug');
      const nameField = document.getElementById('productName');
      const priceField = document.getElementById('productPrice');
      const categoryField = document.getElementById('productCategory');
      const descField = document.getElementById('productDescription');
      const imageField = document.getElementById('productImage');
      const submitButton = document.getElementById('productSubmit');
      const cancelButton = document.getElementById('productCancel');
      const formTitle = document.getElementById('productFormTitle');

      function showFieldError(id, message) {
        const slot = document.getElementById(`${id}Error`);
        if (slot) slot.textContent = message;
        const input = document.getElementById(id);
        if (message && input) input.setAttribute('aria-invalid', 'true');
        else input?.removeAttribute('aria-invalid');
      }

      function clearFieldErrors() {
        form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      }

      function resetForm() {
        form.reset();
        if (idField) idField.value = '';
        clearFieldErrors();
        if (formTitle) formTitle.textContent = 'Add New Product';
        if (submitButton) submitButton.textContent = 'Add Product';
        if (cancelButton) cancelButton.hidden = true;
        if (slugField) slugField.disabled = false;
      }

      window.startEdit = async function (id) {
        setStatus(statusEl, '');
        try {
          const products = await api.listAllProducts();
          const product = products.find(p => String(p.id) === String(id));
          if (!product) {
            setStatus(statusEl, 'That product no longer exists.', 'error');
            return;
          }
          idField.value = product.id;
          slugField.value = product.slug;
          slugField.disabled = true; // the slug is the public URL; leave it alone
          nameField.value = product.name;
          priceField.value = Number(product.price).toFixed(2);
          categoryField.value = product.category;
          if (descField) descField.value = product.short_description || '';
          if (imageField) imageField.value = product.image || '';
          if (formTitle) formTitle.textContent = `Edit "${product.name}"`;
          if (submitButton) submitButton.textContent = 'Save Changes';
          if (cancelButton) cancelButton.hidden = false;
          form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
          setStatus(statusEl, err.message, 'error');
        }
      };

      cancelButton?.addEventListener('click', resetForm);

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearFieldErrors();
        setStatus(statusEl, '');

        const editingId = idField ? idField.value : '';
        const slug = slugField.value.trim().toLowerCase();
        const name = nameField.value.trim();
        const priceRaw = priceField.value.trim();
        const category = categoryField.value.trim().toLowerCase();
        const price = Number(priceRaw);

        // Validate before sending. The server validates again - this is only
        // to give a faster, field-level answer.
        let ok = true;
        if (!editingId && !/^[a-z0-9-]+$/.test(slug)) {
          showFieldError('productSlug', 'Lowercase letters, numbers and dashes only.'); ok = false;
        }
        if (name.length === 0) { showFieldError('productName', 'Enter a product name.'); ok = false; }
        if (!Number.isFinite(price) || price <= 0) {
          showFieldError('productPrice', 'Enter a price greater than zero.'); ok = false;
        } else if (!/^\d+(\.\d{1,2})?$/.test(priceRaw)) {
          showFieldError('productPrice', 'Use at most two decimal places.'); ok = false;
        }
        if (category.length === 0) { showFieldError('productCategory', 'Choose a category.'); ok = false; }
        if (!ok) return;

        const payload = {
          name,
          price: priceRaw,
          category,
          short_description: descField ? descField.value.trim() : '',
          image: imageField ? imageField.value.trim() || null : null
        };

        submitButton.disabled = true;
        try {
          const message = editingId ? `Saved "${name}".` : `Added "${name}".`;
          if (editingId) {
            await api.updateProduct(editingId, payload);
          } else {
            await api.createProduct({ ...payload, slug, available: true });
          }
          resetForm();
          await refresh();
          setStatus(statusEl, message, 'success');
        } catch (err) {
          setStatus(statusEl, err.message, 'error');
        } finally {
          submitButton.disabled = false;
        }
      });
    }

    refresh();
  }
});
