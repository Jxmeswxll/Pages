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
    const refreshGamesBtn = document.getElementById('refreshGamesBtn');

    // New elements for email modal and new results sections
    const emailModal = document.getElementById('emailModal');
    const waitBtn = document.getElementById('waitBtn');
    const emailInput = document.getElementById('emailInput');
    const emailBtn = document.getElementById('emailBtn');
    
    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook-test/e1ca7516-d833-4faa-9aeb-85f3b7deaf93';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};
    let currentStepOrder = ['primaryUse'];
    let recommendations = [];

    const allSteps = Array.from(document.querySelectorAll('.step'));

    function determineStepOrder() {
        const primaryUse = answers.primaryUse || [];
        let conditionalSteps = [];

        if (primaryUse.includes('Gaming')) {
            conditionalSteps.push('games', 'resolution');
        }
        if (primaryUse.includes('Work')) {
            conditionalSteps.push('work');
        }
        if (primaryUse.includes('Study')) {
            conditionalSteps.push('study');
        }
        if (primaryUse.includes('Essentials')) {
            conditionalSteps.push('essentials');
        }

        const uniqueConditionalSteps = [...new Set(conditionalSteps)];
        
        const commonSteps = ['caseSize', 'budget'];
        
        let baseOrder = ['primaryUse', 'pcType', ...uniqueConditionalSteps];

        if (answers.pcType && answers.pcType[0] === 'Desktop') {
            baseOrder.push('caseSize');
        }
        
        baseOrder.push('budget');
        currentStepOrder = baseOrder;
    }

    function showStep(stepId) {
        allSteps.forEach(step => {
            step.style.display = 'none';
        });

        const nextStepElement = allSteps.find(step => step.dataset.stepId === stepId);
        if (nextStepElement) {
            nextStepElement.style.display = 'block';
        }

        if (stepId === 'budget') {
            updateBudgetOptions();
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

        if (currentStepId !== 'games') {
            let answered = false;
            questions.forEach(q => {
                const questionId = q.dataset.questionId;
                if (answers[questionId] && answers[questionId].length > 0) {
                    answered = true;
                }
            });
            allRequiredAnswered = answered;
        }

        questions.forEach(q => {
            const questionId = q.dataset.questionId;
            if (q.dataset.selectType === 'multiple' && answers[questionId] && answers[questionId].length > 0) {
                isMultipleSelect = true;
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

        if (e.target.classList.contains('switch-res-button')) {
            e.stopPropagation();
            const newResolution = e.target.dataset.res;
            switchResolution(newResolution);
            selectCard(card);
            return;
        }

        if (e.target.classList.contains('change-budget-button')) {
            e.stopPropagation();
            card.classList.remove('expanded');
            const questionId = card.closest('.options-grid').dataset.questionId;
            const value = card.dataset.value;
            if (answers[questionId]) {
                const index = answers[questionId].indexOf(value);
                if (index > -1) {
                    answers[questionId].splice(index, 1);
                }
            }
            card.classList.remove('selected');
            updateButtons();
            return;
        }

        if (card.classList.contains('requires-attention') && !card.classList.contains('expanded')) {
            card.classList.add('expanded');
            return;
        }

        selectCard(card);
    });

    function selectCard(card) {
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
            const allGridsForQuestion = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
            allGridsForQuestion.forEach(grid => {
                grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            });
            answers[questionId] = isSelected ? [] : [value];
            if (!isSelected) card.classList.add('selected');
        } else {
            const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
            if (exclusiveGrid) {
                exclusiveGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
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
        
        if (questionId === 'primaryUse' || questionId === 'pcType' || questionId === 'resolution') {
            determineStepOrder();
        }
        
        updateButtons();
    }

    function updateBudgetOptions() {
        const resolution = answers.resolution ? answers.resolution[0] : null;
        const budgetStep = document.querySelector('.step[data-step-id="budget"]');
        const budgetCardToModify = budgetStep.querySelector('.option-card[data-value="1500-2500"]');

        if (budgetCardToModify) {
            if (resolution === '4K') {
                budgetCardToModify.classList.add('requires-attention');
            } else {
                budgetCardToModify.classList.remove('requires-attention');
                budgetCardToModify.classList.remove('expanded');
            }
        }
    }

    if(refreshGamesBtn) {
        refreshGamesBtn.addEventListener('click', () => {
            const gameCards = document.querySelectorAll('.game-cards .option-card');
            gameCards.forEach(card => card.classList.remove('selected'));
            answers.games = [];
            updateButtons();
        });
    }

    function switchResolution(newResolution) {
        answers.resolution = [newResolution];
        const resolutionStep = document.querySelector('.step[data-step-id="resolution"]');
        const allResolutionCards = resolutionStep.querySelectorAll('.option-card');
        allResolutionCards.forEach(c => c.classList.remove('selected'));
        
        const newCard = resolutionStep.querySelector(`.option-card[data-value="${newResolution}"]`);
        if (newCard) {
            newCard.classList.add('selected');
        }
        updateBudgetOptions();
        updateButtons();
    }

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
            showStep(currentStepOrder[prevStepIndex]);
        }
    });

    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled) return;
        answers.budget = answers.budget.map(b => b === '2501-4500' ? '2500-4500' : b);
        emailModal.style.display = 'block';
    });

    waitBtn.addEventListener('click', () => {
        emailModal.style.display = 'none';
        initiateSubmission();
    });

    emailBtn.addEventListener('click', () => {
        const email = emailInput.value;
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailModal.style.display = 'none';
            initiateSubmission(email);
        } else {
            alert('Please enter a valid email address.');
        }
    });

    function initiateSubmission(email = null) {
        if (email) {
            answers.email = email;
            console.log(`Emailing results to: ${email}`, answers);
            quizContainer.style.display = 'none';
            document.querySelector('.navigation').style.display = 'none';
            resultsContainer.innerHTML = `<h2>Thank You!</h2><p>Your personalized PC recommendations have been sent to ${email}.</p>`;
            resultsContainer.style.display = 'block';
            return;
        }
        
        quizContainer.style.display = 'none';
        document.querySelector('.navigation').style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'flex';
        resultsGrid.style.display = 'none';

        const loadingMessages = [
            "Analyzing your choices...",
            "Consulting the tech gurus...",
            "Comparing components...",
            "Calculating performance metrics...",
            "Assembling virtual parts...",
            "Cross-referencing our database...",
            "Running benchmarks...",
            "Finding the perfect match...",
            "Polishing the recommendations...",
            "Almost there..."
        ];
        const loaderMessage = document.getElementById('loader-message');
        let messageIndex = 0;

        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            loaderMessage.textContent = loadingMessages[messageIndex];
        }, 1500);

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showFinalResults(data);
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            loaderMessage.textContent = "Sorry, something went wrong. Please try again later.";
            clearInterval(messageInterval);
        });

        function showFinalResults(recommendationData) {
            clearInterval(messageInterval);
        
            setTimeout(() => {
                loader.style.display = 'none';
                resultsGrid.style.display = 'block';
                try {
                    let dataToParse = recommendationData;
                    if (Array.isArray(recommendationData) && recommendationData.length > 0) {
                        dataToParse = recommendationData[0];
                    }
        
                    let parsedData;
                    if (typeof dataToParse === 'object' && dataToParse !== null && 'output' in dataToParse) {
                        if (typeof dataToParse.output === 'string') {
                            const jsonString = dataToParse.output.replace(/```json\n|```/g, '');
                            parsedData = JSON.parse(jsonString);
                        } else {
                            parsedData = dataToParse.output;
                        }
                    } else {
                        parsedData = dataToParse;
                    }
        
                    if (parsedData && parsedData.recommendations) {
                        recommendations = parsedData.recommendations;
                        displayResults();
                    } else {
                        throw new Error("Parsed data does not contain 'recommendations' array.");
                    }
        
                } catch (e) {
                    console.error("Error processing recommendation data:", e, recommendationData);
                    resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't process the recommendations. The format of the data we received was unexpected. Please try again later.</p>`;
                }
            }, 500);
        }
    }

    function displayResults() {
        const pillsContainer = document.getElementById('recommendation-pills');
        pillsContainer.innerHTML = '';

        if (!recommendations || recommendations.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't find any matches for your request. Please try adjusting your selections.</p>`;
            return;
        }

        recommendations.forEach((rec, index) => {
            const pill = document.createElement('div');
            pill.className = 'recommendation-pill';
            pill.textContent = rec.recommendationLevel;
            pill.dataset.index = index;
            if (index === 0) {
                pill.classList.add('active');
            }
            pillsContainer.appendChild(pill);
        });

        updateProductView(0);
    }

    function updateProductView(index) {
        const pc = recommendations[index];

        document.getElementById('product-title').textContent = pc.name;
        document.getElementById('product-price').textContent = pc.price;
        const strikethroughPrice = document.getElementById('product-strikethrough-price');
        if (pc.strikethroughPrice) {
            strikethroughPrice.textContent = pc.strikethroughPrice;
            strikethroughPrice.style.display = 'block';
        } else {
            strikethroughPrice.style.display = 'none';
        }
        document.getElementById('buy-button').href = `https://aftershockpc.com.au/products/${pc.productUrl}`;
        document.getElementById('product-image').src = pc.imageUrl;

        const specsContainer = document.getElementById('product-specs');
        specsContainer.innerHTML = '';
        if (pc.details) {
            Object.entries(pc.details).forEach(([key, value]) => {
                const specItem = document.createElement('div');
                specItem.className = 'spec-item';
                
                let iconClass = 'fa-microchip'; // default icon
                if (key.toLowerCase().includes('graphic')) iconClass = 'fa-gamepad';
                if (key.toLowerCase().includes('processor')) iconClass = 'fa-microchip';
                if (key.toLowerCase().includes('ram')) iconClass = 'fa-memory';
                if (key.toLowerCase().includes('storage')) iconClass = 'fa-hdd';
                if (key.toLowerCase().includes('style')) iconClass = 'fa-palette';

                specItem.innerHTML = `
                    <i class="fas ${iconClass}"></i>
                    <div>
                        <strong>${key.charAt(0).toUpperCase() + key.slice(1)}</strong>
                        <p>${value}</p>
                    </div>
                `;
                specsContainer.appendChild(specItem);
            });
        }
    }

    document.getElementById('recommendation-pills').addEventListener('click', (e) => {
        if (e.target.classList.contains('recommendation-pill')) {
            const index = e.target.dataset.index;
            document.querySelectorAll('.recommendation-pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            updateProductView(index);
        }
    });

    // Initial setup
    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
});
