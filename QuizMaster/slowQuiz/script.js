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
    const gameContainer = document.getElementById('game-container');
    const rtsBtn = document.getElementById('rtsBtn');
    const customBtn = document.getElementById('customBtn');
    const playGameBtn = document.getElementById('playGameBtn');
    const loaderOptions = document.getElementById('loader-options');

    const webhookUrl = 'https://jxmes-wxll.app.n8n.cloud/webhook/0d7d013b-5ae9-4864-86d6-15b668f213bb';

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

        const loadingMessages = [
            "Analyzing your choices...", "Consulting the tech gurus...", "Comparing components...",
            "Calculating performance metrics...", "Assembling virtual parts...", "Cross-referencing our database...",
            "Running benchmarks...", "Finding the perfect match...", "Polishing the recommendations..."
        ];

        const loaderMessage = document.getElementById('loader-message');
        let messageIndex = 0;
        let seconds = 0;
        const timerElement = document.createElement('span');
        timerElement.id = 'loader-timer';
        timerElement.style.marginTop = '10px';
        loader.appendChild(timerElement);

        messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            loaderMessage.textContent = loadingMessages[messageIndex];
            seconds++;
            timerElement.textContent = `Time elapsed: ${seconds}s`;
        }, 1000);

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
    });

    function showFinalResults(recommendationData) {
        clearInterval(messageInterval);
        const timerElement = document.getElementById('loader-timer');
        if(timerElement) timerElement.remove();
        if (gameContainer && typeof stopGame === 'function') {
            stopGame();
            gameContainer.style.display = 'none';
        }
        loaderOptions.style.display = 'none';
    
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

    playGameBtn.addEventListener('click', () => {
        loaderOptions.style.display = 'none';
        gameContainer.style.display = 'block';
        if(typeof startGame === 'function') {
            startGame();
        }
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

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restart");

let gameSpeed = 7; // Start speed
let gravity = 0.6;
let jumpForce = 12;
let player = { x: 50, y: 0, width: 40, height: 40, velY: 0 };
let isJumping = false;
let isGameOver = false;
let score = 0;
let distance = 0;
let obstacles = [];
let coins = [];
const groundY = canvas.height - 40;
player.y = groundY;

// High Score
let highScore = localStorage.getItem('pcRunnerHighScore') || 0;

// Timers
let startTime = Date.now();
let lastSpeedIncrease = Date.now();
let obstacleTimer = 0;
let coinTimer = 0;
let groundOffset = 0;

// Clouds for depth effect
let clouds = Array(3).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * 50 + 10,
    width: 80,
    height: 30
}));

// Functions
function drawBackground() {
    ctx.fillStyle = "#1d1d1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = "#333";
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, 40, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

function moveClouds() {
    clouds.forEach(cloud => {
        cloud.x -= gameSpeed * 0.2;
        if (cloud.x < -50) {
            cloud.x = canvas.width + Math.random() * 100;
            cloud.y = Math.random() * 50 + 10;
        }
    });
}

function drawGround() {
    // Smooth gradient ground
    const gradient = ctx.createLinearGradient(0, groundY + 35, canvas.width, groundY + 40);
    gradient.addColorStop(0, "#3a1a1a");
    gradient.addColorStop(1, "#5a2222");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, groundY + 35, canvas.width, 6);
}

function drawHUD() {
    ctx.fillStyle = "#fff";
    ctx.font = "20px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 10, 25);
    ctx.fillText(`Distance: ${distance}m`, 10, 50);
    ctx.textAlign = "right";
    ctx.fillText(`Speed: ${Math.round(gameSpeed)}`, canvas.width - 10, 25);
    ctx.fillText(`High Score: ${highScore}`, canvas.width - 10, 50);
}


function drawPlayer() {
    ctx.fillStyle = "#e53935";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
}

function drawObstacle(obs) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
}

