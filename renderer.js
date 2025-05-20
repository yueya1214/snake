// 游戏渲染模块
import { CONFIG } from './config.js';
import { showEffectMessage } from './utils.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentSkin = 'default';
        this.theme = 'default';
    }

    init() {
        this.canvas.width = CONFIG.BOARD_SIZE * CONFIG.TILE_SIZE;
        this.canvas.height = CONFIG.BOARD_SIZE * CONFIG.TILE_SIZE;
    }

    render(gameState) {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制蛇
        this.drawSnake(gameState.snake, gameState.activeEffects);
        
        // 绘制食物
        this.drawFood(gameState.food);
        
        // 绘制奖励食物
        if (gameState.bonusFood) {
            this.drawBonusFood(gameState.bonusFood);
        }
        
        // 绘制障碍物
        if (gameState.obstacles) {
            this.drawObstacles(gameState.obstacles);
        }
        
        // 绘制UI
        this.drawUI(gameState);
    }

    drawBackground() {
        this.ctx.fillStyle = CONFIG.THEMES[this.theme];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
            // 垂直线
            this.ctx.beginPath();
            this.ctx.moveTo(i * CONFIG.TILE_SIZE, 0);
            this.ctx.lineTo(i * CONFIG.TILE_SIZE, this.canvas.height);
            this.ctx.stroke();
            
            // 水平线
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * CONFIG.TILE_SIZE);
            this.ctx.lineTo(this.canvas.width, i * CONFIG.TILE_SIZE);
            this.ctx.stroke();
        }
    }

    drawSnake(snake, activeEffects) {
        const isGodMode = activeEffects.god && activeEffects.god.active;
        const blink = isGodMode && Math.floor(Date.now() / 200) % 2 === 0;
        
        snake.forEach((segment, index) => {
            const isHead = index === 0;
            const isTail = index === snake.length - 1;
            let color;
            
            if (blink) {
                color = '#FFFFFF'; // 闪烁白色
            } else {
                switch(this.currentSkin) {
                    case 'fire':
                        color = isHead ? '#FF4500' : '#FF8C00';
                        break;
                    case 'ice':
                        color = isHead ? '#00BFFF' : '#1E90FF';
                        break;
                    case 'rainbow':
                        const hue = (segment.x + segment.y) * 10 % 360;
                        color = `hsl(${hue}, 100%, 50%)`;
                        break;
                    default:
                        color = isHead ? '#2ECC71' : '#27AE60';
                }
            }
            
            this.drawSegment(segment.x, segment.y, color, isHead, isTail);
            
            // 无敌模式下添加光环效果
            if (isHead && isGodMode) {
                this.drawHaloEffect(segment.x, segment.y);
            }
        });
    }

    drawSegment(x, y, color, isHead, isTail) {
        const posX = x * CONFIG.TILE_SIZE;
        const posY = y * CONFIG.TILE_SIZE;
        const size = CONFIG.TILE_SIZE;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(posX, posY, size, size);
        
        // 头部和尾部特殊效果
        if (isHead) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(
                posX + size/2, 
                posY + size/2, 
                size/4, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
        } else if (isTail) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(posX, posY, size, size);
        }
    }

    drawHaloEffect(x, y) {
        const centerX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
        const centerY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
        const radius = CONFIG.TILE_SIZE * 0.7;
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawFood(food) {
        const posX = food.x * CONFIG.TILE_SIZE;
        const posY = food.y * CONFIG.TILE_SIZE;
        const radius = CONFIG.TILE_SIZE / 2;
        
        // 绘制食物基础形状
        this.ctx.fillStyle = CONFIG.FOOD_TYPES[food.type].color;
        this.ctx.beginPath();
        this.ctx.arc(
            posX + radius, 
            posY + radius, 
            radius * 0.8, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 添加食物类型标记
        switch(food.type) {
            case 'speed':
                this.drawSpeedFoodMarker(posX, posY, radius);
                break;
            case 'slow':
                this.drawSlowFoodMarker(posX, posY, radius);
                break;
            case 'double':
                this.drawDoubleFoodMarker(posX, posY, radius);
                break;
        }
    }

    drawSpeedFoodMarker(x, y, radius) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius * 0.3, y + radius * 0.5);
        this.ctx.lineTo(x + radius * 0.7, y + radius * 0.5);
        this.ctx.lineTo(x + radius * 0.5, y + radius * 0.7);
        this.ctx.fill();
    }

    drawSlowFoodMarker(x, y, radius) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.beginPath();
        this.ctx.arc(
            x + radius * 0.5, 
            y + radius * 0.5, 
            radius * 0.2, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
    }

    drawDoubleFoodMarker(x, y, radius) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.font = `bold ${radius * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('2x', x + radius, y + radius);
    }

    drawBonusFood(food) {
        const posX = food.x * CONFIG.TILE_SIZE;
        const posY = food.y * CONFIG.TILE_SIZE;
        const radius = CONFIG.TILE_SIZE / 2;
        
        // 绘制闪烁效果
        const blink = Math.sin(Date.now() / 200) > 0;
        if (blink) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(
                posX + radius, 
                posY + radius, 
                radius * 0.9, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        this.ctx.fillStyle = '#FF00FF';
        this.ctx.beginPath();
        this.ctx.arc(
            posX + radius, 
            posY + radius, 
            radius * 0.8, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 绘制星星标记
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = `bold ${radius * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('★', posX + radius, posY + radius);
    }

    drawObstacles(obstacles) {
        obstacles.forEach(obs => {
            const posX = obs.x * CONFIG.TILE_SIZE;
            const posY = obs.y * CONFIG.TILE_SIZE;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(posX, posY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        });
    }

    drawUI(gameState) {
        // 绘制分数
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`分数: ${gameState.score}`, 10, 30);
        
        // 绘制最高分
        this.ctx.fillText(`最高分: ${gameState.highScore}`, 10, 60);
        
        // 绘制当前效果
        this.drawActiveEffects(gameState.activeEffects);
    }

    drawActiveEffects(activeEffects) {
        const effectSize = 20;
        const startX = 10;
        const startY = this.canvas.height - 30;
        const spacing = 25;
        
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        let activeCount = 0;
        for (const effect in activeEffects) {
            if (activeEffects[effect].active) {
                const x = startX + (activeCount * spacing);
                const y = startY;
                
                // 绘制效果图标
                switch(effect) {
                    case 'speed':
                        this.drawSpeedEffectIcon(x, y, effectSize);
                        break;
                    case 'slow':
                        this.drawSlowEffectIcon(x, y, effectSize);
                        break;
                    case 'double':
                        this.drawDoubleEffectIcon(x, y, effectSize);
                        break;
                    case 'god':
                        this.drawGodEffectIcon(x, y, effectSize);
                        break;
                }
                
                // 绘制剩余时间条
                this.drawEffectTimeBar(
                    x, 
                    y + 15, 
                    effectSize, 
                    (activeEffects[effect].endTime - Date.now()) / 10000
                );
                
                activeCount++;
            }
        }
    }

    drawSpeedEffectIcon(x, y, size) {
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size/2);
        this.ctx.lineTo(x + size, y);
        this.ctx.lineTo(x, y + size/2);
        this.ctx.fill();
    }

    drawSlowEffectIcon(x, y, size) {
        this.ctx.fillStyle = '#FFA500';
        this.ctx.beginPath();
        this.ctx.arc(x + size/2, y, size/2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawDoubleEffectIcon(x, y, size) {
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('2x', x, y);
    }

    drawGodEffectIcon(x, y, size) {
        this.ctx.fillStyle = '#FF00FF';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('GOD', x, y);
    }

    drawEffectTimeBar(x, y, width, progress) {
        if (progress > 0) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(x, y, width, 3);
            this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
            this.ctx.fillRect(x, y, width * progress, 3);
        }
    }
}