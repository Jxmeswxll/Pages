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
    const rtsBtn = document.getElementById('rtsBtn');
    const customBtn = document.getElementById('customBtn');

    const webhookUrl = 'https://jxmes-project.app.n8n.cloud/webhook/845ce1f3-b59d-4df7-8292-6a8ce9cf48ab';

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

    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled) return;
        
        quizContainer.style.display = 'none';
        document.querySelector('.navigation').style.display = 'none';
        resultsContainer.style.display = 'block';
        loader.style.display = 'flex';
        resultsGrid.style.display = 'none';

        // Start the PC Rush game
        if (pcRushGame) {
            pcRushGame.start();
        }

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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Stop the PC Rush game
            if (pcRushGame) {
                pcRushGame.stop();
            }
            showFinalResults(data);
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            loaderMessage.textContent = "Sorry, something went wrong. Please try again later.";
            clearInterval(messageInterval);
            // Stop the game on error
            if (pcRushGame) {
                pcRushGame.stop();
            }
        });
    });

    function showFinalResults(recommendationData) {
        clearInterval(messageInterval);
    
        setTimeout(() => {
            loader.style.display = 'none';
            document.querySelector('.results-toggle-buttons').style.display = 'inline-flex';
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
            const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
            const productUrl = pc.productUrl;
            const detailsHTML = Object.entries(pc.details).map(([key, value]) => `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`).join('');
            
            const priceHTML = currentView === 'RTS' 
                ? `<p class="price">${pc.price.replace('Starting From ', '')}</p>` 
                : `<p class="price">${pc.price}</p>`;

            const buttonHTML = currentView === 'RTS'
                ? `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Buy Now</a>`
                : `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Customise Now</a>`;

            card.innerHTML = `
                <a href="${productUrl}" target="_blank" class="result-image-link"><img src="${pc.imageUrl}" alt="${pc.name}"></a>
                <div class="result-card-content">
                    ${badgeHTML}
                    <div class="title-container"><h3>${pc.name}</h3></div>
                    <div class="price-container">${priceHTML}${strikethroughHTML}</div>
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
            <h2 id="mobile-product-title"></h2>
            <div id="mobile-recommendation-pills"></div>
            <div class="mobile-product-view">
                <p class="mobile-price-tag"></p>
                <a href="#" id="mobile-buy-button" class="buy-button" target="_blank">Buy</a>
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
        const productUrl = pc.productUrl;
        document.getElementById('mobile-product-title').textContent = pc.name;
        const priceTag = document.querySelector('.mobile-price-tag');
        
        const priceText = currentView === 'RTS' ? pc.price.replace('Starting From ', '') : pc.price;
        priceTag.innerHTML = pc.strikethroughPrice
            ? `${priceText} <span class="strikethrough-price">${pc.strikethroughPrice}</span>`
            : `${priceText}`;

        const buyButton = document.getElementById('mobile-buy-button');
        buyButton.href = productUrl;
        buyButton.textContent = currentView === 'RTS' ? 'Buy Now' : 'Customise Now';

        document.getElementById('mobile-product-image').src = pc.imageUrl;
        
        const specsContainer = document.getElementById('mobile-product-specs');
        specsContainer.innerHTML = `<h3>Specifications</h3>` + Object.entries(pc.details).map(([key, value]) => 
            `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
        ).join('') + `<a href="${productUrl}" target="_blank" class="view-product-button-mobile">View Product</a>`;
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

    // Initialize PC Rush Game
    if (document.getElementById('loadingGame')) {
        pcRushGame = new PCRushGame();
    }
});