function drawCoin(c) {
    ctx.beginPath();
    ctx.arc(c.x + c.radius, c.y + c.radius, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = c.type === "coin" ? "#FFD700" : c.type === "speed" ? "#4CAF50" : "#2196F3";
    ctx.fill();
}

function updatePlayer() {
    player.velY += gravity;
    player.y += player.velY;
    if (player.y > groundY) {
        player.y = groundY;
        player.velY = 0;
        isJumping = false;
    }
}

function jump() {
    if (!isJumping && !isGameOver) {
        player.velY = -jumpForce;
        isJumping = true;
    }
}

document.addEventListener("keydown", e => {
    if ((e.code === "Space" || e.code === "ArrowUp") && !isGameOver) {
        jump();
    }
});

// Touch controls for mobile
document.addEventListener("touchstart", e => {
    e.preventDefault();
    jump();
}, { passive: false });


function createObstaclePattern() {
    const pattern = Math.floor(Math.random() * 4);
    let obstacleWidth = 20 + Math.random() * 20;

    switch (pattern) {
        case 0: // Single tall obstacle
            obstacles.push({ x: canvas.width, y: groundY - 20, width: obstacleWidth, height: 60 });
            break;
        case 1: // Single short obstacle
            obstacles.push({ x: canvas.width, y: groundY, width: obstacleWidth, height: 40 });
            break;
        case 2: // Series of two short obstacles
            for (let i = 0; i < 2; i++) {
                obstacles.push({ x: canvas.width + i * 200, y: groundY, width: 20, height: 40 });
            }
            break;
        case 3: // A short and a tall obstacle
            obstacles.push({ x: canvas.width, y: groundY, width: 20, height: 40 });
            obstacles.push({ x: canvas.width + 80, y: groundY - 20, width: 20, height: 60 });
            break;
    }
}

function createCoinOrBoost() {
    const typeChance = Math.random();
    let type = typeChance > 0.5 ? "speed" : "slow";

    coins.push({
        x: canvas.width,
        y: groundY - (50 + Math.random() * 60),
        radius: 10,
        type: type
    });
}

function updateObstacles() {
    obstacles.forEach(obs => {
        obs.x -= gameSpeed;
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }
    });

    obstacles = obstacles.filter(obs => {
        if (obs.x + obs.width >= 0) return true;
        score++;
        return false;
    });

    coins.forEach(c => c.x -= gameSpeed);
    coins = coins.filter(c => {
        if (
            player.x < c.x + c.radius * 2 &&
            player.x + player.width > c.x &&
            player.y < c.y + c.radius * 2 &&
            player.y + player.height > c.y
        ) {
            if (c.type === "speed") gameSpeed += 3;
            if (c.type === "slow") gameSpeed = Math.max(4, gameSpeed - 2);
            return false;
        }
        return c.x + c.radius * 2 >= 0;
    });
}

function gameOver() {
    isGameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pcRunnerHighScore', highScore);
    }
    restartBtn.style.display = "block";
}

function resetGame() {
    isGameOver = false;
    score = 0;
    distance = 0;
    obstacles = [];
    coins = [];
    player.y = groundY;
    player.velY = 0;
    gameSpeed = 7;
    startTime = Date.now();
    lastSpeedIncrease = Date.now();
    restartBtn.style.display = "none";
    loop();
}

restartBtn.addEventListener("click", resetGame);

function loop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    moveClouds();
    drawGround();
    drawPlayer();
    drawHUD();

    obstacleTimer++;
    if (obstacleTimer > 100 + Math.random() * 50) { // Randomized timer
        createObstaclePattern();
        obstacleTimer = 0;
    }

    coinTimer++;
    if (coinTimer > 100 + Math.random() * 200) {
        createCoinOrBoost();
        coinTimer = 0;
    }

    updatePlayer();
    updateObstacles();
    obstacles.forEach(obs => drawObstacle(obs));
    coins.forEach(c => drawCoin(c));

    let elapsed = Date.now() - startTime;
    distance = Math.floor(elapsed / 10);

    if (Date.now() - lastSpeedIncrease > 10000) {
        gameSpeed += 1.5;
        lastSpeedIncrease = Date.now();
    }

    requestAnimationFrame(loop);
}

function startGame() {
    resetGame();
}

function stopGame() {
    isGameOver = true;
}
