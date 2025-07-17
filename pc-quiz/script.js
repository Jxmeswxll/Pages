document.addEventListener('DOMContentLoaded', () => {
    const quiz = document.getElementById('quiz');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    const resultsGrid = document.getElementById('results');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progress = document.getElementById('progress');

    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook-test/b4adc638-4917-420d-866d-cb67af8b5cd9';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};

    const steps = Array.from(document.querySelectorAll('.step'));
    const stepOrder = ['primaryUse'];

    function getNextSteps() {
        const primaryUseAnswers = answers.primaryUse || [];
        const conditionalSteps = [];
        if (primaryUseAnswers.includes('Essentials')) conditionalSteps.push('essentials');
        if (primaryUseAnswers.includes('Work')) conditionalSteps.push('work');
        if (primaryUseAnswers.includes('Education')) conditionalSteps.push('education');
        if (primaryUseAnswers.includes('Creative')) conditionalSteps.push('creative');

        const commonSteps = ['usageLocation', 'peripherals', 'budget'];

        // If no primary use is selected, just show common steps after the first question
        if(conditionalSteps.length === 0 && primaryUseAnswers.length > 0) {
             return ['primaryUse', ...commonSteps];
        }
        
        return ['primaryUse', ...conditionalSteps, ...commonSteps];
    }

    function showStep(stepId) {
        steps.forEach(step => {
            step.style.display = step.dataset.stepId === stepId ? 'block' : 'none';
        });
        updateProgress();
        updateButtons();
    }

    function updateProgress() {
        const totalSteps = getNextSteps().length;
        progress.style.width = `${((currentStepIndex + 1) / totalSteps) * 100}%`;
    }

    function updateButtons() {
        const currentStepId = getNextSteps()[currentStepIndex];
        const currentStepElement = document.querySelector(`.step[data-step-id="${currentStepId}"]`);
        const questionId = currentStepElement.querySelector('.options-grid').dataset.questionId;
        const selectedOptions = answers[questionId] && answers[questionId].length > 0;

        nextBtn.style.display = currentStepIndex < getNextSteps().length - 1 ? 'inline-block' : 'none';
        submitBtn.style.display = currentStepIndex === getNextSteps().length - 1 ? 'inline-block' : 'none';
        prevBtn.style.display = currentStepIndex > 0 ? 'inline-block' : 'none';
        
        nextBtn.disabled = !selectedOptions;
        submitBtn.disabled = !selectedOptions;
    }

    quiz.addEventListener('click', (e) => {
        const card = e.target.closest('.option-card');
        if (!card) return;

        const optionsGrid = card.parentElement;
        const questionId = optionsGrid.dataset.questionId;
        const selectType = optionsGrid.dataset.selectType;
        const value = card.dataset.value;

        if (!answers[questionId]) {
            answers[questionId] = [];
        }

        if (selectType === 'single') {
            answers[questionId] = [value];
            optionsGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        } else { // multiple
            const index = answers[questionId].indexOf(value);
            if (index > -1) {
                answers[questionId].splice(index, 1);
                card.classList.remove('selected');
            } else {
                answers[questionId].push(value);
                card.classList.add('selected');
            }
        }
        updateButtons();
    });

    nextBtn.addEventListener('click', () => {
        stepHistory.push(currentStepIndex);
        currentStepIndex++;
        const nextStepId = getNextSteps()[currentStepIndex];
        showStep(nextStepId);
    });

    prevBtn.addEventListener('click', () => {
        currentStepIndex = stepHistory.pop();
        const prevStepId = getNextSteps()[currentStepIndex];
        showStep(prevStepId);
    });

    submitBtn.addEventListener('click', () => {
        document.querySelector('.quiz-container').style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'block';

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers),
        })
        .then(response => response.json())
        .then(data => {
            loader.style.display = 'none';
            const jsonString = data.output.replace(/```json\n|```/g, '');
            const parsedData = JSON.parse(jsonString);
            displayResults(parsedData.recommendations);
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            loader.style.display = 'none';
            resultsGrid.innerHTML = `<p style="text-align: center; color: #1d1d1f;">Sorry, something went wrong. Please try again later.</p>`;
        });
    });

    function displayResults(recommendations) {
        resultsGrid.innerHTML = '';
        if (!recommendations || recommendations.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #1d1d1f;">No recommendations match your criteria.</p>`;
            return;
        }
        recommendations.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <img src="${pc.imageUrl}" alt="${pc.name}">
                <div class="result-card-content">
                    <h3>${pc.name}</h3>
                    <p class="price">${pc.price}</p>
                    <div class="details">
                        <p>${pc.details.graphics}</p>
                        <p>${pc.details.processor}</p>
                        <p>${pc.details.ram}</p>
                        <p>${pc.details.storage}</p>
                    </div>
                    <a href="${pc.productUrl}" target="_blank" class="buy-button">View Product</a>
                </div>
            `;
            resultsGrid.appendChild(card);
        });
    }

    // Initial setup
    showStep(stepOrder[0]);
});
