// scripts.js

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const hero = document.querySelector('.hero');

    window.addEventListener('scroll', () => {
        if (window.scrollY > hero.offsetHeight / 2) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const contactForm = document.querySelector('.contact-form');
    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        alert('Thank you for reaching out! We will get back to you shortly.');
        contactForm.reset();
    });
});