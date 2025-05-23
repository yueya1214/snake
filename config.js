// 游戏配置常量
export const CONFIG = {
    // 游戏板设置
    BOARD_SIZE: 20,  // 游戏板格子数
    TILE_SIZE: 20,   // 每个格子像素大小
    MIN_TILE_SIZE: 15, // 最小格子大小
    MAX_TILE_SIZE: 30, // 最大格子大小

    // 游戏难度设置
    DIFFICULTY: {
        easy: { speed: 150, growthRate: 1 },
        medium: { speed: 100, growthRate: 2 },
        hard: { speed: 50, growthRate: 3 }
    },

    // 初始游戏状态
    INITIAL_SPEED: 100,
    INITIAL_LENGTH: 3,

    // 食物设置
    FOOD_TYPES: {
        normal: { color: '#FF0000', weight: 70 },
        speed: { color: '#00FFFF', weight: 10 },
        slow: { color: '#FFA500', weight: 10 },
        double: { color: '#FFFF00', weight: 10 }
    },

    // 特效持续时间(ms)
    EFFECT_DURATION: 10000,

    // 主题设置
    THEMES: {
        default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ocean: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        forest: 'linear-gradient(135deg, #2c7744 0%, #5a3f37 100%)',
        sunset: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)'
    }
};