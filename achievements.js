// 成就系统
import { saveToStorage, loadFromStorage, showEffectMessage } from './utils.js';

export class AchievementSystem {
    constructor() {
        this.achievements = {
            firstGame: { 
                name: '初出茅庐', 
                description: '完成第一局游戏',
                unlocked: false,
                progress: 0,
                target: 1
            },
            score100: { 
                name: '百分达人', 
                description: '单局得分达到100',
                unlocked: false,
                progress: 0,
                target: 100
            },
            speedEater: { 
                name: '速度之魔', 
                description: '连续吃掉5个加速食物',
                unlocked: false,
                progress: 0,
                target: 5,
                streak: 0
            },
            collector: { 
                name: '收集专家', 
                description: '收集所有类型的食物',
                unlocked: false,
                progress: 0,
                target: 4, // 普通、加速、减速、双倍
                collectedTypes: []
            },
            godMode: { 
                name: '无敌战神', 
                description: '激活无敌模式',
                unlocked: false,
                progress: 0,
                target: 1
            }
        };
        
        this.loadAchievements();
    }

    loadAchievements() {
        const saved = loadFromStorage('achievements');
        if (saved) {
            for (const key in saved) {
                if (this.achievements[key]) {
                    this.achievements[key] = saved[key];
                }
            }
        }
    }

    saveAchievements() {
        saveToStorage('achievements', this.achievements);
    }

    updateAchievement(key, value = 1) {
        if (!this.achievements[key] || this.achievements[key].unlocked) return;

        const achievement = this.achievements[key];
        
        // 特殊处理连续成就
        if (key === 'speedEater') {
            achievement.streak = value ? achievement.streak + 1 : 0;
            achievement.progress = Math.min(achievement.streak, achievement.target);
        } 
        // 特殊处理收集类成就
        else if (key === 'collector' && Array.isArray(value)) {
            value.forEach(type => {
                if (!achievement.collectedTypes.includes(type)) {
                    achievement.collectedTypes.push(type);
                    achievement.progress = achievement.collectedTypes.length;
                }
            });
        } 
        // 普通成就
        else {
            achievement.progress = Math.min(achievement.progress + value, achievement.target);
        }

        // 检查是否解锁
        if (achievement.progress >= achievement.target) {
            achievement.unlocked = true;
            this.unlockAchievement(key);
        }

        this.saveAchievements();
    }

    unlockAchievement(key) {
        const achievement = this.achievements[key];
        if (!achievement) return;

        // 显示解锁通知
        showEffectMessage(`成就解锁: ${achievement.name}`, '#FFD700');
        
        // 播放音效
        const levelUpSound = document.getElementById('level-up-sound');
        if (levelUpSound) {
            levelUpSound.currentTime = 0;
            levelUpSound.play().catch(e => console.error('播放成就音效失败:', e));
        }
    }

    checkGameEnd(score) {
        this.updateAchievement('firstGame');
        if (score >= 100) {
            this.updateAchievement('score100');
        }
    }

    checkFoodEaten(type) {
        if (type === 'speed') {
            this.updateAchievement('speedEater', 1);
        }
        this.updateAchievement('collector', [type]);
    }

    checkGodModeActivated() {
        this.updateAchievement('godMode');
    }

    getUnlockedAchievements() {
        return Object.entries(this.achievements)
            .filter(([_, a]) => a.unlocked)
            .map(([_, a]) => a);
    }

    getLockedAchievements() {
        return Object.entries(this.achievements)
            .filter(([_, a]) => !a.unlocked)
            .map(([_, a]) => a);
    }

    renderAchievements(container) {
        container.innerHTML = '';
        
        // 渲染已解锁成就
        const unlocked = document.createElement('div');
        unlocked.className = 'achievement-section';
        unlocked.innerHTML = '<h3>已解锁成就</h3>';
        
        this.getUnlockedAchievements().forEach(achievement => {
            unlocked.appendChild(this.createAchievementElement(achievement, true));
        });
        
        // 渲染未解锁成就
        const locked = document.createElement('div');
        locked.className = 'achievement-section';
        locked.innerHTML = '<h3>未解锁成就</h3>';
        
        this.getLockedAchievements().forEach(achievement => {
            locked.appendChild(this.createAchievementElement(achievement, false));
        });
        
        container.appendChild(unlocked);
        container.appendChild(locked);
    }

    createAchievementElement(achievement, isUnlocked) {
        const element = document.createElement('div');
        element.className = `achievement ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.innerHTML = isUnlocked ? '★' : '?';
        
        const info = document.createElement('div');
        info.className = 'achievement-info';
        
        const name = document.createElement('h4');
        name.textContent = achievement.name;
        
        const desc = document.createElement('p');
        desc.textContent = achievement.description;
        
        const progress = document.createElement('div');
        progress.className = 'achievement-progress';
        
        if (achievement.target > 1) {
            const progressText = document.createElement('span');
            progressText.textContent = `${achievement.progress}/${achievement.target}`;
            progress.appendChild(progressText);
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.width = `${(achievement.progress / achievement.target) * 100}%`;
            
            progressBar.appendChild(progressFill);
            progress.appendChild(progressBar);
        }
        
        info.appendChild(name);
        info.appendChild(desc);
        info.appendChild(progress);
        
        element.appendChild(icon);
        element.appendChild(info);
        
        return element;
    }
}