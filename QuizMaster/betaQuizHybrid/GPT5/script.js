document.addEventListener('DOMContentLoaded', () => {
const quiz = document.getElementById('quiz');
const quizContainer = document.querySelector('.quiz-container');
const resultsContainer = document.getElementById('results-container');
const loader = document.getElementById('loader');
const resultsGrid = document.getElementById('results');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitBtn = document.getElementById('submitBtn');
const skipBtn = document.getElementById('skipBtn');
const resetBtn = document.getElementById('resetBtn');
const progress = document.getElementById('progress');
const progressLabel = document.getElementById('progressLabel');
const rtsBtn = document.getElementById('rtsBtn');
const customBtn = document.getElementById('customBtn');


const webhookUrl = 'https://jxmes-project.app.n8n.cloud/webhook-test/6838928f-8bf4-4fe3-87f5-3ff30d5b4c37';
const STORAGE_KEY = 'aftershockQuizState_v2';

let currentStepIndex = 0;
let stepHistory = [];
let answers = {};
let currentStepOrder = ['primaryUse'];
let allRecommendations = {};
let currentView = 'RTS';
let messageInterval;

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
    let baseOrder = ['primaryUse', 'pcType', ...uniqueConditionalSteps];

    if (answers.pcType && answers.pcType[0] === 'Desktop') {
        baseOrder.push('caseSize');
    }

    baseOrder.push('budget');
    currentStepOrder = baseOrder;
    updateProgress();
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
    focusHeading(nextStepElement);
}

function focusHeading(stepEl) {
    const h2 = stepEl ? stepEl.querySelector('h2') : null;
    if (h2) {
        // Delay to ensure element is painted before focusing
        setTimeout(() => h2.focus ? h2.focus() : null, 0);
    }
}

function updateProgress() {
    const totalSteps = currentStepOrder.length;
    const progressPercentage = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;
    progress.style.width = `${progressPercentage}%`;
    progressLabel.textContent = `Step ${Math.min(currentStepIndex + 1, totalSteps)} of ${totalSteps}`;
}

function stepIsOptional(stepId) {
    return stepId === 'games'; // Only games is optional in current flow
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
        nextBtn.textContent = 'OK';
    } else {
        nextBtn.textContent = 'Next';
    }

    // Show "Skip" for optional steps
    if (stepIsOptional(currentStepId)) {
        skipBtn.style.display = 'inline-block';
    } else {
        skipBtn.style.display = 'none';
    }
}

// Accessibility: add roles, labels, and keyboard support
function enhanceAccessibility() {
    document.querySelectorAll('.options-grid').forEach(grid => {
        const selectType = grid.dataset.selectType;
        const cards = grid.querySelectorAll('.option-card');
        const questionId = grid.dataset.questionId;
        const groupLabel = (grid.closest('.step')?.querySelector('h2')?.textContent || '').trim();

        // Groups
        if (selectType === 'single' || selectType === 'single-exclusive') {
            grid.setAttribute('role', 'radiogroup');
            if (groupLabel) grid.setAttribute('aria-label', groupLabel);
        } else {
            grid.setAttribute('role', 'group');
            if (groupLabel) grid.setAttribute('aria-label', groupLabel);
        }

        // Cards
        cards.forEach(card => {
            card.setAttribute('tabindex', '0');
            const val = card.dataset.value || 'option';
            const name = card.querySelector('span')?.textContent || val;

            if (selectType === 'single' || selectType === 'single-exclusive') {
                card.setAttribute('role', 'radio');
                card.setAttribute('aria-checked', 'false');
                card.setAttribute('aria-label', name);
            } else {
                card.setAttribute('role', 'checkbox');
                card.setAttribute('aria-checked', 'false');
                card.setAttribute('aria-label', name);
            }
        });
    });
}

function updateAriaForSelection(optionsGrid, questionId) {
    const selectType = optionsGrid.dataset.selectType;
    const values = answers[questionId] || [];
    optionsGrid.querySelectorAll('.option-card').forEach(c => {
        const selected = values.includes(c.dataset.value);
        c.classList.toggle('selected', selected);
        c.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
}

function persistState() {
    try {
        const state = { answers, currentStepOrder, currentStepIndex };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (!state || !state.answers) return;

        answers = state.answers || {};
        determineStepOrder();

        // Re-apply selections visually and ARIA
        Object.entries(answers).forEach(([questionId, vals]) => {
            document.querySelectorAll(`.options-grid[data-question-id="${questionId}"]`).forEach(grid => {
                updateAriaForSelection(grid, questionId);
            });
        });

        const stepIdToShow = currentStepOrder[Math.min(state.currentStepIndex || 0, currentStepOrder.length - 1)];
        if (stepIdToShow) showStep(stepIdToShow);
    } catch (e) {}
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
        card.setAttribute('aria-checked', 'false');
        updateButtons();
        persistState();
        return;
    }

    if (card.classList.contains('requires-attention') && !card.classList.contains('expanded')) {
        card.classList.add('expanded');
        return;
    }

    selectCard(card);
});

