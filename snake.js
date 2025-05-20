// 游戏主入口
import { CONFIG } from './config.js';
import { GameCore } from './game-core.js';
import { Renderer } from './renderer.js';
import { AchievementSystem } from './achievements.js';
import { playSound, loadFromStorage } from './utils.js';

class SnakeGame {
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