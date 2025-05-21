// 添加加载状态检查
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing game...');
    
    // 动态加载模块
    Promise.all([
        import('./config.js'),
        import('./game-core.js'), 
        import('./renderer.js'),
        import('./achievements.js'),
        import('./utils.js')
    ]).then(modules => {
        console.log('All modules loaded successfully');
        const [config, { GameCore }, { Renderer }, { AchievementSystem }, { playSound, loadFromStorage }] = modules;
        
        class SnakeGame {
            constructor() {
                console.log('Initializing SnakeGame...');
                
                // 获取DOM元素并添加调试
                const elements = {
                    canvas: document.getElementById('game-board'),
                    startScreen: document.getElementById('start-screen'),
                    gameOverScreen: document.getElementById('game-over-screen'),
                    startButton: document.getElementById('start-button'),
                    restartButton: document.getElementById('restart-button')
                };
                
                // 调试输出元素状态
                console.log('DOM elements:', elements);
                
                // 验证元素存在
                for (const [name, element] of Object.entries(elements)) {
                    if (!element) {
                        console.error(`Missing element: ${name}`);
                    }
                }
                
                // 赋值到实例
                Object.assign(this, elements);
                
                // 如果关键元素缺失，尝试创建备用按钮
                if (!this.startButton) {
                    console.warn('Creating fallback start button');
                    this.startButton = document.createElement('button');
                    this.startButton.textContent = '开始游戏';
                    this.startButton.style.position = 'fixed';
                    this.startButton.style.top = '20px';
                    this.startButton.style.left = '20px';
                    this.startButton.style.zIndex = '1000';
                    document.body.appendChild(this.startButton);
                }
                    
                    // 初始化游戏模块
                    this.game = new GameCore();
                    this.renderer = new Renderer(this.canvas);
                    this.achievements = new AchievementSystem();
                    
                    // 测试简单点击事件
                    this.startButton.onclick = () => {
                        console.log('Simple onclick handler triggered');
                        this.startGame();
                    };
                    
                    // 添加多个事件监听方式测试
                    this.startButton.addEventListener('click', (e) => {
                        console.log('addEventListener click triggered', e);
                        this.startGame();
                    }, {capture: true});
                    
                    // 可视化调试元素
                    console.log('Visual debugging elements...');
                    [this.startButton, this.restartButton].forEach(btn => {
                        if (btn) {
                            btn.style.outline = '2px solid red';
                            btn.style.boxShadow = '0 0 0 2px rgba(255,0,0,0.5)';
                            console.log(`Button ${btn.id} position:`, btn.getBoundingClientRect());
                        }
                    });

                    // 检查元素覆盖情况
                    function checkElementOverlap(element) {
                        const rect = element.getBoundingClientRect();
                        const centerX = rect.left + rect.width/2;
                        const centerY = rect.top + rect.height/2;
                        
                        const topElement = document.elementFromPoint(centerX, centerY);
                        console.log(`Element at button center:`, topElement);
                        
                        return topElement === element;
                    }

                    console.log('Start button clickable:', checkElementOverlap(this.startButton));
                    console.log('Restart button clickable:', checkElementOverlap(this.restartButton));

                    // 强制使按钮可点击
                    this.startButton.style.position = 'relative';
                    this.startButton.style.zIndex = '9999';
                    this.restartButton.style.position = 'relative';
                    this.restartButton.style.zIndex = '9999';

                    // 简化并调试点击事件
                    const handleStartClick = () => {
                        console.log('Start button clicked - simple handler');
                        this.startGame();
                    };
                    
                    const handleRestartClick = () => {
                        console.log('Restart button clicked - simple handler');
                        this.resetGame();
                    };
                    
                    // 移除所有现有事件监听器
                    this.startButton.replaceWith(this.startButton.cloneNode(true));
                    this.restartButton.replaceWith(this.restartButton.cloneNode(true));
                    
                    // 获取新的按钮引用
                    this.startButton = document.getElementById('start-button');
                    this.restartButton = document.getElementById('restart-button');
                    
                    // 强制按钮可点击
                    this.startButton.style.pointerEvents = 'auto';
                    this.startButton.style.position = 'relative';
                    this.startButton.style.zIndex = '9999';
                    this.startButton.style.border = '2px solid red';
                    this.startButton.style.background = 'yellow';
                    this.startButton.style.color = 'black';
                    
                    this.restartButton.style.pointerEvents = 'auto';
                    this.restartButton.style.position = 'relative';
                    this.restartButton.style.zIndex = '9999';
                    this.restartButton.style.border = '2px solid red';
                    this.restartButton.style.background = 'yellow';
                    this.restartButton.style.color = 'black';
                    
                    // 添加点击区域测试
                    const clickTest = document.createElement('div');
                    clickTest.style.position = 'fixed';
                    clickTest.style.top = '0';
                    clickTest.style.left = '0';
                    clickTest.style.width = '100%';
                    clickTest.style.height = '100%';
                    clickTest.style.background = 'rgba(0,255,0,0.1)';
                    clickTest.style.zIndex = '9998';
                    clickTest.onclick = (e) => {
                        console.log('Clicked at:', e.clientX, e.clientY, 
                                   'Element:', document.elementFromPoint(e.clientX, e.clientY));
                    };
                    document.body.appendChild(clickTest);
                    
                    // 最终事件绑定
                    this.startButton.onclick = handleStartClick;
                    this.restartButton.onclick = handleRestartClick;
                    
                    console.log('Button positions:',
                        'Start:', this.startButton.getBoundingClientRect(),
                        'Restart:', this.restartButton.getBoundingClientRect());
                    
                    // 验证按钮是否存在
                    if (!(this.startButton instanceof HTMLElement)) {
                        console.error('Start button not found');
                    }
                    if (!(this.restartButton instanceof HTMLElement)) {
                        console.error('Restart button not found');
                    }
                    
                    console.log('SnakeGame initialized successfully');
                } catch (error) {
                    console.error('Game initialization failed:', error);
                    alert('游戏初始化失败，请检查控制台日志');
                }
            }
            
            startGame() {
                try {
                    console.log('Starting game...');
                    
                    // 重置游戏状态
                    this.game = new GameCore();
                    this.gameOver = false;
                    this.isPaused = false;
                    this.lastTime = 0;
                    this.frameCount = 0;
                    this.lastFpsUpdate = 0;
                    
                    // 设置难度
                    const difficulty = document.getElementById('difficulty')?.value || 'medium';
                    this.game.gameSpeed = config.CONFIG.DIFFICULTY[difficulty].speed;
                    
                    // 隐藏界面元素
                    this.startScreen.style.display = 'none';
                    this.gameOverScreen.style.display = 'none';
                    
                    // 添加键盘监听
                    document.addEventListener('keydown', this.handleKeyDown);
                    
                    // 开始游戏循环
                    this.gameLoop(performance.now());
                    
                } catch (error) {
                    console.error('Game start failed:', error);
                }
            }
            
            resetGame() {
                this.startGame();
            }
            
            handleKeyDown = (e) => {
                if (!this.game) return;
                
                switch(e.key) {
                    case 'ArrowUp':
                        if (this.game.direction !== 'down') this.game.nextDirection = 'up';
                        break;
                    case 'ArrowDown':
                        if (this.game.direction !== 'up') this.game.nextDirection = 'down';
                        break;
                    case 'ArrowLeft':
                        if (this.game.direction !== 'right') this.game.nextDirection = 'left';
                        break;
                    case 'ArrowRight':
                        if (this.game.direction !== 'left') this.game.nextDirection = 'right';
                        break;
                    case ' ':
                        this.isPaused = !this.isPaused;
                        break;
                }
            }
            
            gameLoop = (timestamp) => {
                if (this.gameOver) {
                    this.showGameOver();
                    return;
                }
                
                if (this.isPaused) {
                    requestAnimationFrame(this.gameLoop);
                    return;
                }
                
                // FPS计算
                this.frameCount++;
                if (timestamp - this.lastFpsUpdate >= 1000) {
                    this.fps = this.frameCount;
                    this.frameCount = 0;
                    this.lastFpsUpdate = timestamp;
                }
                
                // 更新游戏状态
                if (!this.lastTime) this.lastTime = timestamp;
                const deltaTime = timestamp - this.lastTime;
                
                if (deltaTime >= this.game.getCurrentSpeed()) {
                    this.lastTime = timestamp;
                    this.game.update();
                    
                    if (this.game.gameOver) {
                        this.gameOver = true;
                        this.achievements.checkGameEnd(this.game.score);
                        this.showGameOver();
                        return;
                    }
                }
                
                // 渲染
                this.renderer.render({
                    snake: this.game.snake,
                    food: this.game.food,
                    bonusFood: this.game.bonusFood,
                    score: this.game.score,
                    highScore: this.game.highScore,
                    activeEffects: this.game.activeEffects
                });
                
                requestAnimationFrame(this.gameLoop);
            }
            
            showGameOver() {
                try {
                    this.gameOverScreen.style.display = 'block';
                    document.getElementById('final-score').textContent = this.game.score;
                    document.removeEventListener('keydown', this.handleKeyDown);
                } catch (error) {
                    console.error('Show game over failed:', error);
                }
            }
        }
        
        // 资源预加载
        function loadResources() {
            return new Promise((resolve) => {
                const resources = [
                    // 音频文件
                    'sounds/eat.mp3',
                    'sounds/bonus.mp3',
                    'sounds/gameover.mp3',
                    // 其他资源...
                ];
                
                let loaded = 0;
                const total = resources.length;
                
                function onResourceLoaded() {
                    loaded++;
                    const progress = Math.floor((loaded / total) * 100);
                    console.log(`Loading resources... ${progress}%`);
                    
                    if (loaded === total) {
                        console.log('All resources loaded');
                        resolve();
                    }
                }
                
                if (total === 0) {
                    resolve();
                    return;
                }
                
                resources.forEach(resource => {
                    if (resource.endsWith('.mp3')) {
                        const audio = new Audio();
                        audio.src = resource;
                        audio.addEventListener('canplaythrough', onResourceLoaded);
                        audio.addEventListener('error', onResourceLoaded);
                    } else {
                        // 其他资源类型处理
                        onResourceLoaded();
                    }
                });
            });
        }
        
        // 显示加载界面
        function showLoadingScreen() {
            const loading = document.createElement('div');
            loading.id = 'loading-screen';
            loading.style.position = 'fixed';
            loading.style.top = '0';
            loading.style.left = '0';
            loading.style.width = '100%';
            loading.style.height = '100%';
            loading.style.backgroundColor = 'rgba(0,0,0,0.7)';
            loading.style.display = 'flex';
            loading.style.justifyContent = 'center';
            loading.style.alignItems = 'center';
            loading.style.color = 'white';
            loading.style.fontSize = '24px';
            loading.style.zIndex = '1000';
            loading.textContent = '加载游戏中...';
            
            document.body.appendChild(loading);
            return loading;
        }
        
        // 检查浏览器兼容性
        function checkCompatibility() {
            const issues = [];
            
            // 检测Canvas支持
            if (!window.HTMLCanvasElement || !document.createElement('canvas').getContext) {
                issues.push('您的浏览器不支持Canvas，游戏无法运行');
            }
            
            // 检测ES6模块支持
            if (typeof Promise === 'undefined' || typeof fetch === 'undefined') {
                issues.push('您的浏览器不支持现代JavaScript功能，请升级浏览器');
            }
            
            return issues;
        }

        // 初始化游戏
        async function initGame() {
            const loading = showLoadingScreen();
            
            try {
                // 检查兼容性
                const compatibilityIssues = checkCompatibility();
                if (compatibilityIssues.length > 0) {
                    throw new Error(compatibilityIssues.join('\n'));
                }
                
                await loadResources();
                const game = new SnakeGame();
                console.log('Game initialized successfully');
            } catch (error) {
                console.error('Game initialization failed:', error);
                
                // 创建错误信息容器
                const errorContainer = document.createElement('div');
                errorContainer.style.position = 'fixed';
                errorContainer.style.top = '50%';
                errorContainer.style.left = '50%';
                errorContainer.style.transform = 'translate(-50%, -50%)';
                errorContainer.style.backgroundColor = 'rgba(255,0,0,0.8)';
                errorContainer.style.color = 'white';
                errorContainer.style.padding = '20px';
                errorContainer.style.borderRadius = '10px';
                errorContainer.style.maxWidth = '80%';
                errorContainer.style.textAlign = 'center';
                errorContainer.style.zIndex = '1001';
                
                // 错误信息内容
                errorContainer.innerHTML = `
                    <h3>游戏加载失败</h3>
                    <p>${error.message}</p>
                    <p>请尝试刷新页面或使用最新版Chrome/Firefox浏览器</p>
                    <button onclick="window.location.reload()" style="
                        padding: 8px 16px;
                        background: white;
                        border: none;
                        border-radius: 4px;
                        margin-top: 10px;
                        cursor: pointer;
                    ">刷新页面</button>
                `;
                
                document.body.appendChild(errorContainer);
            } finally {
                setTimeout(() => {
                    const loading = document.getElementById('loading-screen');
                    if (loading) {
                        loading.style.opacity = '0';
                        setTimeout(() => loading.remove(), 500);
                    }
                }, 500);
            }
        }
        
        // 启动游戏
        initGame();
    constructor() {
        // 初始化DOM元素
        this.canvas = document.getElementById('game-board');
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.scoreDisplay = document.getElementById('score');
        this.highScoreDisplay = document.getElementById('high-score');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.difficultySelect = document.getElementById('difficulty');
        this.themeOptions = document.querySelectorAll('.theme-option');
        this.skinSelect = document.getElementById('skin-select');

        // 初始化模块
        this.game = new GameCore();
        this.renderer = new Renderer(this.canvas);
        this.achievements = new AchievementSystem();

        // 游戏状态
        this.lastTime = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 0;

        // 初始化游戏
        this.init();
    }

    init() {
        // 设置事件监听
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.resetGame());
        
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 主题切换
        this.themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.renderer.theme = theme;
                document.body.className = `theme-${theme}`;
                try {
                    localStorage.setItem('snakeTheme', theme);
                } catch (e) {
                    console.error('保存主题失败:', e);
                }
            });
        });
        
        // 皮肤选择
        this.skinSelect.addEventListener('change', (e) => {
            this.renderer.currentSkin = e.target.value;
            try {
                localStorage.setItem('snakeSkin', e.target.value);
            } catch (e) {
                console.error('保存皮肤失败:', e);
            }
        });

        // 加载保存的设置
        this.loadSettings();
        
        // 初始渲染
        this.renderer.init();
        this.renderer.render({
            snake: this.game.snake,
            food: this.game.food,
            score: this.game.score,
            highScore: this.game.highScore,
            activeEffects: this.game.activeEffects
        });
    }

    loadSettings() {
        // 加载主题
        try {
            const savedTheme = localStorage.getItem('snakeTheme') || 'default';
            this.renderer.theme = savedTheme;
            document.body.className = `theme-${savedTheme}`;
            document.querySelector(`.theme-option[data-theme="${savedTheme}"]`)?.classList.add('active');
        } catch (e) {
            console.error('加载主题失败:', e);
        }
        
        // 加载皮肤
        try {
            const savedSkin = localStorage.getItem('snakeSkin') || 'default';
            this.renderer.currentSkin = savedSkin;
            this.skinSelect.value = savedSkin;
        } catch (e) {
            console.error('加载皮肤失败:', e);
        }
    }

    startGame() {
        // 重置游戏状态
        this.game.resetGame();
        this.gameOver = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // 设置难度
        const difficulty = this.difficultySelect.value;
        this.game.gameSpeed = CONFIG.DIFFICULTY[difficulty].speed;
        
        // 隐藏开始界面
        this.startScreen.style.display = 'none';
        this.gameOverScreen.style.display = 'none';
        
        // 开始游戏循环
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    resetGame() {
        this.startGame();
    }

    gameLoop(timestamp) {
        if (this.gameOver) {
            this.showGameOver();
            return;
        }
        
        // 暂停检查
        if (this.isPaused) {
            requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }
        
        // FPS计算
        this.frameCount++;
        if (timestamp - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;
        }
        
        // 更新游戏状态
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        
        if (deltaTime >= this.game.getCurrentSpeed()) {
            this.lastTime = timestamp;
            
            // 更新游戏逻辑
            this.game.update();
            
            // 检查游戏结束
            if (this.game.gameOver) {
                this.gameOver = true;
                this.achievements.checkGameEnd(this.game.score);
                this.showGameOver();
                return;
            }
        }
        
        // 渲染游戏
        this.renderer.render({
            snake: this.game.snake,
            food: this.game.food,
            bonusFood: this.game.bonusFood,
            score: this.game.score,
            highScore: this.game.highScore,
            activeEffects: this.game.activeEffects
        });
        
        // 继续循环
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleKeyDown(e) {
        // 方向控制
        switch(e.key) {
            case 'ArrowUp':
                if (this.game.direction !== 'down') this.game.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (this.game.direction !== 'up') this.game.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (this.game.direction !== 'right') this.game.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (this.game.direction !== 'left') this.game.nextDirection = 'right';
                break;
            case ' ':
                this.isPaused = !this.isPaused;
                break;
        }
    }

    showGameOver() {
        this.gameOverScreen.style.display = 'block';
        document.getElementById('final-score').textContent = this.game.score;
    }
}

// 启动游戏
const game = new SnakeGame();