// Keyboard support for option cards
quiz.addEventListener('keydown', (e) => {
    const focused = document.activeElement;
    if (!focused || !focused.classList.contains('option-card')) return;

    const optionsGrid = focused.closest('.options-grid');
    if (!optionsGrid) return;

    const cards = Array.from(optionsGrid.querySelectorAll('.option-card'));
    const idx = cards.indexOf(focused);

    // Space/Enter to select
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectCard(focused);
        return;
    }

    // Arrow navigation
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const next = cards[idx + 1] || cards[0];
        next?.focus();
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const prev = cards[idx - 1] || cards[cards.length - 1];
        prev?.focus();
    }
});

function selectCard(card) {
    const optionsGrid = card.closest('.options-grid');
    const questionId = optionsGrid.dataset.questionId;
    const selectType = optionsGrid.dataset.selectType;
    const value = card.dataset.value;

    if (!answers[questionId]) answers[questionId] = [];

    const isExclusive = selectType === 'single-exclusive';
    const isSingle = selectType === 'single';

    if (isExclusive) {
        const isSelected = card.classList.contains('selected');
        const allGridsForQuestion = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
        allGridsForQuestion.forEach(grid => {
            grid.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('selected');
                c.setAttribute('aria-checked', 'false');
            });
        });
        answers[questionId] = isSelected ? [] : [value];
        if (!isSelected) {
            card.classList.add('selected');
            card.setAttribute('aria-checked', 'true');
        }
    } else {
        const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
        if (exclusiveGrid) {
            exclusiveGrid.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('selected');
                c.setAttribute('aria-checked', 'false');
            });
            const exclusiveVal = exclusiveGrid.querySelector('.option-card')?.dataset.value;
            if (exclusiveVal && answers[questionId].includes(exclusiveVal)) {
                answers[questionId] = [];
            }
        }

        if (isSingle) {
            optionsGrid.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('selected');
                c.setAttribute('aria-checked', 'false');
            });
            card.classList.add('selected');
            card.setAttribute('aria-checked', 'true');
            answers[questionId] = [value];
        } else {
            const index = answers[questionId].indexOf(value);
            if (index > -1) {
                answers[questionId].splice(index, 1);
                card.classList.remove('selected');
                card.setAttribute('aria-checked', 'false');
            } else {
                answers[questionId].push(value);
                card.classList.add('selected');
                card.setAttribute('aria-checked', 'true');
            }
        }
    }

    if (questionId === 'primaryUse' || questionId === 'pcType' || questionId === 'resolution') {
        determineStepOrder();
    }

    updateButtons();
    persistState();
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
    answers.resolution = [newResolution];
    const resolutionStep = document.querySelector('.step[data-step-id="resolution"]');
    const allResolutionCards = resolutionStep.querySelectorAll('.option-card');
    allResolutionCards.forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
    });

    const newCard = resolutionStep.querySelector(`.option-card[data-value="${newResolution}"]`);
    if (newCard) {
        newCard.classList.add('selected');
        newCard.setAttribute('aria-checked', 'true');
    }

    updateBudgetOptions();
    updateButtons();
    persistState();
}

nextBtn.addEventListener('click', () => {
    if (nextBtn.disabled) return;
    stepHistory.push(currentStepIndex);
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < currentStepOrder.length) {
        showStep(currentStepOrder[nextStepIndex]);
        persistState();
    }
});

prevBtn.addEventListener('click', () => {
    if (stepHistory.length > 0) {
        const prevStepIndex = stepHistory.pop();
        showStep(currentStepOrder[prevStepIndex]);
        persistState();
    }
});

skipBtn.addEventListener('click', () => {
    // Only used on optional steps
    stepHistory.push(currentStepIndex);
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < currentStepOrder.length) {
        showStep(currentStepOrder[nextStepIndex]);
        persistState();
    }
});

