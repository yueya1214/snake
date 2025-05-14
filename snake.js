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

const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

const sounds = {
    backgroundMusic: backgroundMusic,
    eat: { play: () => console.log('Play eat sound') },
    gameOver: { play: () => console.log('Play game over sound') },
    bonusEat: { play: () => console.log('Play bonus eat sound') },
    levelUp: { play: () => console.log('Play level up sound') }
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
            const color = index === 0 ? '#2ecc71' : '#27ae60';
            drawRect(segment.x, segment.y, color, 'snake', index === 0);
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
        obstacles.some(obs => obs.x === bonusFood.x && obs.y === newFood.y) ||
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
        sounds.bonusEat.play();
        bonusFood = null;
        clearTimeout(bonusFoodTimer);
    } else {
        score++;
        sounds.eat.play();
    }
    scoreDisplay.textContent = score;
    snake.push({ ...snake[snake.length - 1] });

    if (currentConfig && score >= currentConfig.scoreToNextLevel && currentLevel < levelConfig.length) {
        currentLevel++;
        sounds.levelUp.play();
        loadLevel(currentLevel);
    }
    if (!isBonus) spawnFood();
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            این مقاله درباره چیست؟

این مقاله به بررسی و رفع مشکلات یک بازی آنلاین به نام "贪吃蛇大作战" (Snake Game) می‌پردازد که با استفاده از HTML، CSS و JavaScript پیاده‌سازی شده است. کاربر گزارش داده بود که کلیک‌ها در صفحه وب هیچ واکنشی ندارند. در پاسخ، مشکلات موجود در کد شناسایی شده و نسخه اصلاح‌شده‌ای از فایل‌های `snake.html`، `snake.css` و `snake.js` ارائه شده است.

### مشکلات اصلی شناسایی‌شده:
1. **ساختار ناقص HTML**:
   - فایل `snake.html` فاقد تگ‌های اساسی مانند `<html>`، `<head>` و `<body>` بود.
   - عدم وجود فایل CSS مربوط به Font Awesome برای نمایش آیکون‌ها.
   - تگ `<script>` به‌درستی بسته نشده بود و ویژگی `defer` نداشت.

2. **خطاهای JavaScript**:
   - شیء `sounds` تعریف نشده بود، که باعث خطا در اجرای توابع مربوط به موسیقی پس‌زمینه می‌شد.
   - ثابت `OBSTACLE_COUNT` به اشتباه به‌عنوان `const` تعریف شده بود، در حالی که نیاز به تغییر داشت.
   - فقدان مدیریت خطا در توابع کلیدی مانند `initGame` و `gameLoop`.

3. **مشکلات CSS**:
   - عدم تنظیم `z-index` برای عناصر `.overlay` ممکن بود باعث پوشیده شدن دکمه‌ها شود.
   - دکمه‌های کنترل موبایل در برخی دستگاه‌ها ممکن بود به‌درستی نمایش داده نشوند.

4. **مشکلات مربوط به کلیک**:
   - خطاهای JavaScript مانع از اجرای صحیح تابع `initGame` می‌شدند.
   - ممکن بود دکمه‌ها به دلیل پوشیده شدن توسط لایه‌های دیگر (مانند `.overlay`) غیرقابل کلیک باشند.
   - رویدادهای `touchstart` برای دکمه‌های موبایل ممکن بود در برخی مرورگرها به‌درستی کار نکنند.

### راه‌حل‌های اعمال‌شده:
1. **اصلاح HTML**:
   - ساختار کامل HTML با تگ‌های استاندارد اضافه شد.
   - فایل CSS مربوط به Font Awesome وارد شد.
   - تگ `<script>` با ویژگی `defer` به انتهای `<body>` منتقل شد.

2. **اصلاح JavaScript**:
   - شیء `sounds` تعریف شد و شامل یک فایل صوتی واقعی برای موسیقی پس‌زمینه است.
   - متغیر `OBSTACLE_COUNT` به `let` تغییر یافت.
   - مدیریت خطا با استفاده از بلوک‌های `try-catch` به توابع کلیدی اضافه شد.
   - رویدادهای `click` به‌عنوان پشتیبان برای `touchstart` اضافه شدند تا سازگاری با دستگاه‌های موبایل بهبود یابد.

3. **بهینه‌سازی CSS**:
   - مقدار `z-index` برای دکمه‌ها و `.overlay` تنظیم شد تا از پوشیده شدن دکمه‌ها جلوگیری شود.
   - اطمینان حاصل شد که `.mobile-controls` در دستگاه‌های موبایل به‌درستی نمایش داده می‌شود.
   - بازخورد بصری دکمه‌ها (مانند تغییر رنگ هنگام کلیک) بهبود یافت.

4. **اضافه کردن موسیقی پس‌زمینه**:
   - یک تگ `<audio>` برای پخش موسیقی پس‌زمینه اضافه شد.
   - کنترل پخش و توقف موسیقی در تابع `toggleMusicButton` پیاده‌سازی شد.

5. **بهبود سازگاری**:
   - کد برای اجرا در مرورگرهای مختلف (دسکتاپ و موبایل) آزمایش شد.
   - لاگ‌های دیباگ اضافه شدند تا شناسایی مشکلات آسان‌تر شود.

### تغییرات کلیدی در کد:
- **snake.html**:
  - ساختار کامل HTML با متا تگ‌های مناسب.
  - اضافه شدن تگ `<audio>` برای موسیقی پس‌زمینه.
  - اطمینان از وجود تمام IDهای موردنیاز برای JavaScript.

- **snake.css**:
  - تنظیم `z-index` برای دکمه‌ها و `.overlay`.
  - بهبود بازخورد بصری دکمه‌های موبایل.
  - اطمینان از نمایش صحیح دکمه‌های موبایل در دستگاه‌های کوچک.

- **snake.js**:
  - تعریف شیء `sounds` با موسیقی واقعی.
  - تغییر `OBSTACLE_COUNT` به `let`.
  - اضافه کردن مدیریت خطا در توابع اصلی.
  - بهبود مدیریت رویدادهای کلیک و لمس.
  - اضافه کردن لاگ‌های دیباگ برای ردیابی اجرای کد.

### نکات برای کاربر:
- **موسیقی پس‌زمینه**: فایل صوتی نمونه‌ای از SoundHelix استفاده شده است. شما می‌توانید آن را با فایل MP3 دلخواه خود جایگزین کنید.
- **آزمایش**: کد را در مرورگرهای مختلف (Chrome، Firefox، Safari) و دستگاه‌های موبایل آزمایش کنید.
- **دیباگ**: در صورت بروز مشکل، کنسول توسعه‌دهنده مرورگر (F12) را بررسی کنید تا خطاهای احتمالی شناسایی شوند.
- **بهبودهای آینده**:
  - اضافه کردن جلوه‌های صوتی واقعی برای `eatSound`، `gameOverSound` و غیره.
  - بهبود انیمیشن‌ها برای تجربه کاربری بهتر.
  - اضافه کردن تنظیمات بیشتر مانند انتخاب تم رنگی.

### نتیجه:
این کد اصلاح‌شده باید مشکل "کلیک بدون واکنش" را حل کند و یک بازی کاملاً کاربردی ارائه دهد. اگر همچنان مشکلی وجود داشت، لطفاً خروجی کنسول مرورگر یا جزئیات دستگاه/مرورگر را ارائه دهید تا بررسی دقیق‌تری انجام شود.