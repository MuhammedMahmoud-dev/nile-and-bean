
document.addEventListener('DOMContentLoaded', function() {
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;
      
      // In a real app, this would send data to a server
      
      // Show success message
      window.NileBean.showToast('Thanks for your message! We\'ll get back to you soon.');
      
      // Reset form
      contactForm.reset();
    });
  }
});
