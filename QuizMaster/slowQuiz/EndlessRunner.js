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
