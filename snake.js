const gameBoard = document.getElementById('game-board');
const gameBoardContainer = gameBoard.parentElement;
const ctx = gameBoard.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const levelDisplay = document.getElementById('level');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const finalScoreDisplay = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const difficultySelect = document.getElementById('difficulty');
const toggleMusicButton = document.getElementById('toggle-music-button');
const backgroundMusic = document.getElementById('background-music');
const highscoreValueDisplay = document.getElementById('highscore-value');

// 获取音效元素
const eatSound = document.getElementById('eat-sound');
const bonusSound = document.getElementById('bonus-sound');
const gameOverSound = document.getElementById('game-over-sound');
const levelUpSound = document.getElementById('level-up-sound');

const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

const sounds = {
    backgroundMusic: backgroundMusic,
    eat: eatSound || { play: () => console.log('Play eat sound') },
    gameOver: gameOverSound || { play: () => console.log('Play game over sound') },
    bonusEat: bonusSound || { play: () => console.log('Play bonus eat sound') },
    levelUp: levelUpSound || { play: () => console.log('Play level up sound') }
};

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
let isMusicPlaying = true;
let changingDirection = false;
let bonusFoodTimer;
let obstacleCount = 5;
const BONUS_FOOD_SCORE = 5;
let currentLevel = 1;
let particles = [];
let explosionParticles = [];
let isGameOverAnimating = false;
let achievementsEarned = [];

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

const levelConfig = [
    { level: 1, scoreToNextLevel: 5, obstacleCount: 3, bonusFoodDuration: 8000, speedMultiplier: 1.0 },
    { level: 2, scoreToNextLevel: 15, obstacleCount: 5, bonusFoodDuration: 7500, speedMultiplier: 0.95 },
    { level: 3, scoreToNextLevel: 30, obstacleCount: 7, bonusFoodDuration: 7000, speedMultiplier: 0.9 },
    { level: 4, scoreToNextLevel: 50, obstacleCount: 10, bonusFoodDuration: 6500, speedMultiplier: 0.85 },
    { level: 5, scoreToNextLevel: Infinity, obstacleCount: 12, bonusFoodDuration: 6000, speedMultiplier: 0.8 }
];

let currentConfig;

// 成就系统
const achievements = [
    { id: 'beginner', name: '初学者', description: '获得第一个积分', threshold: 1, icon: '🍎' },
    { id: 'snake_hunter', name: '蛇猎人', description: '达到10分', threshold: 10, icon: '🏆' },
    { id: 'snake_master', name: '蛇大师', description: '达到25分', threshold: 25, icon: '👑' },
    { id: 'snake_king', name: '蛇王', description: '达到50分', threshold: 50, icon: '🌟' },
    { id: 'bonus_collector', name: '奖励收集者', description: '吃到3个奖励食物', bonusCount: 3, icon: '💎' },
    { id: 'speed_demon', name: '速度恶魔', description: '在困难模式下获得15分', threshold: 15, difficulty: 'hard', icon: '🔥' }
];

let stats = {
    gamesPlayed: 0,
    totalScore: 0,
    bonusFoodEaten: 0,
    sessionBest: 0
};

// 尝试从localStorage加载统计数据
try {
    const savedStats = localStorage.getItem('snakeStats');
    if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        if (parsedStats && typeof parsedStats === 'object') {
            stats = {...stats, ...parsedStats};
        }
    }
} catch(e) {
    console.error('加载统计数据失败:', e);
}