// PC Rush Game Class
class PCRushGame {
    constructor() {
        this.gameArea = document.getElementById('gameArea');
        this.player = document.getElementById('gamePlayer');
        this.scoreElement = document.getElementById('gameScore');
        this.distanceElement = document.getElementById('gameDistance');
        this.gemsElement = document.getElementById('gameGems');
        this.successFeedback = document.getElementById('successFeedback');
        
        this.isPlaying = false;
        this.isJumping = false;
        this.score = 0;
        this.distance = 0;
        this.gems = 0;
        this.gameSpeed = 1;
        this.obstacleCount = 0;
        
        this.obstacles = [];
        this.collectibles = [];
        
        this.gameLoop = null;
        this.obstacleTimer = null;
        this.gemTimer = null;
        this.distanceTimer = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Jump controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isPlaying) {
                e.preventDefault();
                this.jump();
            }
        });
        
        if (this.gameArea) {
            this.gameArea.addEventListener('click', () => {
                if (this.isPlaying) {
                    this.jump();
                }
            });
            
            this.gameArea.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.isPlaying) {
                    this.jump();
                }
            });
        }
    }

    start() {
        this.isPlaying = true;
        this.score = 0;
        this.distance = 0;
        this.gems = 0;
        this.gameSpeed = 1;
        this.obstacleCount = 0;
        
        this.clearGameObjects();
        this.updateDisplay();
        this.startGameLoop();
        this.startSpawning();
    }

    stop() {
        this.isPlaying = false;
        
        // Clear all timers
        clearInterval(this.gameLoop);
        clearInterval(this.distanceTimer);
        clearInterval(this.obstacleTimer);
        clearInterval(this.gemTimer);
        
        this.clearGameObjects();
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.player.classList.add('jumping');
            
            // Show success feedback for first few jumps
            if (this.obstacleCount < 3) {
                this.showSuccessFeedback();
            }
            
            setTimeout(() => {
                this.isJumping = false;
                this.player.classList.remove('jumping');
            }, 800);
        }
    }

    showSuccessFeedback() {
        const messages = ['Great jump! 🎉', 'Perfect! ⭐', 'Awesome! 🚀', 'Nice! 💫'];
        this.successFeedback.textContent = messages[Math.floor(Math.random() * messages.length)];
        this.successFeedback.classList.add('show');
        
        setTimeout(() => {
            this.successFeedback.classList.remove('show');
        }, 1500);
    }

    startGameLoop() {
        this.gameLoop = setInterval(() => {
            this.updateGame();
        }, 16); // 60 FPS
        
        // Distance counter
        this.distanceTimer = setInterval(() => {
            this.distance += 1;
            this.score += 1;
            this.updateDisplay();
            
            // Very gradual speed increase - only after 30 seconds
            if (this.distance > 300 && this.distance % 100 === 0) {
                this.gameSpeed = Math.min(this.gameSpeed + 0.1, 2);
                this.updateSpawnRates();
            }
        }, 100);
    }

    startSpawning() {
        // Start with very easy obstacles
        setTimeout(() => {
            this.spawnObstacle();
        }, 5000); // First obstacle after 5 seconds
        
        // Spawn gems more frequently
        this.gemTimer = setInterval(() => {
            this.spawnGem();
        }, 2000);
        
        this.updateSpawnRates();
    }

    updateSpawnRates() {
        if (this.obstacleTimer) clearInterval(this.obstacleTimer);
        
        // Much easier obstacle spawning - extremely generous spacing
        const baseInterval = this.obstacleCount < 3 ? 6000 : 
                           this.obstacleCount < 6 ? 5000 : 4000;
        this.obstacleTimer = setInterval(() => {
            this.spawnObstacle();
        }, Math.max(4000, baseInterval / this.gameSpeed));
    }

    spawnObstacle() {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        
        // Make obstacles slower and more predictable
        const duration = Math.max(3, 4 / this.gameSpeed);
        obstacle.style.animationDuration = `${duration}s`;
        
        this.gameArea.appendChild(obstacle);
        this.obstacles.push(obstacle);
        this.obstacleCount++;
        
        setTimeout(() => {
            if (obstacle.parentNode) {
                obstacle.remove();
                this.obstacles = this.obstacles.filter(o => o !== obstacle);
            }
        }, duration * 1000);
    }

    spawnGem() {
        const gem = document.createElement('div');
        gem.className = 'gem';
        
        const duration = Math.max(4, 5 / this.gameSpeed);
        gem.style.animationDuration = `${duration}s`;
        
        this.gameArea.appendChild(gem);
        this.collectibles.push(gem);
        
        setTimeout(() => {
            if (gem.parentNode) {
                gem.remove();
                this.collectibles = this.collectibles.filter(g => g !== gem);
            }
        }, duration * 1000);
    }

    updateGame() {
        this.checkCollisions();
    }

    checkCollisions() {
        const playerRect = this.player.getBoundingClientRect();
        
        // More forgiving collision detection
        this.obstacles.forEach(obstacle => {
            const obstacleRect = obstacle.getBoundingClientRect();
            if (this.isColliding(playerRect, obstacleRect, 15)) { // Larger margin
                this.endGame();
            }
        });
        
        // Gem collection
        this.collectibles.forEach((gem, index) => {
            const gemRect = gem.getBoundingClientRect();
            if (this.isColliding(playerRect, gemRect, 5)) {
                this.collectGem(gem);
                this.collectibles.splice(index, 1);
            }
        });
    }

    isColliding(rect1, rect2, margin = 10) {
        return !(rect1.right - margin < rect2.left + margin || 
                rect1.left + margin > rect2.right - margin || 
                rect1.bottom - margin < rect2.top + margin || 
                rect1.top + margin > rect2.bottom - margin);
    }

    collectGem(gem) {
        this.gems += 1;
        this.score += 15;
        this.createParticles(gem);
        gem.remove();
        this.updateDisplay();
    }

    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const gameRect = this.gameArea.getBoundingClientRect();
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = (rect.left - gameRect.left + rect.width/2) + 'px';
            particle.style.top = (rect.top - gameRect.top + rect.height/2) + 'px';
            particle.style.animationDelay = (i * 0.1) + 's';
            
            this.gameArea.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 1500);
        }
    }

    endGame() {
        this.isPlaying = false;
        
        // Clear all timers
        clearInterval(this.gameLoop);
        clearInterval(this.distanceTimer);
        clearInterval(this.obstacleTimer);
        clearInterval(this.gemTimer);
        
        // Auto restart after brief pause
        setTimeout(() => {
            this.start();
        }, 1000);
    }

    clearGameObjects() {
        // Remove all game objects
        [...this.obstacles, ...this.collectibles].forEach(obj => {
            if (obj.parentNode) {
                obj.remove();
            }
        });
        
        this.obstacles = [];
        this.collectibles = [];
        
        // Remove particles
        const particles = this.gameArea.querySelectorAll('.particle');
        particles.forEach(particle => particle.remove());
    }

    updateDisplay() {
        if (this.scoreElement) this.scoreElement.textContent = this.score;
        if (this.distanceElement) this.distanceElement.textContent = this.distance;
        if (this.gemsElement) this.gemsElement.textContent = this.gems;
    }
}

// Global variable to hold the game instance
let pcRushGame;
