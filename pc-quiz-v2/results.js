document.addEventListener('DOMContentLoaded', () => {
    const desktopResults = document.getElementById('results');
    const mobileResultsContainer = document.getElementById('mobile-results-container');
    const recommendations = Array.from(document.querySelectorAll('.result-card'));
    const mobileProductTitle = document.getElementById('mobile-product-title');
    const mobileRecPills = document.getElementById('mobile-recommendation-pills');
    const mobilePriceTag = document.querySelector('.mobile-price-tag');
    const mobileBuyButton = document.getElementById('mobile-buy-button');
    const mobileProductImage = document.getElementById('mobile-product-image');
    const mobileProductSpecs = document.getElementById('mobile-product-specs');
    let pillsCreated = false;

    function setupMobilePills() {
        if (pillsCreated || recommendations.length === 0) return;
        
        recommendations.forEach((rec, index) => {
            const badge = rec.querySelector('.recommendation-badge').textContent;
            const pill = document.createElement('div');
            pill.classList.add('mobile-pill');
            pill.textContent = badge;
            pill.dataset.index = index;
            if (index === 0) {
                pill.classList.add('active');
            }
            mobileRecPills.appendChild(pill);
        });

        mobileRecPills.addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-pill')) {
                const index = e.target.dataset.index;
                updateMobileView(index);
            }
        });

        pillsCreated = true;
    }

    function updateMobileView(index) {
        const selectedRec = recommendations[index];
        if (!selectedRec) return;

        mobileProductTitle.textContent = selectedRec.querySelector('h3').textContent;
        const price = selectedRec.querySelector('.price').textContent;
        const strikethrough = selectedRec.querySelector('.strikethrough-price').textContent;
        mobilePriceTag.innerHTML = `${price} <span class="strikethrough-price">${strikethrough}</span>`;
        mobileBuyButton.href = selectedRec.querySelector('.view-product-button').href;
        mobileProductImage.src = selectedRec.querySelector('img').src;
        mobileProductImage.alt = selectedRec.querySelector('img').alt;
        mobileProductSpecs.innerHTML = selectedRec.querySelector('.details').innerHTML;

        document.querySelectorAll('.mobile-pill').forEach(p => p.classList.remove('active'));
        const activePill = document.querySelector(`.mobile-pill[data-index='${index}']`);
        if (activePill) {
            activePill.classList.add('active');
        }
    }

    function handleView() {
        const isMobile = window.innerWidth <= 767;
        if (isMobile) {
            desktopResults.style.display = 'none';
            mobileResultsContainer.style.display = 'block';
            setupMobilePills();
            updateMobileView(0);
        } else {
            desktopResults.style.display = 'grid';
            mobileResultsContainer.style.display = 'none';
        }
    }

    // Initial check
    handleView();

    // Listen for resize events
    window.addEventListener('resize', handleView);

    // Specs button
    const specsButtons = document.querySelectorAll('.view-specs-button');
    specsButtons.forEach(button => {
        button.addEventListener('click', () => {
            const details = button.nextElementSibling;
            details.classList.toggle('open');
            if (details.classList.contains('open')) {
                button.textContent = 'Hide Specs';
            } else {
                button.textContent = 'View Specs';
            }
        });
    });
});
