document.addEventListener('DOMContentLoaded', () => {
    const quiz = document.getElementById('quiz');
    const quizContainer = document.querySelector('.quiz-container');
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
    let currentStepOrder = ['primaryUse'];

    const allSteps = Array.from(document.querySelectorAll('.step'));

    function determineStepOrder() {
        const primaryUse = answers.primaryUse || [];
        let conditionalSteps = [];
        
        if (primaryUse.includes('Gaming')) conditionalSteps.push('gaming', 'style');
        if (primaryUse.includes('Work')) conditionalSteps.push('work');
        if (primaryUse.includes('Study')) conditionalSteps.push('study');
        if (primaryUse.includes('Essentials')) conditionalSteps.push('essentials');
        
        const commonSteps = ['caseSize', 'peripherals', 'budget'];
        
        const uniqueConditionalSteps = [...new Set(conditionalSteps)];
        
        currentStepOrder = ['primaryUse', ...uniqueConditionalSteps, ...commonSteps];
    }

    function showStep(stepId) {
        allSteps.forEach(step => {
            step.style.display = step.dataset.stepId === stepId ? 'block' : 'none';
        });
        updateProgress();
        updateButtons();
    }

    function updateProgress() {
        const totalSteps = currentStepOrder.length;
        const progressPercentage = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;
        progress.style.width = `${progressPercentage}%`;
    }

    function updateButtons() {
        const currentStepId = currentStepOrder[currentStepIndex];
        const currentStepElement = document.querySelector(`.step[data-step-id="${currentStepId}"]`);
        if (!currentStepElement) return;

        const questions = currentStepElement.querySelectorAll('.options-grid');
        let allRequiredAnswered = true;
        
        questions.forEach(q => {
            const questionId = q.dataset.questionId;
            // The 'games' question is optional, so we don't check it for button enablement
            if (questionId !== 'games') {
                if (!answers[questionId] || answers[questionId].length === 0) {
                    allRequiredAnswered = false;
                }
            }
        });

        const isLastStep = currentStepIndex === currentStepOrder.length - 1;

        nextBtn.style.display = !isLastStep ? 'inline-block' : 'none';
        submitBtn.style.display = isLastStep ? 'inline-block' : 'none';
        prevBtn.style.display = currentStepIndex > 0 ? 'inline-block' : 'none';
        
        nextBtn.disabled = !allRequiredAnswered;
        submitBtn.disabled = !allRequiredAnswered;
    }

    quiz.addEventListener('click', (e) => {
        const card = e.target.closest('.option-card');
        if (!card) return;

        const optionsGrid = card.closest('.options-grid');
        const questionId = optionsGrid.dataset.questionId;
        const selectType = optionsGrid.dataset.selectType;
        const value = card.dataset.value;

        if (!answers[questionId]) {
            answers[questionId] = [];
        }

        if (selectType === 'single-exclusive') {
            const isAlreadySelected = card.classList.contains('selected');
            const stepGrids = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
            stepGrids.forEach(grid => {
                grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            });
            answers[questionId] = [];

            if (!isAlreadySelected) {
                card.classList.add('selected');
                answers[questionId].push(value);
            }
        } else {
            const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
            if (exclusiveGrid) {
                exclusiveGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            }

            if (selectType === 'single') {
                optionsGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                answers[questionId] = [value];
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
        }
        
        if (questionId === 'primaryUse') {
            determineStepOrder();
        }
        
        updateButtons();
    });

    nextBtn.addEventListener('click', () => {
        if (currentStepIndex < currentStepOrder.length - 1) {
            stepHistory.push(currentStepIndex);
            currentStepIndex++;
            const nextStepId = currentStepOrder[currentStepIndex];
            showStep(nextStepId);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (stepHistory.length > 0) {
            currentStepIndex = stepHistory.pop();
            const prevStepId = currentStepOrder[currentStepIndex];
            showStep(prevStepId);
        }
    });

    submitBtn.addEventListener('click', () => {
        quizContainer.style.display = 'none';
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
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, something went wrong. Please try again later.</p>`;
        });
    });

    function displayResults(recommendations) {
        resultsGrid.innerHTML = '';
        if (!recommendations || recommendations.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">No recommendations match your criteria.</p>`;
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
    determineStepOrder();
    showStep(currentStepOrder[0]);
});
