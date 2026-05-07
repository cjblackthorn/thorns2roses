const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('nav-open');
  });
}

const reveals = document.querySelectorAll('.reveal');

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
