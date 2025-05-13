const gameBoard = document.getElementById('game-board');
const ctx = gameBoard.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
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
let gameSpeed;
let isPaused = false;
let changingDirection = false;
let bonusFoodTimer;
const BONUS_FOOD_DURATION = 8000;
const BONUS_FOOD_SCORE = 5;
const OBSTACLE_COUNT = 5;

const eatSound = { play: () => console.log('Play eat sound') };
const gameOverSound = { play: () => console.log('Play game over sound') };
const bonusEatSound = { play: () => console.log('Play bonus eat sound') };

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');
const eyeCanvas = document.createElement('canvas');
const eyeCtx = eyeCanvas.getContext('2d');

let lastTime = 0;
let blinkOpacity = 0.3;
let lastBlinkUpdate = 0;
let frameCount = 0;
let fps = 0;
let lastFpsUpdate = 0;

function resizeCanvas() {
    const containerWidth = gameBoard.parentElement.clientWidth;
    tileSize = Math.floor(containerWidth / boardSize);
    gameBoard.width = tileSize * boardSize;
    gameBoard.height = tileSize * boardSize;
    offscreenCanvas.width = gameBoard.width;
    offscreenCanvas.height = gameBoard.height;
    eyeCanvas.width = tileSize;
    eyeCanvas.height = tileSize;
    drawStaticElements();
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
    } else {
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

function drawGame(timestamp) {
    ctx.drawImage(offscreenCanvas, 0, 0);

    if (timestamp - lastBlinkUpdate > 200) {
        blinkOpacity = Math.abs(Math.sin(timestamp / 200)) * 0.5 + 0.3;
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
    isPaused = false;
    changingDirection = false;
    bonusFood = null;
    clearTimeout(bonusFoodTimer);
    obstacles = [];
    generateObstacles();
    drawStaticElements();
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'none';
    setDifficulty();
    spawnFood();
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

function setDifficulty() {
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        gameSpeed = 100;
    } else if (difficulty === 'medium') {
        gameSpeed = 66;
    } else if (difficulty === 'hard') {
        gameSpeed = 50;
    }
}

function gameLoop(timestamp) {
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
        console.log(`FPS: ${fps}`);
    }

    if (timestamp - lastTime >= gameSpeed) {
        changingDirection = false;
        moveSnake();
        if (checkCollision()) {
            gameOver();
            return;
        }
        if (snake[0].x === food.x && snake[0].y === food.y) {
            eatFood(false);
        }
        if (bonusFood && snake[0].x === bonusFood.x && snake[0].y === bonusFood.y) {
            eatFood(true);
        }
        lastTime = timestamp;
    }

    drawGame(timestamp);
    requestAnimationFrame(gameLoop);
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
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

    if (!bonusFood && Math.random() < 0.25) {
        spawnBonusFood();
    }
}

function spawnBonusFood() {
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

    bonusFoodTimer = setTimeout(() => {
        bonusFood = null;
        drawGame(performance.now());
    }, BONUS_FOOD_DURATION);
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
        spawnFood();
    }
    scoreDisplay.textContent = score;
    snake.push({ ...snake[snake.length - 1] });
}

function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        return true;
    }
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
        return true;
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
    } else {
        pauseScreen.style.display = 'none';
        if (bonusFood) {
            const remainingTime = BONUS_FOOD_DURATION - (Date.now() - (bonusFood.spawnTime || Date.now()));
            if (remainingTime > 0) {
                bonusFoodTimer = setTimeout(() => {
                    bonusFood = null;
                    drawGame(performance.now());
                }, remainingTime);
            } else {
                bonusFood = null;
            }
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

if (btnUp) btnUp.addEventListener('click', () => handleDirectionChange(0, -1));
if (btnDown) btnDown.addEventListener('click', () => handleDirectionChange(0, 1));
if (btnLeft) btnLeft.addEventListener('click', () => handleDirectionChange(-1, 0));
if (btnRight) btnRight.addEventListener('click', () => handleDirectionChange(1, 0));

startButton.addEventListener('click', () => {
    initGame();
});

restartButton.addEventListener('click', () => {
    initGame();
});

resizeCanvas();
startScreen.style.display = 'flex';