resetBtn.addEventListener('click', () => {
    answers = {};
    stepHistory = [];
    currentStepOrder = ['primaryUse'];
    currentStepIndex = 0;
    localStorage.removeItem(STORAGE_KEY);

    // Clear selections
    document.querySelectorAll('.option-card').forEach(c => {
        c.classList.remove('selected', 'expanded', 'requires-attention');
        c.setAttribute('aria-checked', 'false');
    });

    // Reset UI
    showStep('primaryUse');
    updateButtons();
    document.querySelector('.navigation').style.display = 'flex';
    quizContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    document.querySelector('.results-toggle-buttons').style.display = 'none';
});

submitBtn.addEventListener('click', () => {
    if (submitBtn.disabled) return;

    quizContainer.style.display = 'none';
    document.querySelector('.navigation').style.display = 'none';
    resultsContainer.style.display = 'block';
    loader.style.display = 'flex';
    resultsGrid.style.display = 'none';

    const loadingMessages = [
        "Analyzing your choices...", "Consulting the tech gurus...", "Comparing components...",
        "Calculating performance metrics...", "Assembling virtual parts...", "Cross-referencing our database...",
        "Running benchmarks...", "Finding the perfect match...", "Polishing the recommendations..."
    ];

    const loaderMessage = document.getElementById('loader-message');
    let messageIndex = 0;

    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        loaderMessage.textContent = loadingMessages[messageIndex];
    }, 1500);

    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
});

function showFinalResults(recommendationData) {
    clearInterval(messageInterval);

    setTimeout(() => {
        loader.style.display = 'none';
        const toggles = document.querySelector('.results-toggle-buttons');
        toggles.style.display = 'inline-flex';
        resultsGrid.style.display = 'grid';

        try {
            let parsedData;
            let dataToParse = recommendationData;

            if (Array.isArray(dataToParse) && dataToParse.length > 0) {
                dataToParse = dataToParse[0];
            }

            if (typeof dataToParse === 'object' && dataToParse !== null && 'output' in dataToParse) {
                if (typeof dataToParse.output === 'string') {
                    try {
                        const jsonString = dataToParse.output.replace(/```json\n|```/g, '');
                        parsedData = JSON.parse(jsonString);
                    } catch (e) {
                        console.error("Failed to parse JSON string:", e);
                        console.error("Problematic JSON string:", dataToParse.output);
                        throw new Error("Invalid JSON format in 'output' string.");
                    }
                } else {
                    parsedData = dataToParse.output;
                }
            } else {
                parsedData = dataToParse;
            }

            if (parsedData && parsedData.RTS && parsedData.Custom) {
                allRecommendations = parsedData;
                displayResults();
            } else {
                throw new Error("Parsed data does not contain 'RTS' and 'Custom' arrays.");
            }
        } catch (e) {
            console.error("Error processing recommendation data:", e);
            console.error("Received data:", JSON.stringify(recommendationData, null, 2));
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't process the recommendations. The format of the data we received was unexpected. Please try again later.</p>`;
        }
    }, 400);
}

