const siteHeader = document.querySelector('.site-header');
let nav = document.querySelector('#site-nav') || document.querySelector('.site-header nav');
let menuButton = document.querySelector('.menu-toggle');

if (siteHeader && nav) {
  if (!nav.id) {
    nav.id = 'site-nav';
  }

  if (!menuButton) {
    menuButton = document.createElement('button');
    menuButton.className = 'menu-toggle';
    menuButton.type = 'button';
    menuButton.textContent = 'Menu';
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', nav.id);
    siteHeader.insertBefore(menuButton, nav);
  }

  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('nav-open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      nav.classList.remove('nav-open');
    });
  });
}

const reveals = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.12
  });

  reveals.forEach((item) => revealObserver.observe(item));
} else {
  reveals.forEach((item) => item.classList.add('revealed'));
}
