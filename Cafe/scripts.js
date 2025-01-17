// Menu items data
const menuData = {
    coffee: [
        { name: 'Espresso', price: 3.50, description: 'Rich and bold single shot' },
        { name: 'Cappuccino', price: 4.50, description: 'Espresso with steamed milk and foam' },
        { name: 'Latte', price: 4.50, description: 'Espresso with steamed milk' },
        { name: 'Americano', price: 3.75, description: 'Espresso with hot water' },
        { name: 'Mocha', price: 5.00, description: 'Espresso with chocolate and steamed milk' }
    ],
    tea: [
        { name: 'Earl Grey', price: 3.50, description: 'Classic black tea with bergamot' },
        { name: 'Green Tea', price: 3.50, description: 'Light and refreshing' },
        { name: 'Chai Latte', price: 4.50, description: 'Spiced black tea with steamed milk' },
        { name: 'Chamomile', price: 3.50, description: 'Caffeine-free herbal tea' }
    ],
    pastries: [
        { name: 'Croissant', price: 3.75, description: 'Buttery and flaky' },
        { name: 'Blueberry Muffin', price: 3.50, description: 'Fresh baked daily' },
        { name: 'Danish', price: 4.00, description: 'Filled with seasonal fruit' },
        { name: 'Cinnamon Roll', price: 4.50, description: 'House-made with cream cheese frosting' }
    ],
    breakfast: [
        { name: 'Avocado Toast', price: 9.50, description: 'Sourdough with smashed avocado and eggs' },
        { name: 'Breakfast Sandwich', price: 8.50, description: 'Eggs, cheese, and bacon on croissant' },
        { name: 'Yogurt Parfait', price: 6.50, description: 'Greek yogurt with granola and berries' },
        { name: 'Oatmeal', price: 5.50, description: 'Steel-cut oats with choice of toppings' }
    ]
};

// Shopping cart
let cart = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Menu category buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    const menuContainer = document.getElementById('menu-container');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const orderForm = document.getElementById('order-form');
    const loyaltyForm = document.getElementById('loyalty-form');
    const orderTypeButtons = document.querySelectorAll('.order-type-btn');

    // Initialize menu
    showMenuCategory('coffee');

    // Menu category event listeners
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            showMenuCategory(button.dataset.category);
        });
    });

    // Order type toggle
    orderTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            orderTypeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            toggleDeliveryFields(button.dataset.type);
        });
    });

    // Display menu items for selected category
    function showMenuCategory(category) {
        menuContainer.innerHTML = '';
        menuData[category].forEach(item => {
            const itemElement = createMenuItem(item);
            menuContainer.appendChild(itemElement);
        });
    }

    // Create menu item element
    function createMenuItem(item) {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <span class="price">$${item.price.toFixed(2)}</span>
            <button class="btn primary" onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
        `;
        return div;
    }

    // Add item to cart
    window.addToCart = function(name, price) {
        cart.push({ name, price });
        updateCart();
        showNotification('Item added to cart!');
    };

    // Update cart display
    function updateCart() {
        cartItems.innerHTML = '';
        cart.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})">Remove</button>
            `;
            cartItems.appendChild(itemElement);
        });
        
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    // Remove item from cart
    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        updateCart();
        showNotification('Item removed from cart');
    };

    // Toggle delivery fields
    function toggleDeliveryFields(type) {
        const deliveryFields = document.getElementById('delivery-fields');
        if (deliveryFields) {
            deliveryFields.style.display = type === 'delivery' ? 'block' : 'none';
        }
    }

    // Show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Form submissions
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (cart.length === 0) {
            showNotification('Please add items to your cart');
            return;
        }
        
        // Here you would typically send the order to a server
        showNotification('Order placed successfully!');
        cart = [];
        updateCart();
        this.reset();
    });

    loyaltyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        showNotification('Welcome to our loyalty program!');
        this.reset();
    });
});

// Add time slot restrictions
document.addEventListener('DOMContentLoaded', function() {
    const timeInput = document.getElementById('pickup-time');
    if (timeInput) {
        // Set minimum time to current time
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        timeInput.min = `${currentHour}:${currentMinute}`;
        
        // Set maximum time to closing time (8 PM)
        timeInput.max = "20:00";
    }
});

// Smooth scrolling for navigation
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

// Navigation scroll effect
window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    } else {
        nav.style.backgroundColor = '#fff';
    }
});