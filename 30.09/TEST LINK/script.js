document.addEventListener('DOMContentLoaded', () => {
    const quiz = document.getElementById('quiz');
    const quizWrapper = document.querySelector('.quiz-wrapper');
    const quizContainer = document.querySelector('.quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('perceptual-loader');
    const stagedText = document.getElementById('staged-text');
    const stagedHint = document.getElementById('staged-hint');
    const resultsGrid = document.getElementById('results');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progress-text');
    const rtsBtn = document.getElementById('rtsBtn');
    const customBtn = document.getElementById('customBtn');

    const webhookUrl = 'https://aftershockpc.app.n8n.cloud/webhook/2be1f73d-4b4a-4f65-a9f0-03c726f7e9d3';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};
    let currentStepOrder = ['primaryUse'];
    let allRecommendations = {};
    let currentView = 'RTS';
    let abortController = null;

    const LOADER_CFG = {
        minShowMs: 800,
        slowBeatMs: 45000,
        hardTimeoutMs: 90000,
        copy: [
            'Preparing your results…',
            'Matching components and stock…',
            'Ranking the best value…',
            'Finalising picks…'
        ]
    };

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

        if (progressText) {
            progressText.textContent = `Step ${currentStepIndex + 1} of ${totalSteps}`;
        }
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
            } else {
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

    function startLoader() {
        if (!loader) return;
        loader.style.display = 'block';
    }

    function stopLoader() {
        if (!loader) return;
        loader.style.display = 'none';
    }

    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled) return;
        
        quizContainer.style.display = 'none';
        document.querySelector('.navigation').style.display = 'none';
        resultsContainer.style.display = 'block';

        const toggle = document.querySelector('.results-toggle-buttons');
        if (toggle) toggle.style.display = 'inline-flex';
        if (rtsBtn) rtsBtn.disabled = true;
        if (customBtn) customBtn.disabled = true;

        if (loader) loader.style.display = 'block';
        resultsGrid.style.display = 'none';

        startLoader();

        // Abortable fetch with hard timeout
        abortController = new AbortController();
        const hardTimeout = setTimeout(() => {
            abortController.abort();
        }, LOADER_CFG.hardTimeoutMs);

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers),
            signal: abortController.signal
        })
        .then(response => {
            clearTimeout(hardTimeout);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showFinalResults(data);
        })
        .catch(error => {
            clearTimeout(hardTimeout);
            const aborted = error.name === 'AbortError';
            console.error('Fetch Error:', error);
            if (stagedText) stagedText.textContent = aborted
                ? 'Cancelled. Your answers are safe.'
                : 'Sorry, something went wrong. Please try again later.';
            if (!aborted && stagedHint) stagedHint.textContent = 'Please try again.';
            setTimeout(() => {
                stopLoader(aborted ? true : false);
                if (aborted) {
                    // Restore quiz UI
                    resultsContainer.style.display = 'none';
                    quizContainer.style.display = 'block';
                    const nav = document.querySelector('.navigation');
                    if (nav) nav.style.display = 'flex';
                    const toggle2 = document.querySelector('.results-toggle-buttons');
                    if (toggle2) toggle2.style.display = 'none';
                } else {
                    // Show inline error and recovery option
                    resultsGrid.style.display = 'block';
                    resultsGrid.innerHTML = `
                        <div style="max-width:700px;margin:40px auto;color:#f5f5f7;">
                            <h3 style="margin-bottom:10px;">We couldn’t fetch recommendations</h3>
                            <p style="color:#8a8a8e;margin-bottom:20px;">Please check your connection and try again.</p>
                            <button id="retry-btn" style="background:#e53935;color:#fff;border:none;padding:12px 20px;border-radius:999px;font-weight:600;cursor:pointer;">Back to answers</button>
                        </div>
                    `;
                    const retry = document.getElementById('retry-btn');
                    if (retry) {
                        retry.addEventListener('click', () => {
                            resultsContainer.style.display = 'none';
                            quizContainer.style.display = 'block';
                            const nav = document.querySelector('.navigation');
                            if (nav) nav.style.display = 'flex';
                            const toggle2 = document.querySelector('.results-toggle-buttons');
                            if (toggle2) toggle2.style.display = 'none';
                        });
                    }
                }
            }, 300);
        });
    });

    function showFinalResults(recommendationData) {
        setTimeout(() => {
            stopLoader();
            document.getElementById('perceptual-loader').style.display = 'none';
            const toggle = document.querySelector('.results-toggle-buttons');
            if (toggle) toggle.style.display = 'inline-flex';
            if (rtsBtn) rtsBtn.disabled = false;
            if (customBtn) customBtn.disabled = false;
            resultsGrid.style.display = 'grid';
            try {
                let parsedData;
                let dataToParse = recommendationData;

                // Handle the case where the data is wrapped in an array
                if (Array.isArray(dataToParse) && dataToParse.length > 0) {
                    dataToParse = dataToParse[0];
                }

                if (typeof dataToParse === 'object' && dataToParse !== null && 'output' in dataToParse) {
                    if (typeof dataToParse.output === 'string') {
                        try {
                            // First, clean up the string by removing backticks and "json" identifier
                            const jsonString = dataToParse.output.replace(/```json\n|```/g, '');
                            parsedData = JSON.parse(jsonString);
                        } catch (e) {
                            // If parsing fails, log the error and the problematic string
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
        }, 500);
    }

    function displayResults() {
        const recs = allRecommendations[currentView];
        if (!recs || recs.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, no ${currentView} builds match your criteria. Try the other category!</p>`;
            document.getElementById('mobile-results-container').innerHTML = '';
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

    function displayDesktopGrid(recs) {
        resultsGrid.innerHTML = '';
        recs.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            if (pc.recommendationLevel === 'Our Recommendation') card.classList.add('top-choice');
            else if (pc.recommendationLevel === 'Best Value') card.classList.add('best-value');
            else if (pc.recommendationLevel === 'Level Up') card.classList.add('level-up');

            const badgeHTML = `<div class="recommendation-badge">${pc.recommendationLevel}</div>`;
            const productUrl = pc.productUrl;
            const detailsHTML = Object.entries(pc.details).map(([key, value]) => `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`).join('');
            
            let priceHTML = '';
            if (pc.price && pc.strikethroughPrice) {
                const priceNum = parseFloat(pc.price.replace(/[^0-9.-]+/g,""));
                const strikethroughPriceNum = parseFloat(pc.strikethroughPrice.replace(/[^0-9.-]+/g,""));
                if (!isNaN(priceNum) && !isNaN(strikethroughPriceNum)) {
                    const savings = strikethroughPriceNum - priceNum;
                    priceHTML = `
                        <div class="price-container">
                          <p class="price">$${priceNum}</p>
                          <div class="price-details">
                            <p class="strikethrough-price">$${strikethroughPriceNum}</p>
                            <p class="saving">You save $${savings}</p>
                          </div>
                        </div>`;
                }
            } else if (pc.price) {
                const priceDisplay = currentView === 'RTS' ? pc.price.replace('Starting From ', '') : pc.price;
                priceHTML = `<div class="price-container"><p class="price">${priceDisplay}</p></div>`;
            }


            const buttonHTML = currentView === 'RTS'
                ? `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Buy Now</a>`
                : `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Customise Now</a>`;

            const reasonHTML = pc.reason ? `<p class="recommendation-reason">${pc.reason}</p>` : '';

            card.innerHTML = `
                <a href="${productUrl}" target="_blank" class="result-image-link"><img src="${pc.imageUrl}" alt="${pc.name}" loading="lazy" decoding="async"></a>
                <div class="result-card-content">
                    ${badgeHTML}
                    <div class="title-container"><h3>${pc.name}</h3></div>
                    ${reasonHTML}
                    ${priceHTML}
                    ${buttonHTML}
                    <div class="details">${detailsHTML}</div>
                    <a href="${productUrl}" target="_blank" class="view-product-button">View Product</a>
                </div>`;
            resultsGrid.appendChild(card);
        });
    }

    function displayMobileSingleView(recs) {
        const mobileResultsContainer = document.getElementById('mobile-results-container');
        mobileResultsContainer.innerHTML = `
            <div class="mobile-results-card">
                <div id="mobile-pagination-dots"></div>
                <img src="" id="mobile-product-image" alt="Recommended PC" class="hero-image">
                <div class="product-info">
                    <div id="mobile-recommendation-badge" class="recommendation-badge"></div>
                    <h2 id="mobile-product-title"></h2>
                    <p id="mobile-reason-container" class="recommendation-reason"></p>
                    <div id="mobile-price-container" class="price-container">
                    </div>
                </div>
                <div class="full-specs">
                    <div id="mobile-product-specs" class="mobile-specs-block"></div>
                </div>
                <div class="trust-microcopy">
                    </div>
            </div>
            <div class="sticky-buy-bar">
                <a href="#" id="mobile-buy-button" class="buy-button" target="_blank">Buy Now</a>
            </div>
        `;

        const dotsContainer = document.getElementById('mobile-pagination-dots');
        const carouselContent = document.getElementById('mobile-carousel-content');
        dotsContainer.innerHTML = '';

        const order = ['Best Value', 'Our Recommendation', 'Level Up'];
        const sortedPcs = [...recs].sort((a, b) => order.indexOf(a.recommendationLevel) - order.indexOf(b.recommendationLevel));
        
        let currentIndex = sortedPcs.findIndex(p => p.recommendationLevel === 'Our Recommendation');
        if (currentIndex === -1) currentIndex = 0;

        sortedPcs.forEach((pc, index) => {
            const dot = document.createElement('div');
            dot.className = 'pagination-dot';
            dot.dataset.index = index;
            dotsContainer.appendChild(dot);
        });

        function updateActive(index, direction) {
            if (!carouselContent) return;
            
            carouselContent.classList.add('fade-out');

            setTimeout(() => {
                currentIndex = parseInt(index);
                updateMobileView(sortedPcs[currentIndex]);
                dotsContainer.querySelectorAll('.pagination-dot').forEach((d, i) => d.classList.toggle('active', i === currentIndex));
                carouselContent.classList.remove('fade-out');
            }, 300);
        }

        updateActive(currentIndex);

        dotsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-dot')) {
                updateActive(e.target.dataset.index);
            }
        });

        document.querySelector('.prev-btn').addEventListener('click', () => {
            const newIndex = currentIndex > 0 ? currentIndex - 1 : sortedPcs.length - 1;
            updateActive(newIndex, 'prev');
        });

        document.querySelector('.next-btn').addEventListener('click', () => {
            const newIndex = currentIndex < sortedPcs.length - 1 ? currentIndex + 1 : 0;
            updateActive(newIndex, 'next');
        });
    }

    function updateMobileView(pc) {
        if (!pc) return;
        const productUrl = pc.productUrl;
        document.getElementById('mobile-product-title').textContent = pc.name;
        document.getElementById('mobile-recommendation-badge').textContent = pc.recommendationLevel;

        const reasonContainer = document.getElementById('mobile-reason-container');
        if (pc.reason) {
            reasonContainer.textContent = pc.reason;
            reasonContainer.style.display = 'block';
        } else {
            reasonContainer.style.display = 'none';
        }

        const priceContainer = document.getElementById('mobile-price-container');
        if (priceContainer) {
            let priceHTML = '';
            if (pc.price && pc.strikethroughPrice) {
                const priceNum = parseFloat(pc.price.replace(/[^0-9.-]+/g,""));
                const strikethroughPriceNum = parseFloat(pc.strikethroughPrice.replace(/[^0-9.-]+/g,""));
                if (!isNaN(priceNum) && !isNaN(strikethroughPriceNum)) {
                    const savings = strikethroughPriceNum - priceNum;
                    priceHTML = `
                        <p class="price">$${priceNum}</p>
                        <div class="price-details">
                            <p class="strikethrough-price">$${strikethroughPriceNum}</p>
                            <p class="saving">You save $${savings}</p>
                        </div>`;
                }
            } else if (pc.price) {
                const priceDisplay = currentView === 'RTS' ? pc.price.replace('Starting From ', '') : pc.price;
                priceHTML = `<p class="price">${priceDisplay}</p>`;
            }
            priceContainer.innerHTML = priceHTML;
        }

        const buyButton = document.getElementById('mobile-buy-button');
        buyButton.href = productUrl;
        buyButton.textContent = currentView === 'RTS' ? 'Buy Now' : 'Customise Now';

        const mobileImg = document.getElementById('mobile-product-image');
        mobileImg.src = pc.imageUrl;

        const specsContainer = document.getElementById('mobile-product-specs');
        specsContainer.innerHTML = Object.entries(pc.details).map(([key, value]) =>
            `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
        ).join('');

        const trustMicrocopyContainer = document.querySelector('.trust-microcopy');
        trustMicrocopyContainer.innerHTML = `
            <div class="trust-item">
                <i class="fas fa-truck"></i>
                <span>NEXT DAY DISPATCH AVAILABLE</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-award"></i>
                <span>AWARD-WINNING CUSTOM PC COMPANY</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-microchip"></i>
                <span>FULL TRANSPARENCY ON PC COMPONENTS</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-headset"></i>
                <span>UNMATCHED SERVICE AND SUPPORT</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-shield-alt"></i>
                <span>3 YEAR DESKTOP WARRANTY AND LIFETIME SUPPORT</span>
            </div>
        `;
    }

    rtsBtn.addEventListener('click', () => {
        if (currentView === 'RTS') return;
        currentView = 'RTS';
        rtsBtn.classList.add('active');
        customBtn.classList.remove('active');
        displayResults();
    });

    customBtn.addEventListener('click', () => {
        if (currentView === 'Custom') return;
        currentView = 'Custom';
        customBtn.classList.add('active');
        rtsBtn.classList.remove('active');
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

    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
    document.querySelector('.results-toggle-buttons').style.display = 'none';
});
