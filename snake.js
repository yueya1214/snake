const gameBoard = document.getElementById('game-board');
const ctx = gameBoard.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const levelDisplay = document.getElementById('level'); // Added for level display
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScoreDisplay = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const difficultySelect = document.getElementById('difficulty');

const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

const boardSize = 20;
let tileSize;
let snake;
let food;
let bonusFood = null;
let obstacles = [];
let dx;
let dy;
let score;
let highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreDisplay.textContent = highScore;
let gameSpeed; // This will be the delay between frames
let isPaused = false;
let changingDirection = false;
let bonusFoodTimer;
const BONUS_FOOD_SCORE = 5;
let OBSTACLE_COUNT = 3; // Initial obstacle count, will be overridden by level config
let currentLevel = 1;
let particles = []; // For apple eating animation

const eatSound = { play: () => console.log('Play eat sound') };
const gameOverSound = { play: () => console.log('Play game over sound') };
const bonusEatSound = { play: () => console.log('Play bonus eat sound') };
const levelUpSound = { play: () => console.log('Play level up sound') };

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');
const eyeCanvas = document.createElement('canvas');
const eyeCtx = eyeCanvas.getContext('2d');

let lastTime = 0;
let blinkOpacity = 0.3;
let lastBlinkUpdate = 0;
// FPS counter (user added)
let frameCount = 0;
let fps = 0;
let lastFpsUpdate = 0;

const levelConfig = [
    { level: 1, scoreToNextLevel: 5, obstacleCount: 3, bonusFoodDuration: 8000, speedMultiplier: 1.0 },
    { level: 2, scoreToNextLevel: 15, obstacleCount: 5, bonusFoodDuration: 7500, speedMultiplier: 0.95 },
    { level: 3, scoreToNextLevel: 30, obstacleCount: 7, bonusFoodDuration: 7000, speedMultiplier: 0.9 },
    { level: 4, scoreToNextLevel: 50, obstacleCount: 10, bonusFoodDuration: 6500, speedMultiplier: 0.85 },
    { level: 5, scoreToNextLevel: Infinity, obstacleCount: 12, bonusFoodDuration: 6000, speedMultiplier: 0.8 } // Max level
];

let currentConfig;

function resizeCanvas() {
    const containerWidth = gameBoard.parentElement.clientWidth;
    tileSize = Math.floor(containerWidth / boardSize);
    gameBoard.width = tileSize * boardSize;
    gameBoard.height = tileSize * boardSize;
    offscreenCanvas.width = gameBoard.width;
    offscreenCanvas.height = gameBoard.height;
    eyeCanvas.width = tileSize;
    eyeCanvas.height = tileSize;
    if (currentConfig) drawStaticElements(); // Redraw static if config exists (meaning game might be active)
    if (snake) {
        drawGame(performance.now());
    }
}
window.addEventListener('resize', resizeCanvas);

function drawStaticElements() {
    offscreenCtx.fillStyle = '#2c3e50';
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    obstacles.forEach(obs => {
        drawRect(obs.x, obs.y, '#8e44ad', 'obstacle', false, offscreenCtx);
    });
}

function drawEyes() {
    eyeCtx.clearRect(0, 0, tileSize, tileSize);
    eyeCtx.fillStyle = 'white';
    const eyeRadius = tileSize / 8;
    const eyeOffsetX = dx !== 0 ? tileSize / (dx > 0 ? 3 : 1.5) : tileSize / 2.5;
    const eyeOffsetY = dy !== 0 ? tileSize / (dy > 0 ? 3 : 1.5) : tileSize / 2.5;
    eyeCtx.beginPath();
    eyeCtx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
    eyeCtx.arc(dx !== 0 ? eyeOffsetX : tileSize - eyeOffsetX,
        dy !== 0 ? eyeOffsetY : tileSize - eyeOffsetY,
        eyeRadius, 0, 2 * Math.PI);
    eyeCtx.fill();

    eyeCtx.fillStyle = 'black';
    const pupilRadius = eyeRadius / 2;
    eyeCtx.beginPath();
    eyeCtx.arc(eyeOffsetX + dx * pupilRadius, eyeOffsetY + dy * pupilRadius, pupilRadius, 0, 2 * Math.PI);
    eyeCtx.arc((dx !== 0 ? eyeOffsetX : tileSize - eyeOffsetX) + dx * pupilRadius,
        (dy !== 0 ? eyeOffsetY : tileSize - eyeOffsetY) + dy * pupilRadius,
        pupilRadius, 0, 2 * Math.PI);
    eyeCtx.fill();
}

