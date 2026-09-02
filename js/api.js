// Nile & Bean - API client and session handling.
//
// Loaded before every other script. Owns the access token, the base URL, and
// the translation of HTTP failures into messages a person can read.

(function () {
  'use strict';

  const TOKEN_KEY = 'nilebeanToken';
  const USER_KEY = 'nilebeanUser';

  // The frontend is normally served by the API itself, so a relative URL is
  // correct. When the static files are run from a separate dev server while
  // working on the frontend, point at the API explicitly. Override by setting
  // window.NILEBEAN_API_BASE before this script loads.
  const API_BASE = (function () {
    if (typeof window.NILEBEAN_API_BASE === 'string') return window.NILEBEAN_API_BASE;
    if (location.protocol === 'file:') return 'http://127.0.0.1:8000';
    // Any origin that is not the API's own is treated as a separate dev server.
    if (location.port && location.port !== '8000') return 'http://127.0.0.1:8000';
    return '';
  })();

  // ---------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------
  // The token is held in localStorage. That makes it readable by any script
  // running on the page, so it is only as safe as the page is free of XSS.
  // The alternative - an httpOnly cookie - needs CSRF handling that this
  // project does not have. Recorded as a known limitation in AUDIT.md.

  function readStored(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch (err) {
      console.warn(`Discarding corrupt "${key}": ${err.message}`);
      try { localStorage.removeItem(key); } catch (_) {}
      return null;
    }
  }

  function getToken() {
    const t = readStored(TOKEN_KEY);
    return typeof t === 'string' ? t : null;
  }

  function getUser() {
    const u = readStored(USER_KEY);
    return u && typeof u === 'object' ? u : null;
  }

  function setSession(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error(`Could not persist the session: ${err.message}`);
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (_) {}
  }

  const isLoggedIn = () => getToken() !== null;
  const isAdmin = () => Boolean(getUser()?.is_admin);

  // ---------------------------------------------------------------------
  // Errors
  // ---------------------------------------------------------------------

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.details = details || null;
    }
  }

  // FastAPI returns `detail` as a string for HTTPException and as a list of
  // per-field objects for a validation failure. Flatten both into one line.
  function messageFromPayload(payload, status) {
    const detail = payload?.detail;

    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
      return detail
        .map(d => {
          const field = Array.isArray(d.loc) ? d.loc.filter(p => p !== 'body').join('.') : '';
          const msg = (d.msg || '').replace(/^Value error,\s*/, '');
          return field ? `${field}: ${msg}` : msg;
        })
        .filter(Boolean)
        .join('; ');
    }

    if (status === 401) return 'Please sign in to continue.';
    if (status === 403) return 'You do not have permission to do that.';
    if (status === 404) return 'Not found.';
    return `Request failed (${status}).`;
  }

  async function request(path, options = {}) {
    const { method = 'GET', body, auth = false, form = false } = options;

    const headers = {};
    let payload;

    if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      payload = new URLSearchParams(body).toString();
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    if (auth) {
      const token = getToken();
      if (!token) throw new ApiError('You need to sign in first.', 401);
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
    } catch (err) {
      // Network-level failure: server down, DNS, CORS rejection.
      throw new ApiError(
        'Could not reach the server. Check that the API is running.',
        0,
        err.message
      );
    }

    if (response.status === 204) return null;

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = null;
      }
    }

    if (!response.ok) {
      // An expired or revoked token: drop it so the UI stops claiming a session.
      if (response.status === 401 && auth) clearSession();
      throw new ApiError(messageFromPayload(data, response.status), response.status, data);
    }

    return data;
  }

  // ---------------------------------------------------------------------
  // Endpoints
  // ---------------------------------------------------------------------

  const api = {
    ApiError,
    getToken,
    getUser,
    setSession,
    clearSession,
    isLoggedIn,
    isAdmin,
    request,

    // Auth
    async login(username, password) {
      // The token endpoint is an OAuth2 password flow, so it takes form data.
      const data = await request('/api/auth/login', {
        method: 'POST',
        form: true,
        body: { username, password }
      });
      setSession(data.access_token, data.user);
      return data.user;
    },

    async register(details) {
      const data = await request('/api/auth/register', { method: 'POST', body: details });
      setSession(data.access_token, data.user);
      return data.user;
    },

    logout() {
      // The token is stateless, so signing out is purely client-side: drop it.
      clearSession();
    },

    me: () => request('/api/auth/me', { auth: true }),

    // Products
    listProducts: category =>
      request(`/api/products${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`),
    getProduct: slug => request(`/api/products/${encodeURIComponent(slug)}`),
    listAllProducts: () => request('/api/products/admin/all', { auth: true }),
    createProduct: data => request('/api/products', { method: 'POST', body: data, auth: true }),
    updateProduct: (id, data) => request(`/api/products/${id}`, { method: 'PATCH', body: data, auth: true }),
    deleteProduct: id => request(`/api/products/${id}`, { method: 'DELETE', auth: true }),

    // Orders
    createOrder: order => request('/api/orders', { method: 'POST', body: order, auth: true }),
    listMyOrders: () => request('/api/orders/me', { auth: true }),
    listAllOrders: () => request('/api/orders', { auth: true }),
    setOrderStatus: (id, status) =>
      request(`/api/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),

    // Users (admin)
    listUsers: () => request('/api/users', { auth: true }),
    updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PATCH', body: data, auth: true }),
    deleteUser: id => request(`/api/users/${id}`, { method: 'DELETE', auth: true }),

    // Reviews (admin)
    listReviews: () => request('/api/reviews', { auth: true }),
    deleteReview: id => request(`/api/reviews/${id}`, { method: 'DELETE', auth: true })
  };

  window.NileBeanAPI = api;
})();
