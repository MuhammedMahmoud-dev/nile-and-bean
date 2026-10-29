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

  // Egyptian pounds; piastres only when there are some.
  const money = value => {
    const n = Number(value) || 0;
    return Math.abs(n - Math.round(n)) < 0.005 ? `EGP ${Math.round(n)}` : `EGP ${n.toFixed(2)}`;
  };

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const title = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

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
            <td>${escapeHtml(title(order.order_type))}</td>
            <td>${money(order.total)}</td>
            <td>
              <label class="visually-hidden" for="status-${order.id}">Status for order ${order.id}</label>
              <select class="status-select" id="status-${order.id}" data-order="${order.id}">
                ${STATUSES.map(s =>
                  `<option value="${s}"${s === order.status ? ' selected' : ''}>${title(s)}</option>`).join('')}
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
              setStatus(statusEl, `Order #${id} is now ${title(this.value)}.`, 'success');
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
              <button class="reset-btn" data-id="${user.id}" data-name="${escapeHtml(user.username)}"
                      ${isSelf ? 'disabled title="Change your own password by signing in"' : ''}>Reset password</button>
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

        // No email exists, so a forgotten password is recovered here: the
        // server issues a temporary one, shown once, for the admin to pass on.
        usersBody.querySelectorAll('.reset-btn').forEach(button => {
          button.addEventListener('click', async function () {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            if (!window.confirm(`Issue a new temporary password for "${name}"? Their current one stops working.`)) return;
            this.disabled = true;
            try {
              const result = await api.resetPassword(id);
              statusEl.className = 'admin-status admin-status-success';
              statusEl.hidden = false;
              statusEl.innerHTML =
                `Temporary password for <strong>${escapeHtml(result.username)}</strong>: ` +
                `<code class="temp-password">${escapeHtml(result.temporary_password)}</code>` +
                ` Pass it on now. It is not stored in readable form and will not be shown again.`;
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
            } finally {
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
  // Dashboard: what needs doing, not a second copy of the navigation
  // -------------------------------------------------------------------------

  const dashOrders = document.getElementById('dashOrders');
  if (dashOrders) {
    const OPEN = ['pending', 'preparing', 'ready'];
    api.listAllOrders()
      .then(orders => {
        const open = orders.filter(o => OPEN.includes(o.status));
        document.getElementById('dashOrdersCount').textContent = open.length;
        dashOrders.innerHTML = open.length
          ? open.slice(0, 6).map(o => `
              <a class="dash-row" href="view-orders.html">
                <span class="dash-row__no">#${o.id}</span>
                <span class="dash-row__main">${escapeHtml(o.contact_name)}
                  <small>${o.items.map(i => `${i.quantity} × ${escapeHtml(i.product_name || 'item')}`).join(', ')}</small></span>
                <span class="status status--${escapeHtml(o.status)}">${escapeHtml(title(o.status))}</span>
              </a>`).join('')
          : '<p class="table-empty">Nothing waiting. Every order is completed or cancelled.</p>';
      })
      .catch(err => { dashOrders.innerHTML = `<p class="admin-status admin-status-error">${escapeHtml(err.message)}</p>`; });
  }

  const dashMessages = document.getElementById('dashMessages');
  if (dashMessages) {
    api.listMessages()
      .then(messages => {
        const unread = messages.filter(m => !m.is_read);
        document.getElementById('dashMessagesCount').textContent = unread.length;
        dashMessages.innerHTML = unread.length
          ? unread.slice(0, 4).map(m => `
              <a class="dash-row" href="view-messages.html">
                <span class="dash-row__main">${escapeHtml(m.name)}
                  <small>${escapeHtml(m.body.length > 90 ? m.body.slice(0, 90) + '…' : m.body)}</small></span>
                <span class="dash-row__when">${formatDate(m.created_at)}</span>
              </a>`).join('')
          : '<p class="table-empty">No unread messages.</p>';
      })
      .catch(err => { dashMessages.innerHTML = `<p class="admin-status admin-status-error">${escapeHtml(err.message)}</p>`; });
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------
  // The contact form used to show a thank-you and discard the message.

  const messagesBody = document.querySelector('#messagesTable tbody');
  if (messagesBody) {
    const statusEl = document.getElementById('messagesStatus');

    const refresh = () =>
      load(messagesBody, 5, statusEl, () => api.listMessages(), messages => {
        messages.forEach(m => {
          const tr = document.createElement('tr');
          if (!m.is_read) tr.className = 'row-unread';
          tr.innerHTML = `
            <td>${m.is_read ? 'Read' : '<strong>New</strong>'}</td>
            <td>${escapeHtml(m.name)}<br><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></td>
            <td class="message-body">${escapeHtml(m.body)}</td>
            <td>${formatDate(m.created_at)}</td>
            <td class="actions">
              <button class="edit-btn" data-id="${m.id}" data-read="${m.is_read}">
                ${m.is_read ? 'Mark unread' : 'Mark read'}
              </button>
              <button class="delete-btn" data-id="${m.id}">Delete</button>
            </td>
          `;
          messagesBody.appendChild(tr);
        });

        messagesBody.querySelectorAll('.edit-btn').forEach(button => {
          button.addEventListener('click', async function () {
            this.disabled = true;
            try {
              await api.markMessage(this.dataset.id, this.dataset.read !== 'true');
              await refresh();
            } catch (err) {
              setStatus(statusEl, err.message, 'error');
              this.disabled = false;
            }
          });
        });

        messagesBody.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', async function () {
            if (!window.confirm('Delete this message?')) return;
            this.disabled = true;
            try {
              await api.deleteMessage(this.dataset.id);
              await refresh();
              setStatus(statusEl, 'Message deleted.', 'success');
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
        <td>${escapeHtml(product.name)}${product.name_ar ? `<br><span class="ar-cell" lang="ar" dir="rtl">${escapeHtml(product.name_ar)}</span>` : ''}</td>
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
      const nameArField = document.getElementById('productNameAr');
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
          if (nameArField) nameArField.value = product.name_ar || '';
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
          name_ar: nameArField ? nameArField.value.trim() || null : null,
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
