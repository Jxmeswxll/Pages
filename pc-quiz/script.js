document.addEventListener('DOMContentLoaded', () => {
    const quiz = document.getElementById('quiz');
    const quizWrapper = document.querySelector('.quiz-wrapper');
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
        
        if (primaryUse.includes('Gaming')) conditionalSteps.push('games', 'resolution', 'style');
        if (primaryUse.includes('Work')) conditionalSteps.push('work');
        if (primaryUse.includes('Study')) conditionalSteps.push('study');
        if (primaryUse.includes('Essentials')) conditionalSteps.push('essentials');
        
        const commonSteps = ['caseSize', 'peripherals', 'budget'];
        
        const uniqueConditionalSteps = [...new Set(conditionalSteps)];
        
        currentStepOrder = ['primaryUse', ...uniqueConditionalSteps, ...commonSteps];
    }

    function showStep(stepId) {
        allSteps.forEach(step => {
            step.style.display = 'none';
        });

        const nextStepElement = allSteps.find(step => step.dataset.stepId === stepId);
        if (nextStepElement) {
            nextStepElement.style.display = 'block';
        }

        currentStepIndex = currentStepOrder.indexOf(stepId);
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
        let isMultipleSelect = false;

        questions.forEach(q => {
            const questionId = q.dataset.questionId;
            if (q.dataset.selectType === 'multiple' && answers[questionId] && answers[questionId].length > 0) {
                isMultipleSelect = true;
            }
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

        if (isMultipleSelect && allRequiredAnswered) {
            nextBtn.innerHTML = 'OK';
        } else {
            nextBtn.innerHTML = 'Next';
        }
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

        const isExclusive = selectType === 'single-exclusive';
        const isSingle = selectType === 'single';

        if (isExclusive) {
            const isSelected = card.classList.contains('selected');
            // Deselect all cards in the same question group across grids
            const allGridsForQuestion = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
            allGridsForQuestion.forEach(grid => {
                grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            });
            answers[questionId] = isSelected ? [] : [value];
            if (!isSelected) card.classList.add('selected');
        } else {
            // Deselect any exclusive options if a regular one is picked
            const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
            if (exclusiveGrid) {
                exclusiveGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                // Also clear the exclusive answer from the answers object
                if (answers[questionId].includes(exclusiveGrid.querySelector('.option-card').dataset.value)) {
                    answers[questionId] = [];
                }
            }

            if (isSingle) {
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
        if (nextBtn.disabled) return;
        stepHistory.push(currentStepIndex);
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < currentStepOrder.length) {
            showStep(currentStepOrder[nextStepIndex]);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (stepHistory.length > 0) {
            const prevStepIndex = stepHistory.pop();
            showStep(currentStepOrder[prevStepIndex], true);
        }
    });

    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled) return;
        
        quizWrapper.style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'block';
        resultsGrid.style.display = 'none';

        let fetchCompleted = false;
        let animationCompleted = false;
        let recommendationData;

        const loadingMessages = [
            "Analyzing your choices...",
            "Comparing components...",
            "Calculating performance metrics...",
            "Cross-referencing our database...",
            "Finding the perfect match...",
            "Almost there..."
        ];
        const loaderMessage = document.getElementById('loader-message');
        const loaderProgress = document.getElementById('loader-progress');
        let messageIndex = 0;

        const messageInterval = setInterval(() => {
            messageIndex++;
            if (messageIndex < loadingMessages.length) {
                loaderMessage.textContent = loadingMessages[messageIndex];
            }
        }, 8000);

        loaderProgress.style.transition = 'width 48s linear';
        setTimeout(() => {
            loaderProgress.style.width = '95%';
        }, 100);

        const fetchPromise = fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers),
        })
        .then(response => response.json())
        .then(data => {
            fetchCompleted = true;
            recommendationData = data;
            if (animationCompleted) {
                showFinalResults();
            }
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            loaderMessage.textContent = "Sorry, something went wrong. Please try again later.";
            clearInterval(messageInterval);
        });

        setTimeout(() => {
            animationCompleted = true;
            if (fetchCompleted) {
                showFinalResults();
            }
        }, 49000);

        function showFinalResults() {
            clearInterval(messageInterval);
            loaderProgress.style.transition = 'width 0.5s ease-out';
            loaderProgress.style.width = '100%';
            
            setTimeout(() => {
                loader.style.display = 'none';
                resultsGrid.style.display = 'flex';
                const jsonString = recommendationData.output.replace(/```json\n|```/g, '');
                const parsedData = JSON.parse(jsonString);
                displayResults(parsedData.recommendations);
            }, 500);
        }
    });

    function displayResults(recommendations) {
        resultsGrid.innerHTML = '';
        if (!recommendations || recommendations.length < 3) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't find enough matches. Please try again.</p>`;
            return;
        }

        const sortedPcs = recommendations.sort((a, b) => {
            const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g,""));
            const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g,""));
            return priceA - priceB;
        });

        const [levelDown, topChoice, levelUp] = sortedPcs;

        const pcsToDisplay = [
            { ...levelDown, recommendationLevel: 'The Best Value' },
            { ...topChoice, recommendationLevel: 'Our Top Recommendation' },
            { ...levelUp, recommendationLevel: 'The Next Level Up' }
        ];

        pcsToDisplay.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            if (pc.recommendationLevel === 'Our Top Recommendation') {
                card.classList.add('top-choice');
            }

            const badgeHTML = `<div class="recommendation-badge">${pc.recommendationLevel}</div>`;
            const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
            const productUrl = `https://aftershockpc.com.au/products/${pc.productUrl}`;

            card.innerHTML = `
                <img src="${pc.imageUrl}" alt="${pc.name}">
                <div class="result-card-content">
                    ${badgeHTML}
                    <h3>${pc.name}</h3>
                    <div class="price-container">
                        <p class="price">${pc.price}</p>
                        ${strikethroughHTML}
                    </div>
                    <div class="details">
                        <p><strong>Graphics:</strong> ${pc.details.graphics}</p>
                        <p><strong>Processor:</strong> ${pc.details.processor}</p>
                        <p><strong>RAM:</strong> ${pc.details.ram}</p>
                        <p><strong>Storage:</strong> ${pc.details.storage}</p>
                    </div>
                    <a href="${productUrl}" target="_blank" class="buy-button">View Product</a>
                </div>
            `;
            resultsGrid.appendChild(card);
        });
    }

    // Initial setup
    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
});
