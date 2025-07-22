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

    // New elements for email modal and new results sections
    const emailModal = document.getElementById('emailModal');
    const waitBtn = document.getElementById('waitBtn');
    const emailInput = document.getElementById('emailInput');
    const emailBtn = document.getElementById('emailBtn');
    const customBuildContainer = document.querySelector('.custom-build-content');
    const readyToShipContainer = document.querySelector('.ready-to-ship-content');


    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook/e1ca7516-d833-4faa-9aeb-85f3b7deaf93';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};
    let currentStepOrder = ['primaryUse'];

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

        // Use a Set to automatically handle duplicates
        const uniqueConditionalSteps = [...new Set(conditionalSteps)];
        
        const commonSteps = ['caseSize', 'budget'];
        
        // The new pcType question should come after primaryUse
        let baseOrder = ['primaryUse', 'pcType', ...uniqueConditionalSteps];

        // If user selects "Desktop", then ask about case size.
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

        // The 'games' step is optional. For all other steps, an answer is required.
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

        // Handle resolution switch buttons
        if (e.target.classList.contains('switch-res-button')) {
            e.stopPropagation(); // prevent card selection
            const newResolution = e.target.dataset.res;
            switchResolution(newResolution);
            // After switching, we should also select the budget card that was clicked
            selectCard(card);
            return;
        }

        // Handle the new "change budget" button
        if (e.target.classList.contains('change-budget-button')) {
            e.stopPropagation();
            card.classList.remove('expanded');
            // Also deselect the card if it was selected
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

    function switchResolution(newResolution) {
        // Update the answer
        answers.resolution = [newResolution];

        // Update the visual selection on the resolution step
        const resolutionStep = document.querySelector('.step[data-step-id="resolution"]');
        const allResolutionCards = resolutionStep.querySelectorAll('.option-card');
        allResolutionCards.forEach(c => c.classList.remove('selected'));
        
        const newCard = resolutionStep.querySelector(`.option-card[data-value="${newResolution}"]`);
        if (newCard) {
            newCard.classList.add('selected');
        }

        // Update the budget options
        updateBudgetOptions();
        updateButtons(); // Re-check button states
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
            // Here you would typically send the email. For now, we'll just log it.
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
            "Almost there...",
            "Debating whether pineapple belongs on pizza...",
            "Teaching the hamsters to code faster...",
            "Reticulating splines...",
            "Asking the magic 8-ball for advice...",
            "Warming up the AI...",
            "Don't worry, the loading bar is moving... probably.",
            "Generating witty loading messages...",
            "I'm not slow, I'm just enjoying the moment.",
            "Are we there yet?",
            "Just a few more moments of suspense..."
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
                resultsGrid.style.display = 'block'; // Changed to block
                try {
                    let parsedData;
                    // Check if recommendationData is an object and has an 'output' property
                    if (typeof recommendationData === 'object' && recommendationData !== null && 'output' in recommendationData) {
                        // If output is a string, try to parse it. It might be stringified JSON.
                        if (typeof recommendationData.output === 'string') {
                            try {
                                // First, try to parse it as-is
                                parsedData = JSON.parse(recommendationData.output);
                            } catch (e) {
                                // If that fails, it might be the old format with backticks
                                const jsonString = recommendationData.output.replace(/```json\n|```/g, '');
                                parsedData = JSON.parse(jsonString);
                            }
                        } else {
                            // If output is not a string, assume it's already a valid object
                            parsedData = recommendationData.output;
                        }
                    } else {
                        // If it's not the expected object structure, assume the whole thing is the data
                        parsedData = recommendationData;
                    }
        
                    // After parsing, we expect parsedData to have a 'recommendations' property
                    if (parsedData && parsedData.recommendations) {
                        displayResults(parsedData.recommendations);
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

    function displayResults(recommendations) {
        customBuildContainer.innerHTML = '';
        readyToShipContainer.innerHTML = '';

        const validRecommendations = recommendations.filter(rec => rec && rec.price && rec.name && rec.type);

        if (!validRecommendations || validRecommendations.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't find any matches. Please try again.</p>`;
            return;
        }

        const customPcs = validRecommendations.filter(pc => pc.type === 'Custom');
        const rtsPcs = validRecommendations.filter(pc => pc.type === 'RTS');

        if (customPcs.length > 0) {
            customPcs.forEach(pc => {
                const card = createResultCard(pc);
                if (pc.recommendationLevel === 'Our Top Recommendation') {
                    card.classList.add('top-choice');
                }
                customBuildContainer.appendChild(card);
            });
        } else {
            customBuildContainer.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't generate a custom build for your needs.</p>`;
        }

        if (rtsPcs.length > 0) {
            rtsPcs.forEach(pc => {
                const card = createResultCard(pc);
                 if (pc.recommendationLevel === 'Better') { // Assuming 'Better' is the top choice for RTS
                    card.classList.add('top-choice');
                }
                readyToShipContainer.appendChild(card);
            });
        } else {
            readyToShipContainer.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, no Ready to Ship models match your criteria.</p>`;
        }
    }

    function createResultCard(pc) {
        const card = document.createElement('div');
        card.className = 'result-card';

        const badgeHTML = `<div class="recommendation-badge">${pc.recommendationLevel}</div>`;
        const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
        const productUrl = `https://aftershockpc.com.au/products/${pc.productUrl}`;

        const detailsHTML = Object.entries(pc.details).map(([key, value]) => {
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
            return `<p><strong>${formattedKey}:</strong> ${value}</p>`;
        }).join('');

        const reasonHTML = pc.reason ? `
            <div class="reason-container">
                <i class="fas fa-question-circle reason-icon"></i>
                <div class="reason-modal">
                    <div class="reason-modal-content">
                        <span class="close-reason">&times;</span>
                        <h4>Why this PC?</h4>
                        <p>${pc.reason}</p>
                    </div>
                </div>
            </div>
        ` : '';

        card.innerHTML = `
            <a href="${productUrl}" target="_blank" class="result-image-link">
                <img src="${pc.imageUrl}" alt="${pc.name}">
            </a>
            <div class="result-card-content">
                ${badgeHTML}
                <div class="title-container">
                    <h3>${pc.name}</h3>
                    ${reasonHTML}
                </div>
                <div class="price-container">
                    <p class="price">${pc.price}</p>
                    ${strikethroughHTML}
                </div>
                <div class="details">
                    ${detailsHTML}
                </div>
                <a href="${productUrl}" target="_blank" class="view-product-button">View Product</a>
            </div>
        `;
        return card;
    }

    resultsGrid.addEventListener('click', e => {
        if (e.target.classList.contains('reason-icon')) {
            const modal = e.target.nextElementSibling;
            modal.style.display = 'block';
        }
        if (e.target.classList.contains('close-reason')) {
            const modal = e.target.closest('.reason-modal');
            modal.style.display = 'none';
        }
    });

    // Initial setup
    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
});
