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

    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook/e9308373-ef43-4ced-89e3-330dd4a6c25d';

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
        
        quizContainer.style.display = 'none';
        document.querySelector('.navigation').style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'flex';
        resultsGrid.style.display = 'none';

const loadingMessages = [
  // Phase 1: Serious Tech Vibes (0–10s)
  "Analyzing your choices...",
  "Consulting the tech gurus...",
  "Comparing components...",
  "Calculating performance metrics...",
  "Assembling virtual parts...",
  "Cross-referencing our database...",
  "Running benchmarks...",
  "Finding the perfect match...",
  "Polishing the recommendations...",
  "Generating witty responses...",
  "Taking a quick break from logic...",
  "Whispering sweet specs to your future rig...",
  "Downloading more frames...",
  "Checking if RGB adds FPS... (it does)",
  "Clearing BIOS cobwebs...",
  "Waiting for textures to load like it’s Skyrim...",
  "Checking if your PC can run Crysis...",
  "Overclocking our enthusiasm...",
  "Installing more RAM… through sheer willpower.",
  "Ctrl+Z-ing any bad decisions...",
  "Running on gamer fuel and broken promises...",
  "Teaching the PSU not to panic...",
  "No scopes detected — adding one...",
  "Casting Detect Bottleneck...",
  "Buffing your FPS stats...",
  "Applying duct tape for extra FPS...",
  "Rendering your dream rig in 4D...",
  "Fetching RGB from the cloud...",
  "Consulting with the cable management gods...",
  "Unleashing the GPU gremlins...",
  "Spinning up extra fans for speed...",
  "Debugging reality...",
  "Sweeping dust out of the digital case...",
  "Calibrating gamer senses...",
  "Convincing the CPU to cooperate...",
  "Petting our emotional support SSD...",
  "Checking stock... emotionally.",
  "Building your setup pixel by pixel...",
  "Assembling the perfect thermal paste swirl...",
  "Installing RGB... everywhere...",
  "Tuning frame rates to perfection...",
  "Applying thermal paste with ancient rituals..."
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
                resultsGrid.style.display = 'grid';
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
    });

    let recommendations = []; // Global store for recommendations

    function displayResults(recs) {
        recommendations = recs.filter(rec => rec && rec.price && rec.name);
        const mobileResultsContainer = document.getElementById('mobile-results-container');

        if (!recommendations || recommendations.length === 0) {
            resultsContainer.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't find any matches. Please try again.</p>`;
            return;
        }

        if (window.innerWidth <= 767) {
            resultsGrid.style.display = 'none';
            mobileResultsContainer.style.display = 'block';
            displayMobileSingleView();
        } else {
            mobileResultsContainer.style.display = 'none';
            resultsGrid.style.display = 'grid';
            displayDesktopGrid();
        }
    }

    function displayDesktopGrid() {
        resultsGrid.innerHTML = '';
        const pcsToDisplay = getPcsToDisplay();

        pcsToDisplay.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            if (pc.recommendationLevel === 'Our Top Recommendation') card.classList.add('top-choice');
            else if (pc.recommendationLevel === 'The Best Value') card.classList.add('best-value');
            else if (pc.recommendationLevel === 'The Next Level Up') card.classList.add('level-up');

            const badgeHTML = `<div class="recommendation-badge">${pc.recommendationLevel}</div>`;
            const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
            const productUrl = `https://aftershockpc.com.au/products/${pc.productUrl}`;
            const detailsHTML = Object.entries(pc.details).map(([key, value]) => `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`).join('');
            
            card.innerHTML = `
                <a href="${productUrl}" target="_blank" class="result-image-link"><img src="${pc.imageUrl}" alt="${pc.name}"></a>
                <div class="result-card-content">
                    ${badgeHTML}
                    <div class="title-container"><h3>${pc.name}</h3></div>
                    <div class="price-container"><p class="price">${pc.price}</p>${strikethroughHTML}</div>
                    <a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Buy Now</a>
                    <div class="details">${detailsHTML}</div>
                    <a href="${productUrl}" target="_blank" class="view-product-button">View Product</a>
                </div>`;
            resultsGrid.appendChild(card);
        });
    }

    function displayMobileSingleView() {
        const pillsContainer = document.getElementById('mobile-recommendation-pills');
        pillsContainer.innerHTML = ''; // Clear previous pills

        const order = ['The Best Value', 'Our Top Recommendation', 'The Next Level Up'];
        const sortedPcs = recommendations.sort((a, b) => order.indexOf(a.recommendationLevel) - order.indexOf(b.recommendationLevel));
        
        let initialIndex = sortedPcs.findIndex(p => p.recommendationLevel === 'Our Top Recommendation');
        if (initialIndex === -1) initialIndex = 0;

        sortedPcs.forEach((pc, index) => {
            const pill = document.createElement('button');
            pill.className = 'mobile-pill';
            pill.textContent = pc.recommendationLevel;
            pill.dataset.index = index;
            if (index === initialIndex) {
                pill.classList.add('active');
            }
            pillsContainer.appendChild(pill);
        });

        updateMobileView(sortedPcs[initialIndex]);

        pillsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-pill')) {
                const index = e.target.dataset.index;
                updateMobileView(sortedPcs[index]);

                pillsContainer.querySelectorAll('.mobile-pill').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    function updateMobileView(pc) {
        if (!pc) return;
        const productUrl = `https://aftershockpc.com.au/products/${pc.productUrl}`;
        document.getElementById('mobile-product-title').textContent = pc.name;
        const priceTag = document.querySelector('.mobile-price-tag');
        priceTag.innerHTML = pc.strikethroughPrice
            ? `From ${pc.price} <span class="strikethrough-price">${pc.strikethroughPrice}</span>`
            : `From ${pc.price}`;
        document.getElementById('mobile-buy-button').href = productUrl;
        document.getElementById('mobile-product-image').src = pc.imageUrl;
        
        const specsContainer = document.getElementById('mobile-product-specs');
        specsContainer.innerHTML = `<h3>Specifications</h3>` + Object.entries(pc.details).map(([key, value]) => 
            `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
        ).join('') + `<a href="${productUrl}" target="_blank" class="view-product-button-mobile">View Product</a>`;
    }

    function getPcsToDisplay() {
        const sortedPcs = recommendations.sort((a, b) => parseFloat(a.price.replace(/[^0-9.-]+/g,"")) - parseFloat(b.price.replace(/[^0-9.-]+/g,"")));
        
        let pcs = [];
        if (sortedPcs.length > 0) pcs.push({ ...sortedPcs[0], recommendationLevel: 'The Best Value' });
        if (sortedPcs.length > 1) pcs.push({ ...sortedPcs[1], recommendationLevel: 'Our Top Recommendation' });
        if (sortedPcs.length > 2) pcs.push({ ...sortedPcs[2], recommendationLevel: 'The Next Level Up' });
        
        return pcs;
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only redraw if recommendations have been loaded
            if (recommendations.length > 0) {
                displayResults(recommendations);
            }
        }, 250);
    });

    // Initial setup
    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
});
