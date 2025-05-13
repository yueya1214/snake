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

// 游戏板尺寸
const boardSize = 20; // 网格数量
let tileSize; // 每个格子的大小，将动态计算

// 游戏状态
let snake;
let food;
let dx; // x方向速度
let dy; // y方向速度
let score;
let highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreDisplay.textContent = highScore;
let gameLoopInterval;
let gameSpeed;
let isPaused = false;
let changingDirection = false; // 防止快速连续改变方向导致蛇头反向

// 音效 (可选，如果需要可以添加)
// const eatSound = new Audio('eat.mp3');
// const gameOverSound = new Audio('gameOver.mp3');

function resizeCanvas() {
    const containerWidth = gameBoard.parentElement.clientWidth;
    // 保证是 boardSize 的整数倍，并且是方形
    tileSize = Math.floor(containerWidth / boardSize);
    gameBoard.width = tileSize * boardSize;
    gameBoard.height = tileSize * boardSize;
    // 如果游戏正在进行，重新绘制
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
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'none';
    setDifficulty();
    spawnFood();
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = setInterval(gameLoop, gameSpeed);
    drawGame(); // 初始绘制
}

function setDifficulty() {
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        gameSpeed = 150;
    } else if (difficulty === 'medium') {
        gameSpeed = 100;
    } else if (difficulty === 'hard') {
        gameSpeed = 60;
    }
}

function gameLoop() {
    if (isPaused) return;
    changingDirection = false; // 允许下一次方向改变
    moveSnake();
    if (checkCollision()) {
        gameOver();
        return;
    }
    if (snake[0].x === food.x && snake[0].y === food.y) {
        eatFood();
    }
    drawGame();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    snake.pop(); // 移除尾巴，除非吃到食物
}

function drawGame() {
    // 清除画布
    ctx.fillStyle = '#2c3e50'; // 背景色
    ctx.fillRect(0, 0, gameBoard.width, gameBoard.height);

    // 绘制食物
    drawRect(food.x, food.y, '#e74c3c', true); // 食物颜色

    // 绘制蛇
    snake.forEach((segment, index) => {
        const color = index === 0 ? '#2ecc71' : '#27ae60'; // 蛇头和身体颜色
        drawRect(segment.x, segment.y, color);
    });
    
    // 绘制网格线 (可选)
    // drawGrid();
}

function drawRect(x, y, color, isFood = false) {
    ctx.fillStyle = color;
    if (isFood) {
        // 食物绘制为圆形或特殊形状
        const radius = tileSize / 2;
        ctx.beginPath();
        ctx.arc(x * tileSize + radius, y * tileSize + radius, radius * 0.8, 0, 2 * Math.PI);
        ctx.fill();
        // 添加一点高光效果
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(x * tileSize + radius*0.7, y * tileSize + radius*0.7, radius * 0.3, 0, 2 * Math.PI);
        ctx.fill();

    } else {
        ctx.fillRect(x * tileSize, y * tileSize, tileSize -1 , tileSize -1 ); // 留出1像素间隙
         // 给蛇块添加一点3D效果
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize -1, 2); // 上边高光
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x * tileSize, (y+1) * tileSize - 3, tileSize -1, 2); //下边阴影
    }
}

function drawGrid() {
    ctx.strokeStyle = '#34495e'; // 网格线颜色
    for (let x = 0; x < boardSize; x++) {
        for (let y = 0; y < boardSize; y++) {
            ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize)
    };
    // 防止食物生成在蛇身上
    snake.forEach(segment => {
        if (segment.x === food.x && segment.y === food.y) {
            spawnFood();
        }
    });
}

function eatFood() {
    score++;
    scoreDisplay.textContent = score;
    // if (eatSound) eatSound.play();
    snake.push({ ...snake[snake.length - 1] }); // 简单地在尾部增加一节
    spawnFood();

    // 加速 (可选)
    // if (score % 5 === 0 && gameSpeed > 40) {
    //     gameSpeed -= 5;
    //     clearInterval(gameLoopInterval);
    //     gameLoopInterval = setInterval(gameLoop, gameSpeed);
    // }
}

function checkCollision() {
    const head = snake[0];
    // 撞墙
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        return true;
    }
    // 撞自己
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

function gameOver() {
    // if (gameOverSound) gameOverSound.play();
    clearInterval(gameLoopInterval);
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
    } else {
        pauseScreen.style.display = 'none';
    }
}

document.addEventListener('keydown', e => {
    if (changingDirection) return; // 如果正在改变方向，则忽略本次按键

    const key = e.key;
    if (key === 'p' || key === 'P') {
        togglePause();
        return;
    }

    if (isPaused && !(key === 'p' || key === 'P')) return; // 如果暂停了，只响应P键
    if (startScreen.style.display === 'flex' || gameOverScreen.style.display === 'flex') return; // 游戏未开始或已结束不响应方向键

    changingDirection = true; // 标记正在改变方向

    if ((key === 'ArrowUp' || key === 'w' || key === 'W') && dy === 0) {
        dx = 0; dy = -1;
    } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && dy === 0) {
        dx = 0; dy = 1;
    } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && dx === 0) {
        dx = -1; dy = 0;
    } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && dx === 0) {
        dx = 1; dy = 0;
    } else {
        changingDirection = false; // 如果不是有效的方向键，则重置
    }
});

startButton.addEventListener('click', () => {
    initGame();
});

restartButton.addEventListener('click', () => {
    initGame();
});

// 初始化画布大小和显示开始界面
resizeCanvas(); 
startScreen.style.display = 'flex'; 