function displayResults() {
    const recs = allRecommendations[currentView];
    setTabState();

    if (!recs || recs.length === 0) {
        resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, no ${currentView} builds match your criteria. Try the other category!</p>`;
        const mobile = document.getElementById('mobile-results-container');
        mobile.style.display = 'none';
        return;
    }

    if (window.innerWidth <= 767) {
        resultsGrid.style.display = 'none';
        document.getElementById('mobile-results-container').style.display = 'block';
        displayMobileSingleView(recs);
    } else {
        document.getElementById('mobile-results-container').style.display = 'none';
        resultsGrid.style.display = 'grid';
        displayDesktopGrid(recs);
    }
}

function setTabState() {
    if (currentView === 'RTS') {
        rtsBtn.classList.add('active');
        customBtn.classList.remove('active');
        rtsBtn.setAttribute('aria-selected', 'true');
        rtsBtn.setAttribute('tabindex', '0');
        customBtn.setAttribute('aria-selected', 'false');
        customBtn.setAttribute('tabindex', '-1');
    } else {
        customBtn.classList.add('active');
        rtsBtn.classList.remove('active');
        customBtn.setAttribute('aria-selected', 'true');
        customBtn.setAttribute('tabindex', '0');
        rtsBtn.setAttribute('aria-selected', 'false');
        rtsBtn.setAttribute('tabindex', '-1');
    }
}

function displayDesktopGrid(recs) {
    resultsGrid.innerHTML = '';
    recs.forEach(pc => {
        const card = document.createElement('div');
        card.className = 'result-card';
        if (pc.recommendationLevel === 'Our Recommendation') card.classList.add('top-choice');
        else if (pc.recommendationLevel === 'Best Value') card.classList.add('best-value');
        else if (pc.recommendationLevel === 'Level Up') card.classList.add('level-up');

        const badgeHTML = pc.recommendationLevel ? `<div class="recommendation-badge">${pc.recommendationLevel}</div>` : '';
        const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
        const productUrl = pc.productUrl;
        const detailsHTML = pc.details ? Object.entries(pc.details).map(([key, value]) => `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`).join('') : '';

        const priceHTML = currentView === 'RTS' 
            ? `<p class="price">${(pc.price || '').replace('Starting From ', '')}</p>` 
            : `<p class="price">${pc.price || ''}</p>`;

        const buttonText = currentView === 'RTS' ? 'Buy Now' : 'Customise Now';

        card.innerHTML = `
            <a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="result-image-link">
                <img src="${pc.imageUrl}" alt="${pc.name}">
            </a>
            <div class="result-card-content">
                ${badgeHTML}
                <div class="title-container"><h3>${pc.name}</h3></div>
                <div class="price-container">${priceHTML}${strikethroughHTML}</div>
                <a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="buy-now-button-desktop">${buttonText}</a>
                <div class="details">${detailsHTML}</div>
                <a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="view-product-button">View Product</a>
            </div>`;
        resultsGrid.appendChild(card);
    });
}

function displayMobileSingleView(recs) {
    const mobileResultsContainer = document.getElementById('mobile-results-container');
    mobileResultsContainer.innerHTML = `
        <h2 id="mobile-product-title"></h2>
        <div id="mobile-recommendation-pills"></div>
        <div class="mobile-product-view">
            <p class="mobile-price-tag"></p>
            <a href="#" id="mobile-buy-button" class="buy-button" target="_blank" rel="noopener noreferrer">Buy</a>
            <img src="" id="mobile-product-image" alt="Recommended PC">
            <div id="mobile-product-specs" class="mobile-specs-block"></div>
        </div>
    `;

    const pillsContainer = document.getElementById('mobile-recommendation-pills');
    pillsContainer.innerHTML = '';

    const order = ['Best Value', 'Our Recommendation', 'Level Up'];
    const sortedPcs = [...recs].sort((a, b) => order.indexOf(a.recommendationLevel) - order.indexOf(b.recommendationLevel));
    let initialIndex = sortedPcs.findIndex(p => p.recommendationLevel === 'Our Recommendation');
    if (initialIndex === -1) initialIndex = 0;

    sortedPcs.forEach((pc, index) => {
        const pill = document.createElement('button');
        pill.className = 'mobile-pill';
        pill.textContent = pc.recommendationLevel || `Option ${index + 1}`;
        pill.dataset.index = index;
        if (index === initialIndex) pill.classList.add('active');
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
    const productUrl = pc.productUrl;
    document.getElementById('mobile-product-title').textContent = pc.name || 'Recommended PC';
    const priceTag = document.querySelector('.mobile-price-tag');

    const priceText = currentView === 'RTS' ? (pc.price || '').replace('Starting From ', '') : (pc.price || '');
    priceTag.innerHTML = pc.strikethroughPrice
        ? `${priceText} <span class="strikethrough-price">${pc.strikethroughPrice}</span>`
        : `${priceText}`;

    const buyButton = document.getElementById('mobile-buy-button');
    buyButton.href = productUrl || '#';
    buyButton.textContent = currentView === 'RTS' ? 'Buy Now' : 'Customise Now';

    const img = document.getElementById('mobile-product-image');
    img.src = pc.imageUrl || '';
    img.alt = pc.name || 'Recommended PC';

    const specsContainer = document.getElementById('mobile-product-specs');
    const details = pc.details ? Object.entries(pc.details).map(([key, value]) =>
        `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
    ).join('') : '';
    specsContainer.innerHTML = `<h3>Specifications</h3>${details}<a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="view-product-button-mobile">View Product</a>`;
}

rtsBtn.addEventListener('click', () => {
    if (currentView === 'RTS') return;
    currentView = 'RTS';
    displayResults();
});

customBtn.addEventListener('click', () => {
    if (currentView === 'Custom') return;
    currentView = 'Custom';
    displayResults();
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (Object.keys(allRecommendations).length > 0) {
            displayResults();
        }
    }, 250);
});

// Init
allSteps.forEach((step, index) => {
    if (index > 0) step.style.display = 'none';
});
enhanceAccessibility();
determineStepOrder();
updateButtons();
document.querySelector('.results-toggle-buttons').style.display = 'none';
restoreState();
// Ensure we're showing the first step if nothing restored
if (!document.querySelector('.step[style*="block"]')) showStep('primaryUse');
});