function resizeCanvas() {
    try {
        const containerWidth = gameBoard.parentElement.clientWidth;
        tileSize = Math.floor(containerWidth / boardSize);
        gameBoard.width = tileSize * boardSize;
        gameBoard.height = tileSize * boardSize;
        offscreenCanvas.width = gameBoard.width;
        offscreenCanvas.height = gameBoard.height;
        eyeCanvas.width = tileSize;
        eyeCanvas.height = tileSize;
        if (currentConfig) drawStaticElements();
        if (snake) drawGame(performance.now());
    } catch (error) {
        console.error('Error in resizeCanvas:', error);
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

function drawRect(x, y, color, type = 'snake', isHead = false, isTail = false, context = ctx) {
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
        // 蛇的绘制
        if (isHead) {
            // 蛇头 - 绘制为圆形
            const headRadius = tileSize / 2 - 1;
            context.beginPath();
            context.arc(posX + tileSize / 2, posY + tileSize / 2, headRadius, 0, 2 * Math.PI);
            context.fill();
            
            // 添加头部皮肤纹理
            context.fillStyle = 'rgba(0,0,0,0.1)';
            context.beginPath();
            context.arc(posX + tileSize / 2, posY + tileSize / 2, headRadius * 0.7, 0, 2 * Math.PI);
            context.fill();
            
            drawEyes();
            context.drawImage(eyeCanvas, posX, posY);
        } else if (isTail) {
            // 蛇尾 - 绘制为小一些的圆形
            context.beginPath();
            context.arc(posX + tileSize / 2, posY + tileSize / 2, tileSize / 3, 0, 2 * Math.PI);
            context.fill();
            
            // 尾部纹理
            context.fillStyle = 'rgba(0,0,0,0.15)';
            context.beginPath();
            context.arc(posX + tileSize / 2, posY + tileSize / 2, tileSize / 6, 0, 2 * Math.PI);
            context.fill();
        } else {
            // 蛇身 - 圆角矩形
            const radius = tileSize / 4;
            context.beginPath();
            context.moveTo(posX + radius, posY);
            context.lineTo(posX + tileSize - radius, posY);
            context.quadraticCurveTo(posX + tileSize, posY, posX + tileSize, posY + radius);
            context.lineTo(posX + tileSize, posY + tileSize - radius);
            context.quadraticCurveTo(posX + tileSize, posY + tileSize, posX + tileSize - radius, posY + tileSize);
            context.lineTo(posX + radius, posY + tileSize);
            context.quadraticCurveTo(posX, posY + tileSize, posX, posY + tileSize - radius);
            context.lineTo(posX, posY + radius);
            context.quadraticCurveTo(posX, posY, posX + radius, posY);
            context.closePath();
            context.fill();
            
            // 添加身体纹理
            context.fillStyle = 'rgba(255,255,255,0.1)';
            context.fillRect(posX + 2, posY + 2, tileSize - 4, tileSize / 3);
        }
    }
}

function createParticles(x, y, color, countMultiplier = 1, speedMultiplier = 1, lifeMultiplier = 1) {
    const particleCount = Math.floor((8 + Math.random() * 7) * countMultiplier);
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: (x + 0.5) * tileSize,
            y: (y + 0.5) * tileSize,
            vx: (Math.random() - 0.5) * (3 * speedMultiplier),
            vy: (Math.random() - 0.5) * (3 * speedMultiplier),
            radius: Math.random() * 2.5 + 1.5,
            color: color,
            life: (30 + Math.random() * 20) * lifeMultiplier,
            opacity: 1
        });
    }
}

function updateAndDrawParticles(context) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        p.opacity = Math.max(0, p.life / (30 * (p.lifeMultiplier || 1)));

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

function createExplosionParticles(snakeSegments) {
    explosionParticles = [];
    snakeSegments.forEach(segment => {
        const particleCount = 10 + Math.floor(Math.random() * 10);
        for (let i = 0; i < particleCount; i++) {
            explosionParticles.push({
                x: (segment.x + 0.5) * tileSize,
                y: (segment.y + 0.5) * tileSize,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - Math.random() * 3,
                radius: Math.random() * 3 + 2,
                color: i % 2 === 0 ? '#2ecc71' : '#27ae60',
                life: 40 + Math.random() * 30,
                opacity: 1
            });
        }
    });
}

