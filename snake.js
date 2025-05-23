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
                try {
                    console.log('Initializing SnakeGame...');
                    
                    // 获取DOM元素并添加调试
                    const elements = {
                        canvas: document.getElementById('game-board'),
                        startScreen: document.getElementById('start-screen'),
                        gameOverScreen: document.getElementById('game-over-screen'),
                        startButton: document.getElementById('start-button'),
                        restartButton: document.getElementById('restart-button'),
                        scoreDisplay: document.getElementById('score'),
                        highScoreDisplay: document.getElementById('high-score'),
                        levelDisplay: document.getElementById('level')
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
                    
                    // 初始化渲染器
                    this.renderer.init();
                    
                    // 添加窗口大小变化监听
                    window.addEventListener('resize', this.handleResize);
                    
                    // 简化点击事件
                    const handleStartClick = () => {
                        console.log('Start button clicked');
                        this.startGame();
                    };
                    
                    const handleRestartClick = () => {
                        console.log('Restart button clicked');
                        this.resetGame();
                    };
                    
                    // 移除所有现有事件监听器
                    this.startButton.replaceWith(this.startButton.cloneNode(true));
                    this.restartButton.replaceWith(this.restartButton.cloneNode(true));
                    
                    // 获取新的按钮引用
                    this.startButton = document.getElementById('start-button');
                    this.restartButton = document.getElementById('restart-button');
                    
                    // 确保按钮可点击
                    this.startButton.style.pointerEvents = 'auto';
                    this.startButton.style.position = 'relative';
                    this.startButton.style.zIndex = '9999';
                    
                    this.restartButton.style.pointerEvents = 'auto';
                    this.restartButton.style.position = 'relative';
                    this.restartButton.style.zIndex = '9999';
                    
                    // 绑定事件
                    this.startButton.onclick = handleStartClick;
                    this.restartButton.onclick = handleRestartClick;
                    
                    // 添加移动控制按钮事件
                    this.setupMobileControls();
                    
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
            
            handleResize = () => {
                console.log('Window resized, adjusting game board');
                this.renderer.init();
                this.renderer.render({
                    snake: this.game.snake,
                    food: this.game.food,
                    bonusFood: this.game.bonusFood,
                    score: this.game.score,
                    highScore: this.game.highScore,
                    activeEffects: this.game.activeEffects
                });
            };
            
            setupMobileControls() {
                const upBtn = document.getElementById('btn-up');
                const downBtn = document.getElementById('btn-down');
                const leftBtn = document.getElementById('btn-left');
                const rightBtn = document.getElementById('btn-right');
                
                if (upBtn) upBtn.addEventListener('click', () => {
                    if (this.game.direction !== 'down') this.game.nextDirection = 'up';
                });
                
                if (downBtn) downBtn.addEventListener('click', () => {
                    if (this.game.direction !== 'up') this.game.nextDirection = 'down';
                });
                
                if (leftBtn) leftBtn.addEventListener('click', () => {
                    if (this.game.direction !== 'right') this.game.nextDirection = 'left';
                });
                
                if (rightBtn) rightBtn.addEventListener('click', () => {
                    if (this.game.direction !== 'left') this.game.nextDirection = 'right';
                });
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
                    
                    // 更新分数显示
                    if (this.scoreDisplay) this.scoreDisplay.textContent = '0';
                    if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.game.highScore.toString();
                    
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
                    case 'w':
                    case 'W':
                        if (this.game.direction !== 'down') this.game.nextDirection = 'up';
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        if (this.game.direction !== 'up') this.game.nextDirection = 'down';
                        break;
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        if (this.game.direction !== 'right') this.game.nextDirection = 'left';
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        if (this.game.direction !== 'left') this.game.nextDirection = 'right';
                        break;
                    case ' ':
                    case 'p':
                    case 'P':
                        this.togglePause();
                        break;
                }
            }
            
            togglePause() {
                this.isPaused = !this.isPaused;
                const pauseScreen = document.getElementById('pause-screen');
                if (pauseScreen) {
                    pauseScreen.style.display = this.isPaused ? 'flex' : 'none';
                }
            }
            
            gameLoop = (timestamp) => {
                if (this.gameOver) {
                    this.showGameOver();
                    requestAnimationFrame(this.gameLoop);
                    return;
                }
                
                // 暂停检查
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
                    
                    // 更新分数显示
                    if (this.scoreDisplay) this.scoreDisplay.textContent = this.game.score.toString();
                    if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.game.highScore.toString();
                    
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
                    this.gameOverScreen.style.display = 'flex';
                    document.getElementById('final-score').textContent = this.game.score;
                    document.getElementById('highscore-value').textContent = this.game.highScore;
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
                    'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3',
                    'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
                    'https://assets.mixkit.co/active_storage/sfx/218/218-preview.mp3'
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
    }).catch(error => {
        console.error('Module loading failed:', error);
        alert('游戏模块加载失败，请检查控制台日志');
    });
});