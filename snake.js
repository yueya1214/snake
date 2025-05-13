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

// 移动端控制按钮
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// 游戏板尺寸
const boardSize = 20; // 网格数量
let tileSize; // 每个格子的大小，将动态计算

// 游戏状态
let snake;
let food;
let bonusFood = null; // 奖励食物
let obstacles = []; // 障碍物
let dx; // x方向速度
let dy; // y方向速度
let score;
let highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreDisplay.textContent = highScore;
let gameLoopInterval;
let gameSpeed;
let isPaused = false;
let changingDirection = false; // 防止快速连续改变方向导致蛇头反向
let bonusFoodTimer;
const BONUS_FOOD_DURATION = 8000; // 奖励食物持续时间 (8秒)
const BONUS_FOOD_SCORE = 5;
const OBSTACLE_COUNT = 5;

// 音效 (占位符 - 您需要提供真实的音频文件并取消注释)
const eatSound = { play: () => console.log('Play eat sound') }; // new Audio('sounds/eat.mp3');
const gameOverSound = { play: () => console.log('Play game over sound') }; // new Audio('sounds/gameOver.mp3');
const bonusEatSound = { play: () => console.log('Play bonus eat sound')}; // new Audio('sounds/bonus.mp3');

function resizeCanvas() {
    const containerWidth = gameBoard.parentElement.clientWidth;
    tileSize = Math.floor(containerWidth / boardSize);
    gameBoard.width = tileSize * boardSize;
    gameBoard.height = tileSize * boardSize;
    if (snake) {
        drawGame();
    }
}
window.addEventListener('resize', resizeCanvas);

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
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'none';
    setDifficulty();
    spawnFood();
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, gameSpeed);
    drawGame();
}

function setDifficulty() {
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        gameSpeed = 150;
    } else if (difficulty === 'medium') {
        gameSpeed = 100;
    } else if (difficulty === 'hard') {
        gameSpeed = 70; // 稍微增加困难难度
    }
}

function gameLoop() {
    if (isPaused) return;
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
    drawGame();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    snake.pop();
}

function drawGame() {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, gameBoard.width, gameBoard.height);

    drawObstacles();
    drawRect(food.x, food.y, '#e74c3c', 'normal'); // 食物颜色
    if (bonusFood) {
        drawRect(bonusFood.x, bonusFood.y, '#f1c40f', 'bonus'); // 奖励食物颜色
    }

    snake.forEach((segment, index) => {
        const color = index === 0 ? '#2ecc71' : '#27ae60'; // 蛇头和身体颜色
        drawRect(segment.x, segment.y, color, 'snake', index === 0);
    });
    // drawGrid();
}

