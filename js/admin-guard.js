// Admin page guard.
//
// Loaded first on every admin page. Anyone could previously open Admin.html
// directly and the site would render the full dashboard (AUDIT.md section 6.1).
//
// This is a usability guard, not the security boundary. It hides a page from
// someone who should not see it and sends them somewhere sensible. The actual
// enforcement is server-side: every admin endpoint depends on get_current_admin,
// so a forged localStorage entry gets an empty page and a 403 from every
// request it tries to make.

(function () {
  'use strict';

  const api = window.NileBeanAPI;
  const here = window.location.pathname.split('/').pop() || 'admin.html';

  // Hide the document until the check completes, so protected markup never
  // flashes on screen before the redirect.
  document.documentElement.style.visibility = 'hidden';

  function reveal() {
    document.documentElement.style.visibility = '';
  }

  function redirectToLogin() {
    window.location.replace(`login.html?next=${encodeURIComponent(here)}`);
  }

  if (!api.isLoggedIn()) {
    redirectToLogin();
    return;
  }

  if (!api.isAdmin()) {
    window.location.replace('index.html');
    return;
  }

  // The stored user could be stale or hand-edited, so confirm with the server
  // before trusting it. The page is already usable at this point; this only
  // catches a revoked or downgraded account.
  api.me()
    .then(user => {
      if (!user.is_admin) {
        window.location.replace('index.html');
        return;
      }
      reveal();
    })
    .catch(err => {
      if (err.status === 401) {
        redirectToLogin();
      } else {
        // Server unreachable: show the page so the error state is visible
        // rather than leaving a blank screen with no explanation.
        reveal();
        console.error('Could not confirm administrator access:', err.message);
      }
    });

  // Failsafe: never leave the document hidden if something above throws.
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(reveal, 4000);
  });
})();