function drawRect(x, y, color, type = 'snake', isHead = false, context = ctx) {
    context.fillStyle = color;
    const posX = x * tileSize;
    const posY = y * tileSize;

    if (type === 'normal' || type === 'bonus') {
        const radius = tileSize / 2;
        context.beginPath();
        context.arc(posX + radius, posY + radius, radius * (type === 'bonus' ? 0.9 : 0.8), 0, 2 * Math.PI);
        context.fill();
        context.fillStyle = type === 'bonus' ? `rgba(255, 255, 255, ${blinkOpacity})` : 'rgba(255,255,255,0.3)';
        context.beginPath();
        context.arc(posX + radius * 0.7, posY + radius * 0.7, radius * 0.3, 0, 2 * Math.PI);
        context.fill();
    } else if (type === 'obstacle') {
        context.fillRect(posX, posY, tileSize, tileSize);
        context.strokeStyle = '#5D3D76';
        context.lineWidth = 2;
        context.strokeRect(posX + 1, posY + 1, tileSize - 2, tileSize - 2);
    } else { // Snake
        context.fillRect(posX, posY, tileSize - 1, tileSize - 1);
        context.fillStyle = 'rgba(255,255,255,0.1)';
        context.fillRect(posX, posY, tileSize - 1, 2);
        context.fillStyle = 'rgba(0,0,0,0.1)';
        context.fillRect(posX, posY + tileSize - 3, tileSize - 1, 2);

        if (isHead) {
            drawEyes();
            context.drawImage(eyeCanvas, posX, posY);
        }
    }
}

function createParticles(x, y, color) {
    const particleCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: (x + 0.5) * tileSize,
            y: (y + 0.5) * tileSize,
            vx: (Math.random() - 0.5) * 3, // Random velocity x
            vy: (Math.random() - 0.5) * 3, // Random velocity y
            radius: Math.random() * 2 + 1,
            color: color,
            life: 20 + Math.random() * 10, // Lifespan in frames
            opacity: 1
        });
    }
}

