// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form submission handling
document.getElementById('booking-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const service = document.getElementById('service').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    // Simple form validation
    if (!name || !email || !service || !date || !time) {
        alert('Please fill in all fields');
        return;
    }
    
    // Here you would typically send this data to a server
    // For demo purposes, we'll just show an alert
    alert(`Booking received!\n\nName: ${name}\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nWe'll send a confirmation email to ${email} shortly.`);
    
    // Reset form
    this.reset();
});

// Add current date as minimum date for booking
document.getElementById('date').min = new Date().toISOString().split('T')[0];

// Navigation scroll effect
window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.backgroundColor = 'rgba(26, 26, 26, 0.95)';
    } else {
        nav.style.backgroundColor = '#1a1a1a';
    }
});