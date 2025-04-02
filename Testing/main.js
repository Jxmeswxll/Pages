// Main JavaScript for NAS Storage Solutions Landing Page

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    const toggle = otherItem.querySelector('.faq-toggle i');
                    toggle.className = 'fas fa-plus';
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
            const toggle = item.querySelector('.faq-toggle i');
            
            if (item.classList.contains('active')) {
                toggle.className = 'fas fa-times';
            } else {
                toggle.className = 'fas fa-plus';
            }
        });
    });
    
    // Success Stories Slider
    const storySlides = document.querySelectorAll('.story-slide');
    const storyIndicators = document.querySelectorAll('.story-indicator');
    const prevStoryBtn = document.querySelector('.prev-story');
    const nextStoryBtn = document.querySelector('.next-story');
    
    if (storySlides.length > 0) {
        let currentSlide = 0;
        
        // Hide all slides except the first one
        storySlides.forEach((slide, index) => {
            if (index !== 0) {
                slide.style.display = 'none';
            }
        });
        
        // Function to show a specific slide
        function showSlide(index) {
            // Hide all slides
            storySlides.forEach(slide => {
                slide.style.display = 'none';
            });
            
            // Remove active class from all indicators
            storyIndicators.forEach(indicator => {
                indicator.classList.remove('active');
            });
            
            // Show the selected slide and activate its indicator
            storySlides[index].style.display = 'block';
            storyIndicators[index].classList.add('active');
            
            // Update current slide index
            currentSlide = index;
        }
        
        // Event listeners for indicators
        storyIndicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                showSlide(index);
            });
        });
        
        // Event listeners for prev/next buttons
        if (prevStoryBtn) {
            prevStoryBtn.addEventListener('click', () => {
                let newIndex = currentSlide - 1;
                if (newIndex < 0) {
                    newIndex = storySlides.length - 1;
                }
                showSlide(newIndex);
            });
        }
        
        if (nextStoryBtn) {
            nextStoryBtn.addEventListener('click', () => {
                let newIndex = currentSlide + 1;
                if (newIndex >= storySlides.length) {
                    newIndex = 0;
                }
                showSlide(newIndex);
            });
        }
        
        // Auto-advance slides every 8 seconds
        setInterval(() => {
            let newIndex = currentSlide + 1;
            if (newIndex >= storySlides.length) {
                newIndex = 0;
            }
            showSlide(newIndex);
        }, 8000);
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
                
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Form validation
    const consultationForm = document.getElementById('consultation-form');
    
    if (consultationForm) {
        consultationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            let isValid = true;
            const requiredFields = consultationForm.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            // Email validation
            const emailField = consultationForm.querySelector('input[type="email"]');
            if (emailField && emailField.value.trim()) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(emailField.value.trim())) {
                    isValid = false;
                    emailField.classList.add('error');
                }
            }
            
            if (isValid) {
                // Simulate form submission
                const submitButton = consultationForm.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
                
                // Simulate API call with timeout
                setTimeout(() => {
                    // Show success message
                    consultationForm.innerHTML = `
                        <div class="form-success">
                            <i class="fas fa-check-circle"></i>
                            <h3>Thank You!</h3>
                            <p>Your consultation request has been received. One of our NAS specialists will contact you within 1 business day.</p>
                        </div>
                    `;
                }, 1500);
            }
        });
    }
    
    // Add placeholder images if needed
    const logoPlaceholder = document.getElementById('logo-placeholder');
    if (logoPlaceholder && !logoPlaceholder.getAttribute('src').includes('/')) {
        logoPlaceholder.src = 'data:image/svg+xml;charset=utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"%3E%3Crect width="200" height="50" fill="%232563eb" /%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="20" fill="white"%3ENAS Solutions%3C/text%3E%3C/svg%3E';
    }
    
    const nasDevicePlaceholder = document.getElementById('nas-device-placeholder');
    if (nasDevicePlaceholder && !nasDevicePlaceholder.getAttribute('src').includes('/')) {
        nasDevicePlaceholder.src = 'data:image/svg+xml;charset=utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6" /%3E%3Crect x="100" y="50" width="200" height="200" rx="10" fill="%232563eb" /%3E%3Crect x="120" y="80" width="160" height="30" rx="5" fill="%23ffffff" /%3E%3Crect x="120" y="120" width="160" height="30" rx="5" fill="%23ffffff" /%3E%3Crect x="120" y="160" width="160" height="30" rx="5" fill="%23ffffff" /%3E%3Crect x="120" y="200" width="160" height="30" rx="5" fill="%23ffffff" /%3E%3C/svg%3E';
    }
    
    const guidePlaceholder = document.getElementById('guide-placeholder');
    if (guidePlaceholder && !guidePlaceholder.getAttribute('src').includes('/')) {
        guidePlaceholder.src = 'data:image/svg+xml;charset=utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250"%3E%3Crect width="200" height="250" fill="%23f3f4f6" /%3E%3Crect x="20" y="20" width="160" height="210" rx="5" fill="%23ffffff" stroke="%232563eb" stroke-width="2" /%3E%3Crect x="40" y="40" width="120" height="20" fill="%232563eb" /%3E%3Crect x="40" y="70" width="120" height="10" fill="%23e5e7eb" /%3E%3Crect x="40" y="90" width="120" height="10" fill="%23e5e7eb" /%3E%3Crect x="40" y="110" width="120" height="10" fill="%23e5e7eb" /%3E%3Crect x="40" y="140" width="120" height="60" fill="%2310b981" /%3E%3Ctext x="100" y="175" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="14" fill="white"%3ENAS Guide%3C/text%3E%3C/svg%3E';
    }
    
    const footerLogoPlaceholder = document.getElementById('footer-logo-placeholder');
    if (footerLogoPlaceholder && !footerLogoPlaceholder.getAttribute('src').includes('/')) {
        footerLogoPlaceholder.src = 'data:image/svg+xml;charset=utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"%3E%3Crect width="200" height="50" fill="%232563eb" /%3E%3Ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="20" fill="white"%3ENAS Solutions%3C/text%3E%3C/svg%3E';
    }
    
    // Add CSS for mobile navigation
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .nav-links {
                position: fixed;
                top: 0;
                right: -100%;
                width: 70%;
                height: 100vh;
                background-color: var(--primary-color);
                flex-direction: column;
                justify-content: center;
                align-items: center;
                transition: right 0.3s ease;
                z-index: 100;
            }
            
            .nav-links.active {
                right: 0;
            }
            
            .nav-links li {
                margin: var(--spacing-md) 0;
            }
            
            .hamburger.active span:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .hamburger.active span:nth-child(2) {
                opacity: 0;
            }
            
            .hamburger.active span:nth-child(3) {
                transform: rotate(-45deg) translate(7px, -6px);
            }
            
            .form-success {
                text-align: center;
                padding: var(--spacing-xl) 0;
            }
            
            .form-success i {
                font-size: 3rem;
                color: var(--success-color);
                margin-bottom: var(--spacing-md);
            }
            
            .form-group input.error,
            .form-group textarea.error {
                border-color: var(--error-color);
            }
        }
    `;
    document.head.appendChild(style);
});