function updateAndDrawParticles(context) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.opacity = p.life / 30; // Fade out

        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            context.beginPath();
            context.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
            context.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.opacity})`;
            context.fill();
        }
    }
}

function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) { // #RGB
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) { // #RRGGBB
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `${r},${g},${b}`;
}

function drawGame(timestamp) {
    ctx.drawImage(offscreenCanvas, 0, 0);

    if (timestamp - lastBlinkUpdate > 100) { // Faster blink for bonus food
        blinkOpacity = Math.abs(Math.sin(timestamp / 100)) * 0.6 + 0.4; // Brighter blink
        lastBlinkUpdate = timestamp;
    }

    drawRect(food.x, food.y, '#e74c3c', 'normal');
    if (bonusFood) {
        drawRect(bonusFood.x, bonusFood.y, '#f1c40f', 'bonus');
    }

    snake.forEach((segment, index) => {
        const color = index === 0 ? '#2ecc71' : '#27ae60';
        drawRect(segment.x, segment.y, color, 'snake', index === 0);
    });
    updateAndDrawParticles(ctx); // Draw particles on main context
}

function loadLevel(level) {
    currentConfig = levelConfig.find(lc => lc.level === level);
    if (!currentConfig) {
        currentConfig = levelConfig[levelConfig.length - 1]; // Default to max level if something goes wrong
        console.warn(`Level ${level} config not found, using max level config.`);
    }
    OBSTACLE_COUNT = currentConfig.obstacleCount;
    // gameSpeed is set by difficulty, but can be modified by levelConfig.speedMultiplier
    setDifficulty(); // Recalculate base speed from difficulty
    gameSpeed = Math.round(gameSpeed * currentConfig.speedMultiplier); // Adjust speed for level
    
    levelDisplay.textContent = currentLevel;
    generateObstacles();
    drawStaticElements(); // Redraw background and new obstacles
}

function initGame() {
    snake = [
        { x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) },
        { x: Math.floor(boardSize / 2) - 1, y: Math.floor(boardSize / 2) },
        { x: Math.floor(boardSize / 2) - 2, y: Math.floor(boardSize / 2) }
    ];
    dx = 1;
    dy = 0;
    score = 0;
    scoreDisplay.textContent = score;
    currentLevel = 1;
    loadLevel(currentLevel);
    isPaused = false;
    changingDirection = false;
    bonusFood = null;
    clearTimeout(bonusFoodTimer);
    particles = []; // Clear particles
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'none';
    spawnFood();
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

function setDifficulty() {
    const difficulty = difficultySelect.value;
    // Halved speeds (doubled delay) as requested by user
    if (difficulty === 'easy') {
        gameSpeed = 200; // Was 100 in user's code, orig 150
    } else if (difficulty === 'medium') {
        gameSpeed = 132; // Was 66, orig 100
    } else if (difficulty === 'hard') {
        gameSpeed = 100; // Was 50, orig 70
    }
    // If a level is already loaded, re-apply its speed multiplier
    if (currentConfig) {
         gameSpeed = Math.round(gameSpeed * currentConfig.speedMultiplier);
    }
}

function gameLoop(timestamp) {
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // FPS counter (user added)
    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
        // console.log(`FPS: ${fps}`); // Can be noisy, uncomment if needed
    }

    if (timestamp - lastTime >= gameSpeed) {
        changingDirection = false;
        moveSnake();
        if (checkCollision()) {
            gameOver();
            return;
        }
        if (snake[0].x === food.x && snake[0].y === food.y) {
            createParticles(food.x, food.y, '#e74c3c');
            eatFood(false);
        }
        if (bonusFood && snake[0].x === bonusFood.x && snake[0].y === bonusFood.y) {
            createParticles(bonusFood.x, bonusFood.y, '#f1c40f');
            eatFood(true);
        }
        lastTime = timestamp;
    }

    drawGame(timestamp);
    requestAnimationFrame(gameLoop);
}

function moveSnake() {
    let headX = snake[0].x + dx;
    let headY = snake[0].y + dy;

    // Wall wrap-around logic
    if (headX < 0) headX = boardSize - 1;
    if (headX >= boardSize) headX = 0;
    if (headY < 0) headY = boardSize - 1;
    if (headY >= boardSize) headY = 0;

    const head = { x: headX, y: headY };
    snake.unshift(head);
    snake.pop();
}

function generateObstacles() {
    obstacles = [];
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        let newObstacle;
        let collisionWithSnakeOrFoodOrOtherObstacles;
        do {
            collisionWithSnakeOrFoodOrOtherObstacles = false;
            newObstacle = {
                x: Math.floor(Math.random() * boardSize),
                y: Math.floor(Math.random() * boardSize)
            };
            if (snake && snake.some(segment => segment.x === newObstacle.x && segment.y === newObstacle.y)) {
                collisionWithSnakeOrFoodOrOtherObstacles = true;
                continue;
            }
            if (obstacles.some(obs => obs.x === newObstacle.x && obs.y === newObstacle.y)) {
                collisionWithSnakeOrFoodOrOtherObstacles = true;
                continue;
            }
            if (snake && Math.abs(newObstacle.x - snake[0].x) < 3 && Math.abs(newObstacle.y - snake[0].y) < 3) {
                collisionWithSnakeOrFoodOrOtherObstacles = true;
            }
            // Check collision with potential food positions (less critical here as food spawns after)

        } while (collisionWithSnakeOrFoodOrOtherObstacles);
        obstacles.push(newObstacle);
    }
}


function spawnFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * boardSize),
            y: Math.floor(Math.random() * boardSize)
        };
    } while (
        snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
        obstacles.some(obs => obs.x === newFood.x && obs.y === newFood.y) ||
        (bonusFood && bonusFood.x === newFood.x && bonusFood.y === newFood.y)
    );
    food = newFood;

    if (!bonusFood && Math.random() < 0.25 && currentConfig) { // Spawn bonus food based on chance
        spawnBonusFood(currentConfig.bonusFoodDuration);
    }
}

function spawnBonusFood(duration) {
    clearTimeout(bonusFoodTimer);
    do {
        bonusFood = {
            x: Math.floor(Math.random() * boardSize),
            y: Math.floor(Math.random() * boardSize)
        };
    } while (
        snake.some(segment => segment.x === bonusFood.x && segment.y === bonusFood.y) ||
        obstacles.some(obs => obs.x === bonusFood.x && obs.y === bonusFood.y) ||
        (food.x === bonusFood.x && food.y === bonusFood.y)
    );
    bonusFood.spawnTime = Date.now(); // Record spawn time for pause resume logic

    bonusFoodTimer = setTimeout(() => {
        bonusFood = null;
        // drawGame(performance.now()); // drawGame is called by gameLoop
    }, duration);
}

function eatFood(isBonus) {
    if (isBonus) {
        score += BONUS_FOOD_SCORE;
        bonusEatSound.play();
        bonusFood = null;
        clearTimeout(bonusFoodTimer);
    } else {
        score++;
        eatSound.play();
        // Spawn food is now handled after particles in gameLoop, if this was normal food
    }
    scoreDisplay.textContent = score;
    snake.push({ ...snake[snake.length - 1] });

    // Level Up Logic
    if (currentConfig && score >= currentConfig.scoreToNextLevel && currentLevel < levelConfig.length) {
        currentLevel++;
        levelUpSound.play();
        loadLevel(currentLevel);
        // Potentially show a level up message on screen for a short duration
    }
    if(!isBonus) spawnFood(); // Spawn new normal food only if normal food was eaten
}

function checkCollision() {
    const head = snake[0];
    // Wall collision is removed for wrap-around

    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true; // Self collision
        }
    }
    if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
        return true; // Obstacle collision
    }
    return false;
}

function gameOver() {
    gameOverSound.play();
    clearTimeout(bonusFoodTimer);
    if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = 'flex';
}

function togglePause() {
    if (gameOverScreen.style.display === 'flex' || startScreen.style.display === 'flex') return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'flex';
        clearTimeout(bonusFoodTimer);
        if (bonusFood) {
            bonusFood.remainingTimeOnPause = currentConfig.bonusFoodDuration - (Date.now() - bonusFood.spawnTime);
        }
    } else {
        pauseScreen.style.display = 'none';
        if (bonusFood && bonusFood.remainingTimeOnPause > 0) {
            bonusFood.spawnTime = Date.now(); // Reset spawnTime to calculate remaining from now
            bonusFoodTimer = setTimeout(() => {
                bonusFood = null;
            }, bonusFood.remainingTimeOnPause);
        }
    }
}

function handleDirectionChange(newDx, newDy) {
    if (changingDirection) return;
    if ((dx === -newDx && dx !== 0) || (dy === -newDy && dy !== 0)) return;
    if (isPaused) return;
    if (startScreen.style.display === 'flex' || gameOverScreen.style.display === 'flex') return;
    changingDirection = true;
    dx = newDx;
    dy = newDy;
}

document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'p') {
        togglePause();
        return;
    }
    if (key === 'arrowup' || key === 'w') handleDirectionChange(0, -1);
    else if (key === 'arrowdown' || key === 's') handleDirectionChange(0, 1);
    else if (key === 'arrowleft' || key === 'a') handleDirectionChange(-1, 0);
    else if (key === 'arrowright' || key === 'd') handleDirectionChange(1, 0);
});

if (btnUp) btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, -1); });
if (btnDown) btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(0, 1); });
if (btnLeft) btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(-1, 0); });
if (btnRight) btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleDirectionChange(1, 0); });

startButton.addEventListener('click', () => {
    initGame();
});

restartButton.addEventListener('click', () => {
    initGame();
});

resizeCanvas();
startScreen.style.display = 'flex';
