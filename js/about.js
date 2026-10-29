// The contact form. It used to show a thank-you toast and discard the message;
// messages are now stored for administrators to read.

document.addEventListener('DOMContentLoaded', function () {
  const api = window.NileBeanAPI;
  const $ = id => document.getElementById(id);
  const form = $('contactForm');
  if (!form) return;

  const error = $('contactError');
  const sent = $('contactSent');

  // A signed-in customer should not have to type who they are.
  const user = api.getUser();
  if (user) {
    if (!$('name').value) $('name').value = user.full_name || user.username;
    if (!$('email').value) $('email').value = user.email || '';
  }

  function fieldError(id, message) {
    $(`${id}Error`).textContent = message;
    $(id).setAttribute('aria-invalid', 'true');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.classList.add('hidden');
    sent.classList.add('hidden');
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

    const name = $('name').value.trim();
    const email = $('email').value.trim();
    const body = $('message').value.trim();

    const problems = [];
    if (!name) problems.push(['name', 'Enter your name.']);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push(['email', 'Enter a valid email address.']);
    if (!body) problems.push(['message', 'Write a message.']);
    if (problems.length) {
      problems.forEach(([id, msg]) => fieldError(id, msg));
      $(problems[0][0]).focus();
      return;
    }

    const button = $('contactButton');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Sending...';

    try {
      await api.sendMessage({ name, email, body });
      $('message').value = '';
      sent.classList.remove('hidden');
    } catch (err) {
      error.textContent = err.message;
      error.classList.remove('hidden');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
});