function updateAndDrawExplosion(context) {
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
        p.opacity = Math.max(0, p.life / 60);

        if (p.life <= 0) {
            explosionParticles.splice(i, 1);
        } else {
            context.beginPath();
            context.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
            context.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.opacity})`;
            context.fill();
        }
    }
    
    // 如果爆炸动画结束且游戏结束屏幕未显示，则显示游戏结束屏幕
    if (explosionParticles.length === 0 && isGameOverAnimating && gameOverScreen.style.display !== 'flex') {
        isGameOverAnimating = false;
        gameOverScreen.style.display = 'flex';
        console.log('爆炸动画结束: 游戏结束屏幕已显示');
    }
    
    return explosionParticles.length > 0;
}

function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `${r},${g},${b}`;
}

function drawGame(timestamp) {
    ctx.drawImage(offscreenCanvas, 0, 0);

    if (timestamp - lastBlinkUpdate > 100) {
        blinkOpacity = Math.abs(Math.sin(timestamp / 100)) * 0.6 + 0.4;
        lastBlinkUpdate = timestamp;
    }

    drawRect(food.x, food.y, '#e74c3c', 'normal');
    if (bonusFood) {
        drawRect(bonusFood.x, bonusFood.y, '#f1c40f', 'bonus');
    }

    if (!isGameOverAnimating) {
        snake.forEach((segment, index) => {
            const isHead = index === 0;
            const isTail = index === snake.length - 1;
            
            // 颜色渐变效果，从头到尾
            let color;
            if (isHead) {
                color = '#2ecc71'; // 蛇头颜色
            } else if (isTail) {
                color = '#27ae60'; // 蛇尾颜色
            } else {
                // 身体部分使用渐变色，从亮到暗
                const ratio = 1 - (index / snake.length);
                const r = Math.round(46 + (46 * ratio));
                const g = Math.round(204 + (17 * ratio));
                const b = Math.round(113 + (-17 * ratio));
                color = `rgb(${r}, ${g}, ${b})`;
            }
            
            drawRect(segment.x, segment.y, color, 'snake', isHead, isTail);
        });
    }
    updateAndDrawParticles(ctx);
    if (isGameOverAnimating) updateAndDrawExplosion(ctx);
}

function loadLevel(level) {
    try {
        currentConfig = levelConfig.find(lc => lc.level === level) || levelConfig[levelConfig.length - 1];
        obstacleCount = currentConfig.obstacleCount;
        setDifficulty();
        gameSpeed = Math.round(gameSpeed * currentConfig.speedMultiplier);
        levelDisplay.textContent = currentLevel;
        generateObstacles();
        drawStaticElements();
    } catch (error) {
        console.error('Error in loadLevel:', error);
    }
}

function initGame() {
    try {
        console.log('Initializing game...');
        resetGameAchievements();
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
        isGameOverAnimating = false;
        changingDirection = false;
        bonusFood = null;
        clearTimeout(bonusFoodTimer);
        particles = [];
        explosionParticles = [];
        pauseScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'none';
        spawnFood();
        lastTime = 0;
        if (isMusicPlaying && sounds.backgroundMusic.play) {
            sounds.backgroundMusic.play().catch(e => console.error('Music play error:', e));
        }
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Error in initGame:', error);
    }
}

function setDifficulty() {
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        gameSpeed = 200;
    } else if (difficulty === 'medium') {
        gameSpeed = 132;
    } else if (difficulty === 'hard') {
        gameSpeed = 100;
    }
    if (currentConfig) {
        gameSpeed = Math.round(gameSpeed * currentConfig.speedMultiplier);
    }
}

function gameLoop(timestamp) {
    try {
        if (isPaused && !isGameOverAnimating) {
            requestAnimationFrame(gameLoop);
            return;
        }

        frameCount++;
        if (timestamp - lastFpsUpdate >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFpsUpdate = timestamp;
        }

        if (isGameOverAnimating) {
            drawGame(timestamp);
            if (!updateAndDrawExplosion(ctx)) {
                isGameOverAnimating = false;
                gameOverScreen.style.display = 'flex';
                console.log('游戏循环: 游戏结束屏幕已显示');
            }
            requestAnimationFrame(gameLoop);
            return;
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
                showFloatingScore('+1', food.x, food.y);
                eatFood(false);
            }
            if (bonusFood && snake[0].x === bonusFood.x && snake[0].y === bonusFood.y) {
                createParticles(bonusFood.x, bonusFood.y, '#f1c40f', 1.5, 1.2, 1.2);
                showFloatingScore(`+${BONUS_FOOD_SCORE}`, bonusFood.x, bonusFood.y, '#f1c40f');
                eatFood(true);
            }
            lastTime = timestamp;
        }

        drawGame(timestamp);
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Error in gameLoop:', error);
        // 出错时也确保显示游戏结束屏幕
        if (checkCollision()) {
            isGameOverAnimating = false;
            gameOverScreen.style.display = 'flex';
        }
    }
}

function moveSnake() {
    let headX = snake[0].x + dx;
    let headY = snake[0].y + dy;

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
    for (let i = 0; i < obstacleCount; i++) {
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

    if (!bonusFood && Math.random() < 0.25 && currentConfig) {
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
    bonusFood.spawnTime = Date.now();

    bonusFoodTimer = setTimeout(() => {
        bonusFood = null;
    }, duration);
}

function eatFood(isBonus) {
    if (isBonus) {
        score += BONUS_FOOD_SCORE;
        playSound(sounds.bonusEat);
        bonusFood = null;
        clearTimeout(bonusFoodTimer);
        stats.bonusFoodEaten++;
        checkAchievements();
    } else {
        score++;
        playSound(sounds.eat);
        checkAchievements();
    }
    
    scoreDisplay.textContent = score;
    snake.push({ ...snake[snake.length - 1] });

    if (currentConfig && score >= currentConfig.scoreToNextLevel && currentLevel < levelConfig.length) {
        currentLevel++;
        playSound(sounds.levelUp);
        loadLevel(currentLevel);
    }
    if (!isBonus) spawnFood();
}

function checkCollision() {
    const head = snake[0];
    
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
    playSound(sounds.gameOver);
    if (sounds.backgroundMusic.pause) sounds.backgroundMusic.pause();
    clearTimeout(bonusFoodTimer);
    createExplosionParticles([...snake]); // Pass a copy of snake segments
    isGameOverAnimating = true; // Start animation loop
    
    // 更新统计数据
    stats.gamesPlayed++;
    stats.totalScore += score;
    stats.sessionBest = Math.max(stats.sessionBest, score);
    
    try {
        localStorage.setItem('snakeStats', JSON.stringify(stats));
    } catch(e) {
        console.error('保存统计数据失败:', e);
    }
    
    // 更新最高分并立即保存
    if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = highScore;
        try {
            localStorage.setItem('snakeHighScore', highScore);
            console.log('最高分已保存:', highScore);
        } catch (e) {
            console.error('保存最高分失败:', e);
        }
    }
    
    finalScoreDisplay.textContent = score;
    if (highscoreValueDisplay) highscoreValueDisplay.textContent = highScore;
    
    // 显示本次游戏成就
    if (achievementsEarned.length > 0) {
        showAchievementSummary();
    }
    
    // 确保动画结束后显示游戏结束屏幕
    setTimeout(() => {
        if (isGameOverAnimating) {
            isGameOverAnimating = false;
            gameOverScreen.style.display = 'flex';
            console.log('游戏结束屏幕已显示');
        }
    }, 1500); // 1.5秒后强制显示结束屏幕，无论爆炸动画是否完成
    
    // 强制设置一个备份定时器，确保无论如何都会显示游戏结束界面
    setTimeout(() => {
        if (gameOverScreen.style.display !== 'flex') {
            isGameOverAnimating = false;
            gameOverScreen.style.display = 'flex';
            console.log('备份定时器：游戏结束屏幕已显示');
        }
    }, 2500);
}

function togglePause() {
    if (isGameOverAnimating) return; // Don't allow pause during game over animation
    if (gameOverScreen.style.display === 'flex' || startScreen.style.display === 'flex') return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.style.display = 'flex';
        clearTimeout(bonusFoodTimer);
        if (bonusFood) {
            bonusFood.remainingTimeOnPause = currentConfig.bonusFoodDuration - (Date.now() - bonusFood.spawnTime);
        }
        if (isMusicPlaying && sounds.backgroundMusic.pause) sounds.backgroundMusic.pause();
    } else {
        pauseScreen.style.display = 'none';
        if (bonusFood && bonusFood.remainingTimeOnPause > 0) {
            bonusFood.spawnTime = Date.now();
            bonusFoodTimer = setTimeout(() => {
                bonusFood = null;
            }, bonusFood.remainingTimeOnPause);
        }
        if (isMusicPlaying && sounds.backgroundMusic.play) sounds.backgroundMusic.play();
    }
}

function showFloatingScore(text, x, y, color = '#fff') {
    const scoreText = document.createElement('div');
    scoreText.classList.add('floating-score');
    scoreText.textContent = text;
    scoreText.style.left = `${(x + 0.25) * tileSize}px`;
    scoreText.style.top = `${(y + 0.25) * tileSize}px`;
    scoreText.style.color = color;

    gameBoardContainer.appendChild(scoreText);

    requestAnimationFrame(() => {
        scoreText.style.transform = 'translateY(-30px)';
        scoreText.style.opacity = '0';
    });

    setTimeout(() => {
        if (scoreText.parentElement) {
            scoreText.parentElement.removeChild(scoreText);
        }
    }, 500);
}

function handleDirectionChange(newDx, newDy, buttonElement = null) {
    if (changingDirection) return;
    if ((dx === -newDx && dx !== 0) || (dy === -newDy && dy !== 0)) return;
    if (isPaused || isGameOverAnimating) return;
    if (startScreen.style.display === 'flex' || gameOverScreen.style.display === 'flex') return;
    changingDirection = true;
    dx = newDx;
    dy = newDy;

    if (buttonElement) {
        buttonElement.classList.add('active-feedback');
        setTimeout(() => buttonElement.classList.remove('active-feedback'), 100);
    }
}

document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'p') {
        togglePause();
        return;
    }
    
    // 空格键重新开始游戏
    if (key === ' ' && gameOverScreen.style.display === 'flex') {
        console.log('空格键重新开始游戏');
        gameOverScreen.style.display = 'none';
        initGame();
        return;
    }
    
    let targetButton = null;
    if (key === 'arrowup' || key === 'w') { handleDirectionChange(0, -1); targetButton = btnUp; }
    else if (key === 'arrowdown' || key === 's') { handleDirectionChange(0, 1); targetButton = btnDown; }
    else if (key === 'arrowleft' || key === 'a') { handleDirectionChange(-1, 0); targetButton = btnLeft; }
    else if (key === 'arrowright' || key === 'd') { handleDirectionChange(1, 0); targetButton = btnRight; }

    // Simulate button press feedback for keyboard
    if (targetButton && targetButton.offsetParent !== null) { // Check if button is visible
        targetButton.classList.add('active-feedback');
        setTimeout(() => targetButton.classList.remove('active-feedback'), 100);
    }
});

// Mobile controls listeners with feedback
[btnUp, btnDown, btnLeft, btnRight].forEach(btn => {
    if (btn) {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            let newDx = 0, newDy = 0;
            if (btn === btnUp) newDy = -1;
            else if (btn === btnDown) newDy = 1;
            else if (btn === btnLeft) newDx = -1;
            else if (btn === btnRight) newDx = 1;
            handleDirectionChange(newDx, newDy, btn);
        });
        
        // 添加click事件作为备选，提升兼容性
        btn.addEventListener('click', (e) => {
            let newDx = 0, newDy = 0;
            if (btn === btnUp) newDy = -1;
            else if (btn === btnDown) newDy = 1;
            else if (btn === btnLeft) newDx = -1;
            else if (btn === btnRight) newDx = 1;
            handleDirectionChange(newDx, newDy, btn);
        });
    }
});

if (toggleMusicButton) {
    toggleMusicButton.addEventListener('click', () => {
        isMusicPlaying = !isMusicPlaying;
        if (isMusicPlaying) {
            if (sounds.backgroundMusic.play && !isPaused && startScreen.style.display === 'none' && !isGameOverAnimating) {
                sounds.backgroundMusic.play().catch(e => console.log('Music play error:', e));
            }
            toggleMusicButton.innerHTML = '<i class="fas fa-music"></i> 背景音乐: 开';
        } else {
            if (sounds.backgroundMusic.pause) sounds.backgroundMusic.pause();
            toggleMusicButton.innerHTML = '<i class="fas fa-volume-mute"></i> 背景音乐: 关';
        }
    });
}

// 为开始按钮添加事件监听
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
});

// 为重新开始按钮添加事件监听
restartButton.addEventListener('click', () => {
    console.log('重新开始按钮被点击');
    gameOverScreen.style.display = 'none';
    initGame();
}, { once: false });

// 修改加载高分部分，使用try-catch提高健壮性
try {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        if (!isNaN(highScore)) {
            highScoreDisplay.textContent = highScore;
            if (highscoreValueDisplay) highscoreValueDisplay.textContent = highScore;
            console.log('已加载最高分:', highScore);
        }
    }
} catch (e) {
    console.error('读取最高分失败:', e);
}

// 初始显示开始界面
resizeCanvas();
startScreen.style.display = 'flex';

// 添加触摸屏幕暂停功能
gameBoard.addEventListener('click', function(e) {
    if (!isPaused && !isGameOverAnimating && 
        startScreen.style.display !== 'flex' && 
        gameOverScreen.style.display !== 'flex') {
        togglePause();
    }
});

window.addEventListener('resize', resizeCanvas);

// 检查成就
function checkAchievements() {
    achievements.forEach(achievement => {
        // 跳过已获得的成就
        if (achievementsEarned.includes(achievement.id)) return;
        
        let isEarned = false;
        
        if (achievement.threshold && score >= achievement.threshold) {
            if (!achievement.difficulty || achievement.difficulty === difficultySelect.value) {
                isEarned = true;
            }
        }
        
        if (achievement.bonusCount && stats.bonusFoodEaten >= achievement.bonusCount) {
            isEarned = true;
        }
        
        if (isEarned) {
            achievementsEarned.push(achievement.id);
            showAchievementNotification(achievement);
        }
    });
}

// 显示成就通知
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.classList.add('achievement-notification');
    notification.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <div class="achievement-title">成就解锁: ${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒后隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 500);
    }, 3000);
}

// 显示成就总结
function showAchievementSummary() {
    let earnedDetails = '';
    achievementsEarned.forEach(id => {
        const achievement = achievements.find(a => a.id === id);
        if (achievement) {
            earnedDetails += `<div class="earned-achievement">${achievement.icon} ${achievement.name}</div>`;
        }
    });
    
    // 在游戏结束屏幕上添加成就信息
    const summaryElement = document.createElement('div');
    summaryElement.classList.add('achievements-summary');
    summaryElement.innerHTML = `
        <h3>获得的成就</h3>
        ${earnedDetails || '<p>本局没有新成就</p>'}
    `;
    
    // 检查是否已有成就总结，如果有则替换，否则添加
    const existingSummary = gameOverScreen.querySelector('.achievements-summary');
    if (existingSummary) {
        existingSummary.parentElement.replaceChild(summaryElement, existingSummary);
    } else {
        // 将新的成就总结插入到重新开始按钮之前
        const restartButton = gameOverScreen.querySelector('#restart-button');
        if (restartButton) {
            gameOverScreen.insertBefore(summaryElement, restartButton);
        } else {
            gameOverScreen.appendChild(summaryElement);
        }
    }
}

// 重置当前游戏的成就记录
function resetGameAchievements() {
    achievementsEarned = [];
}

// 音效处理函数
function playSound(sound) {
    if (sound && typeof sound.play === 'function') {
        // 重置音频以确保可以再次播放
        if (sound.currentTime) sound.currentTime = 0;
        // 播放音效
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error('播放音效失败:', e);
            });
        }
    }
}