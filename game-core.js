// 游戏核心逻辑
import { CONFIG } from './config.js';
import { 
    getRandomPosition, 
    isValidPosition,
    saveToStorage,
    loadFromStorage,
    playSound
} from './utils.js';

export class GameCore {
    constructor() {
        this.resetGame();
        this.activeEffects = {
            speed: { active: false, endTime: 0 },
            slow: { active: false, endTime: 0 },
            double: { active: false, endTime: 0 },
            god: { active: false, endTime: 0 }
        };
    }

    resetGame() {
        this.snake = this.createInitialSnake();
        this.food = this.generateFood();
        this.bonusFood = null;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.highScore = loadFromStorage('highScore') || 0;
        this.gameOver = false;
        this.isPaused = false;
        this.gameSpeed = CONFIG.INITIAL_SPEED;
    }

    createInitialSnake() {
        const snake = [];
        for (let i = CONFIG.INITIAL_LENGTH - 1; i >= 0; i--) {
            snake.push({ x: i, y: 0 });
        }
        return snake;
    }

    generateFood() {
        let newFood;
        do {
            newFood = {
                ...getRandomPosition(CONFIG.BOARD_SIZE),
                type: this.getRandomFoodType()
            };
        } while (!isValidPosition(newFood, this.snake, this.obstacles || []));
        return newFood;
    }

    getRandomFoodType() {
        const types = Object.keys(CONFIG.FOOD_TYPES);
        const weights = types.map(type => CONFIG.FOOD_TYPES[type].weight);
        const total = weights.reduce((a, b) => a + b);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) return types[i];
            random -= weights[i];
        }
        return 'normal';
    }

    update() {
        if (this.gameOver || this.isPaused) return;

        // 更新蛇位置
        this.moveSnake();

        // 检查碰撞
        if (this.checkCollision()) {
            this.gameOver = true;
            return;
        }

        // 检查是否吃到食物
        this.checkFood();
    }

    moveSnake() {
        const head = {...this.snake[0]};
        
        // 根据方向移动头部
        switch(this.nextDirection) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 边界检查
        if (head.x < 0) head.x = CONFIG.BOARD_SIZE - 1;
        if (head.x >= CONFIG.BOARD_SIZE) head.x = 0;
        if (head.y < 0) head.y = CONFIG.BOARD_SIZE - 1;
        if (head.y >= CONFIG.BOARD_SIZE) head.y = 0;

        // 更新方向
        this.direction = this.nextDirection;

        // 移动蛇身体
        this.snake.unshift(head);
        this.snake.pop();
    }

    checkCollision() {
        if (this.activeEffects.god.active) return false;

        const head = this.snake[0];
        
        // 检查自身碰撞
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }

        // 检查障碍物碰撞
        if (this.obstacles) {
            for (let i = 0; i < this.obstacles.length; i++) {
                if (head.x === this.obstacles[i].x && head.y === this.obstacles[i].y) {
                    return true;
                }
            }
        }

        return false;
    }

    checkFood() {
        const head = this.snake[0];
        
        // 检查普通食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.handleFoodEaten(this.food);
            this.food = this.generateFood();
            return;
        }

        // 检查奖励食物
        if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
            this.handleBonusFoodEaten();
            this.bonusFood = null;
        }
    }

    handleFoodEaten(food) {
        // 根据食物类型处理效果
        switch(food.type) {
            case 'speed':
                this.activeEffects.speed = { 
                    active: true, 
                    endTime: Date.now() + CONFIG.EFFECT_DURATION 
                };
                break;
            case 'slow':
                this.activeEffects.slow = { 
                    active: true, 
                    endTime: Date.now() + CONFIG.EFFECT_DURATION 
                };
                break;
            case 'double':
                this.activeEffects.double = { 
                    active: true, 
                    endTime: Date.now() + CONFIG.EFFECT_DURATION 
                };
                break;
        }

        // 增加蛇长度
        this.snake.push({...this.snake[this.snake.length - 1]});

        // 更新分数
        const points = this.activeEffects.double.active ? 20 : 10;
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            saveToStorage('highScore', this.highScore);
        }
    }

    handleBonusFoodEaten() {
        this.score += 50;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            saveToStorage('highScore', this.highScore);
        }
    }

    updateEffects() {
        const now = Date.now();
        for (const effect in this.activeEffects) {
            if (this.activeEffects[effect].active && now > this.activeEffects[effect].endTime) {
                this.activeEffects[effect].active = false;
            }
        }
    }

    getCurrentSpeed() {
        let speed = this.gameSpeed;
        if (this.activeEffects.speed.active) speed *= 0.7;
        if (this.activeEffects.slow.active) speed *= 1.5;
        return speed;
    }
}