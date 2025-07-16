document.addEventListener('DOMContentLoaded', () => {
    const quizContainer = document.querySelector('.quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const resultsGrid = document.getElementById('results');
    const loader = document.getElementById('loader');
    const steps = document.querySelectorAll('.step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progress = document.getElementById('progress');

    let currentStep = 0;
    const answers = {
        step2: { resolution: null, games: [] }
    };

    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook/b4adc638-4917-420d-866d-cb67af8b5cd9';

    function showStep(stepIndex) {
        steps.forEach((step, index) => {
            step.style.display = index === stepIndex ? 'block' : 'none';
        });
        updateProgress();
        updateButtons();
    }

    function updateProgress() {
        progress.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    }

    function updateButtons() {
        prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < steps.length - 2 ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === steps.length - 2 ? 'inline-block' : 'none';
    }

    function handleOptionClick(e) {
        const stepId = steps[currentStep].id;
        const value = e.target.dataset.value;

        if (stepId === 'step2') {
            const isGameCard = e.target.classList.contains('option-card');
            if (isGameCard) {
                e.target.classList.toggle('selected');
                const index = answers.step2.games.indexOf(value);
                if (index > -1) {
                    answers.step2.games.splice(index, 1);
                } else {
                    answers.step2.games.push(value);
                }
            } else {
                // It's a resolution option
                const options = steps[currentStep].querySelectorAll('.option');
                options.forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                answers.step2.resolution = value;
            }
        } else {
            const options = steps[currentStep].querySelectorAll('.option');
            options.forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
            answers[stepId] = value;
        }
    }

    steps.forEach(step => {
        const options = step.querySelectorAll('.option, .option-card');
        options.forEach(option => {
            option.addEventListener('click', handleOptionClick);
        });
    });

    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep(currentStep);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    submitBtn.addEventListener('click', () => {
        quizContainer.style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'block';

        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(answers),
        })
        .then(response => response.json())
        .then(data => {
            loader.style.display = 'none';
            displayResults(data.recommendations);
        })
        .catch((error) => {
            console.error('Error:', error);
            loader.style.display = 'none';
            resultsGrid.innerHTML = '<p style="text-align: center; color: white;">Sorry, something went wrong. Please try again later.</p>';
        });
    });

    function displayResults(recommendations) {
        resultsGrid.innerHTML = '';
        recommendations.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <img src="${pc.imageUrl}" alt="${pc.name}">
                <div class="result-card-content">
                    <h3>${pc.name}</h3>
                    <p class="price">${pc.price}</p>
                    <div class="details">
                        <p><strong>Graphics:</strong> ${pc.details.graphics}</p>
                        <p><strong>Processor:</strong> ${pc.details.processor}</p>
                        <p><strong>RAM:</strong> ${pc.details.ram}</p>
                        <p><strong>Storage:</strong> ${pc.details.storage}</p>
                        <p><strong>Style:</strong> ${pc.details.style}</p>
                        <p><strong>Key Specs:</strong> ${pc.details.keySpecs}</p>
                    </div>
                    <a href="${pc.productUrl}" target="_blank" class="buy-button">View Product</a>
                </div>
            `;
            resultsGrid.appendChild(card);
        });
    }

    showStep(currentStep);
});
