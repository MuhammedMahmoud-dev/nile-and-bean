// Sign-in and registration for login.html.

document.addEventListener('DOMContentLoaded', function () {
  const api = window.NileBeanAPI;

  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const signInPanel = document.getElementById('signInPanel');
  const registerPanel = document.getElementById('registerPanel');
  const authError = document.getElementById('authError');

  // Where to go after signing in. Set by the admin guard when it bounces an
  // anonymous visitor, so they land where they were headed.
  const params = new URLSearchParams(window.location.search);
  const nextUrl = safeNext(params.get('next'));

  // Only same-origin relative paths, so ?next= cannot be used to redirect
  // someone to another site after they authenticate.
  function safeNext(value) {
    if (!value) return 'index.html';
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return 'index.html';
    return value.replace(/^\/+/, '');
  }

  if (api.isLoggedIn()) {
    window.location.replace(nextUrl);
    return;
  }

  // --- tabs ---------------------------------------------------------------

  function showPanel(which) {
    const signingIn = which === 'signin';

    signInPanel.classList.toggle('hidden', !signingIn);
    registerPanel.classList.toggle('hidden', signingIn);

    tabSignIn.classList.toggle('active', signingIn);
    tabRegister.classList.toggle('active', !signingIn);
    tabSignIn.setAttribute('aria-selected', String(signingIn));
    tabRegister.setAttribute('aria-selected', String(!signingIn));

    clearErrors();
  }

  tabSignIn.addEventListener('click', () => showPanel('signin'));
  tabRegister.addEventListener('click', () => showPanel('register'));

  // --- error display ------------------------------------------------------

  function clearErrors() {
    authError.textContent = '';
    authError.classList.add('hidden');
    document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.text-input').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFormError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
  }

  function showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const slot = document.getElementById(`${inputId}Error`);
    if (slot) slot.textContent = message;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function firstInvalid(checks) {
    for (const [inputId, message, ok] of checks) {
      if (!ok) {
        showFieldError(inputId, message);
        document.getElementById(inputId)?.focus();
        return false;
      }
    }
    return true;
  }

  async function submitting(button, label, work) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = label;
    try {
      await work();
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  // --- sign in ------------------------------------------------------------

  signInPanel.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!firstInvalid([
      ['loginUsername', 'Enter your username.', username.length > 0],
      ['loginPassword', 'Enter your password.', password.length > 0]
    ])) return;

    await submitting(document.getElementById('signInButton'), 'Signing in...', async () => {
      try {
        const user = await api.login(username, password);
        window.NileBean.showToast(`Signed in as ${user.username}`);
        window.location.href = nextUrl;
      } catch (err) {
        showFormError(err.message);
      }
    });
  });

  // --- register -----------------------------------------------------------

  registerPanel.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const fullName = document.getElementById('regFullName').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!firstInvalid([
      ['regUsername', 'Choose a username of at least 3 characters.', username.length >= 3],
      ['regUsername', 'Use only letters, numbers, dots, dashes and underscores.',
        /^[A-Za-z0-9_.-]+$/.test(username)],
      ['regEmail', 'Enter a valid email address.', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)],
      ['regPassword', 'Use at least 8 characters.', password.length >= 8]
    ])) return;

    await submitting(document.getElementById('registerButton'), 'Creating account...', async () => {
      try {
        const user = await api.register({
          username,
          email,
          full_name: fullName || null,
          password
        });
        window.NileBean.showToast(`Welcome, ${user.username}`);
        window.location.href = nextUrl;
      } catch (err) {
        showFormError(err.message);
      }
    });
  });
});
