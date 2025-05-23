// 游戏工具函数
import { CONFIG } from './config.js';

// 获取随机位置
export function getRandomPosition(boardSize) {
    return {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize)
    };
}

// 检查位置是否有效
export function isValidPosition(pos, snake, obstacles) {
    return !snake.some(segment => segment.x === pos.x && segment.y === pos.y) &&
           !obstacles.some(obs => obs.x === pos.x && obs.y === pos.y);
}

// 本地存储操作
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('保存到本地存储失败:', e);
        return false;
    }
}

export function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('从本地存储加载失败:', e);
        return null;
    }
}

// 音效播放
export function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.error('播放音效失败:', e));
    }
}

// 显示效果消息
export function showEffectMessage(message, color) {
    const effectMsg = document.createElement('div');
    effectMsg.textContent = message;
    effectMsg.style.position = 'absolute';
    effectMsg.style.top = '20px';
    effectMsg.style.left = '50%';
    effectMsg.style.transform = 'translateX(-50%)';
    effectMsg.style.color = color;
    effectMsg.style.fontSize = '24px';
    effectMsg.style.fontWeight = 'bold';
    effectMsg.style.textShadow = '0 0 5px #000';
    effectMsg.style.animation = 'fadeOut 2s forwards';
    
    document.querySelector('.game-board-container').appendChild(effectMsg);
    setTimeout(() => effectMsg.remove(), 2000);
}