function drawRect(x, y, color, type = 'snake', isHead = false) {
    ctx.fillStyle = color;
    const posX = x * tileSize;
    const posY = y * tileSize;

    if (type === 'normal' || type === 'bonus') {
        const radius = tileSize / 2;
        ctx.beginPath();
        ctx.arc(posX + radius, posY + radius, radius * (type === 'bonus' ? 0.9 : 0.8), 0, 2 * Math.PI);
        ctx.fill();
        if (type === 'bonus') { // Blinking effect for bonus food
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now() / 200)) * 0.5 + 0.3})`;
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
        }
        ctx.beginPath();
        ctx.arc(posX + radius * 0.7, posY + radius * 0.7, radius * 0.3, 0, 2 * Math.PI);
        ctx.fill();
    } else if (type === 'obstacle') {
        ctx.fillRect(posX, posY, tileSize, tileSize);
        ctx.strokeStyle = '#5D3D76'; // Darker purple for border
        ctx.lineWidth = 2;
        ctx.strokeRect(posX + 1, posY + 1, tileSize - 2, tileSize - 2);
    } else { // Snake
        ctx.fillRect(posX, posY, tileSize -1 , tileSize -1 );
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(posX, posY, tileSize -1, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(posX, posY + tileSize - 3, tileSize -1, 2);

        if(isHead){
            // Draw eyes
            ctx.fillStyle = 'white';
            const eyeRadius = tileSize / 8;
            const eyeOffsetX = dx !== 0 ? tileSize / (dx > 0 ? 3 : 1.5) : tileSize / 2.5;
            const eyeOffsetY = dy !== 0 ? tileSize / (dy > 0 ? 3 : 1.5) : tileSize / 2.5;
            
            ctx.beginPath();
            ctx.arc(posX + eyeOffsetX, posY + eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
            ctx.arc(posX + (dx !== 0 ? eyeOffsetX : tileSize - eyeOffsetX), 
                    posY + (dy !== 0 ? eyeOffsetY : tileSize - eyeOffsetY), 
                    eyeRadius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = 'black';
            const pupilRadius = eyeRadius / 2;
            ctx.beginPath();
            ctx.arc(posX + eyeOffsetX + dx * pupilRadius , posY + eyeOffsetY + dy * pupilRadius, pupilRadius, 0, 2 * Math.PI);
            ctx.arc(posX + (dx !== 0 ? eyeOffsetX : tileSize - eyeOffsetX) + dx * pupilRadius, 
                    posY + (dy !== 0 ? eyeOffsetY : tileSize - eyeOffsetY) + dy * pupilRadius, 
                    pupilRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
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
            // Check collision with initial snake position
            if (snake && snake.some(segment => segment.x === newObstacle.x && segment.y === newObstacle.y)) {
                collisionWithSnakeOrFoodOrOtherObstacles = true;
                continue;
            }
            // Check collision with existing obstacles
            if (obstacles.some(obs => obs.x === newObstacle.x && obs.y === newObstacle.y)) {
                collisionWithSnakeOrFoodOrOtherObstacles = true;
                continue;
            }
            // Avoid placing too close to initial snake head
            if (snake && Math.abs(newObstacle.x - snake[0].x) < 3 && Math.abs(newObstacle.y - snake[0].y) < 3){
                collisionWithSnakeOrFoodOrOtherObstacles = true;
            }

        } while (collisionWithSnakeOrFoodOrOtherObstacles);
        obstacles.push(newObstacle);
    }
}

function drawObstacles() {
    obstacles.forEach(obs => {
        drawRect(obs.x, obs.y, '#8e44ad', 'obstacle'); // 紫色障碍物
    });
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

    // Chance to spawn bonus food if it doesn't exist
    if (!bonusFood && Math.random() < 0.25) { // 25% chance
        spawnBonusFood();
    }
}

function spawnBonusFood() {
    clearTimeout(bonusFoodTimer); // Clear any existing timer
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
        drawGame(); // Redraw to remove bonus food
    }, BONUS_FOOD_DURATION);
}

function eatFood(isBonus) {
    if (isBonus) {
        score += BONUS_FOOD_SCORE;
        bonusEatSound.play();
        bonusFood = null; // Remove bonus food
        clearTimeout(bonusFoodTimer);
    } else {
        score++;
        eatSound.play();
        spawnFood(); // Only spawn normal food if normal food was eaten
    }
    scoreDisplay.textContent = score;
    snake.push({ ...snake[snake.length - 1] });
}

function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        return true; // Wall collision
    }
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
    clearInterval(gameLoopInterval);
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
        clearTimeout(bonusFoodTimer); // Pause bonus food timer
    } else {
        pauseScreen.style.display = 'none';
        if(bonusFood) { // Resume bonus food timer if it exists
             const remainingTime = BONUS_FOOD_DURATION - (Date.now() - (bonusFood.spawnTime || Date.now())); //簡易的剩餘時間計算
             if(remainingTime > 0){
                bonusFoodTimer = setTimeout(() => {
                    bonusFood = null;
                    drawGame();
                }, remainingTime);
             } else {
                bonusFood = null; // if somehow time is already up
             }
        }
    }
}

function handleDirectionChange(newDx, newDy) {
    if (changingDirection) return;
    // Prevent moving directly opposite
    if ((dx === -newDx && dx !== 0) || (dy === -newDy && dy !== 0)) return;

    if (isPaused) return;
    if (startScreen.style.display === 'flex' || gameOverScreen.style.display === 'flex') return;

    changingDirection = true;
    dx = newDx;
    dy = newDy;
}

document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase(); // Use toLowerCase for wasd
    if (key === 'p') {
        togglePause();
        return;
    }
    if (key === 'arrowup' || key === 'w') handleDirectionChange(0, -1);
    else if (key === 'arrowdown' || key === 's') handleDirectionChange(0, 1);
    else if (key === 'arrowleft' || key === 'a') handleDirectionChange(-1, 0);
    else if (key === 'arrowright' || key === 'd') handleDirectionChange(1, 0);
});

// Mobile controls listeners
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