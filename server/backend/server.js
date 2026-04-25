/**
 * 文案集后端服务 - 重构版
 *
 * 特性：
 * - 模块化路由处理
 * - 完善的错误处理
 * - 请求日志与响应统一格式
 * - JWT身份认证
 * - MySQL数据库
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const mysql = require('mysql2/promise');
const multer = require('multer');
const fs = require('fs');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置 multer 存储
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

const app = express();

// ============================================
// 配置常量
// ============================================
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'wenan-default-secret';
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wenan_001',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 默认风格标签（调性）
const DEFAULT_STYLES = [
    { id: 'all', name: '全部', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'cold', name: '高级清冷', icon: '❄', color: '#6B90AE', isDefault: true },
    { id: 'literary', name: '简约文艺', icon: '📖', color: '#8AA8C0', isDefault: true },
    { id: 'gentle', name: '温柔治愈', icon: '🌸', color: '#D9A8A8', isDefault: true },
    { id: 'cool', name: '酷拽短句', icon: '⚡', color: '#2D2D2D', isDefault: true },
    { id: 'ancient', name: '国风古风', icon: '🏮', color: '#C89090', isDefault: true }
];

// 默认场景标签（使用场景）
const DEFAULT_SCENES = [
    { id: 'all', name: '全部场景', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'moments', name: '朋友圈配图', icon: '📱', color: '#6B90AE', isDefault: true },
    { id: 'xiaohongshu', name: '小红书种草', icon: '📕', color: '#ff6b9d', isDefault: true },
    { id: 'video', name: '短视频口播', icon: '🎬', color: '#f5a623', isDefault: true },
    { id: 'job', name: '求职社交', icon: '💼', color: '#4a9eff', isDefault: true },
    { id: 'birthday', name: '生日祝福', icon: '🎂', color: '#9b59b6', isDefault: true }
];

// 默认分类配置（保留兼容性）
const DEFAULT_CATEGORIES = [
    { id: 'all', name: '全部', icon: '✦', color: '#6B90AE', isDefault: true },
    { id: 'love', name: '爱情', icon: '♥', color: '#D9A8A8', isDefault: true },
    { id: 'life', name: '人生', icon: '☀', color: '#8AA8C0', isDefault: true },
    { id: 'inspirational', name: '励志', icon: '✊', color: '#6B90AE', isDefault: true },
    { id: 'emotion', name: '情感', icon: '💧', color: '#9b59b6', isDefault: true }
];

// ============================================
// 数据库连接池
// ============================================
let pool = null;

/**
 * 初始化数据库连接
 */
async function initDatabase() {
    try {
        // 先连接不带数据库，创建数据库（如果不存在）
        const tempConfig = { ...DB_CONFIG };
        delete tempConfig.database;
        const tempPool = mysql.createPool(tempConfig);
        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
        await tempPool.end();

        // 连接目标数据库
        pool = mysql.createPool(DB_CONFIG);
        console.log('[Database] MySQL连接成功');

        // 初始化表结构
        await createTables();

        return true;
    } catch (error) {
        console.error('[Database] 数据库初始化失败:', error);
        return false;
    }
}

/**
 * 创建数据库表
 */
async function createTables() {
    // 用户表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            wenan_id VARCHAR(20) NOT NULL,
            avatar LONGTEXT,
            bio TEXT,
            gender VARCHAR(10),
            birthday VARCHAR(20),
            constellation VARCHAR(20),
            location VARCHAR(100),
            cover_image LONGTEXT,
            cover_video LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    console.log('[Database] 用户表创建/检查完成');

    // 更新头像和封面图片列为 LONGTEXT，并添加新字段
    async function addColumnIfNotExists(pool, table, column, definition) {
        try {
            const [rows] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [table, column]
            );
            if (rows[0].cnt === 0) {
                await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`[Database] Added column ${table}.${column}`);
            }
        } catch (err) {
            console.log(`[Database] Column ${table}.${column} check/add error:`, err.message);
        }
    }

    try {
        await pool.execute(`ALTER TABLE users MODIFY COLUMN avatar LONGTEXT`);
        await pool.execute(`ALTER TABLE users MODIFY COLUMN cover_image LONGTEXT`);
    } catch (err) {
        console.log('[Database] avatar/cover_image modify:', err.message);
    }

    await addColumnIfNotExists(pool, 'users', 'is_admin', 'TINYINT DEFAULT 0');
    await addColumnIfNotExists(pool, 'users', 'username_changed_at', 'TIMESTAMP NULL');
    await addColumnIfNotExists(pool, 'users', 'wenan_id_changed_at', 'TIMESTAMP NULL');
    await addColumnIfNotExists(pool, 'users', 'wenan_id_last_changed', 'TIMESTAMP NULL');
    await addColumnIfNotExists(pool, 'users', 'vip_status', "VARCHAR(20) DEFAULT 'inactive'");
    await addColumnIfNotExists(pool, 'users', 'vip_expire_time', 'TIMESTAMP NULL');
    await addColumnIfNotExists(pool, 'users', 'vip_plan', 'VARCHAR(50) NULL');

    // 创建用户名修改记录表
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS username_change_history (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_changed_at (changed_at)
            )
        `);
    } catch (err) {
        console.log('[Database] username_change_history table:', err.message);
    }

    // 文案表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS wenans (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            text TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            style VARCHAR(50) DEFAULT 'cold',
            scene VARCHAR(50) DEFAULT 'moments',
            likes INT DEFAULT 0,
            favorites INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_category (category),
            INDEX idx_style (style),
            INDEX idx_scene (scene)
        )
    `);
    console.log('[Database] 文案表创建完成');

    // 添加 style 和 scene 列（如果不存在）
    try {
        await pool.execute(`ALTER TABLE wenans ADD COLUMN style VARCHAR(50) DEFAULT 'cold' AFTER category`);
    } catch (err) {
        // 列可能已存在
    }
    try {
        await pool.execute(`ALTER TABLE wenans ADD COLUMN scene VARCHAR(50) DEFAULT 'moments' AFTER style`);
    } catch (err) {
        // 列可能已存在
    }

    // 点赞表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS likes (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            wenan_id VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_like (user_id, wenan_id)
        )
    `);
    console.log('[Database] 点赞表创建/检查完成');

    // 收藏表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS favorites (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            wenan_id VARCHAR(64) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_favorite (user_id, wenan_id)
        )
    `);
    console.log('[Database] 收藏表创建/检查完成');

    // 自定义分类表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS categories (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            name VARCHAR(50) NOT NULL,
            icon LONGTEXT,
            color VARCHAR(20) DEFAULT '#ff6b9d',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_category (user_id, name)
        )
    `);
    console.log('[Database] 自定义分类表创建/检查完成');

    // 更新 icon 列为 LONGTEXT
    try {
        await pool.execute(`ALTER TABLE categories MODIFY COLUMN icon LONGTEXT`);
    } catch (err) {
        // 列可能已存在
    }

    // 套餐表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS plans (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            period VARCHAR(20) NOT NULL,
            features LONGTEXT,
            popular TINYINT DEFAULT 0,
            enabled TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    console.log('[Database] 套餐表创建/检查完成');

    // 订单表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            plan_id VARCHAR(64),
            plan_name VARCHAR(100) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'paid',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_plan_id (plan_id)
        )
    `);
    console.log('[Database] 订单表创建/检查完成');

    // AI生成记录表
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ai_generations (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            prompt TEXT NOT NULL,
            result TEXT NOT NULL,
            category VARCHAR(50),
            scene VARCHAR(50),
            style VARCHAR(50),
            word_count INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at)
        )
    `);
    console.log('[Database] AI生成记录表创建/检查完成');

    // AI使用记录表（每日使用次数追踪）
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ai_usage (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            usage_date DATE NOT NULL,
            use_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_date (user_id, usage_date),
            INDEX idx_user_id (user_id)
        )
    `);
    console.log('[Database] AI使用记录表创建/检查完成');

    // 初始化默认套餐
    const [existingPlans] = await pool.execute('SELECT COUNT(*) as count FROM plans');
    if (existingPlans[0].count === 0) {
        const defaultPlans = [
            { id: 'basic_monthly', name: '基础VIP月卡', price: 9.9, period: '月', features: JSON.stringify(['解锁全部文案', 'AI 无限使用', '风格复刻', '文案图片导出', '专属素材库无上限', '无广告']), popular: 0 },
            { id: 'basic_yearly', name: '基础VIP年卡', price: 39.9, period: '年', features: JSON.stringify(['解锁全部文案', 'AI 无限使用', '风格复刻', '文案图片导出', '专属素材库无上限', '无广告']), popular: 1 },
            { id: 'pro_monthly', name: '高级VIP月卡', price: 19.9, period: '月', features: JSON.stringify(['基础VIP全部权益', '高阶场景生成', '素材导出', '新功能优先体验', '专属客服']), popular: 0 },
            { id: 'pro_yearly', name: '高级VIP年卡', price: 99, period: '年', features: JSON.stringify(['基础VIP全部权益', '高阶场景生成', '素材导出', '新功能优先体验', '专属客服']), popular: 0 }
        ];
        for (const plan of defaultPlans) {
            await pool.execute(
                'INSERT INTO plans (id, name, price, period, features, popular) VALUES (?, ?, ?, ?, ?, ?)',
                [plan.id, plan.name, plan.price, plan.period, plan.features, plan.popular]
            );
        }
        console.log('[Database] 默认套餐已初始化');
    }
}

/**
 * 导入文案数据
 */
async function importWenans() {
    const wenans = [
        { id: '1', text: '回忆是落在心脏上的第一片雪花', category: 'emotion' },
        { id: '2', text: '我不能改变你，所以我能做的，就是看着你远去', category: 'emotion' },
        { id: '3', text: '是我眼前起了雾？不怪当初走错路', category: 'emotion' },
        { id: '4', text: '时间推动旧誓言，你我再难回以前', category: 'emotion' },
        { id: '5', text: '如果幸福飘忽不定，那么我坚定选择独行', category: 'emotion' },
        { id: '6', text: '被爱到底是什么感觉？我现在都搞不懂', category: 'emotion' },
        { id: '7', text: '时间总是让人成长，但从不指名方向', category: 'emotion' },
        { id: '8', text: '到底要走多少弯路？才能为以后的幸福铺好路', category: 'emotion' },
        { id: '9', text: '斑驳的记忆，回不去的曾经', category: 'emotion' },
        { id: '10', text: '我把痛苦当玩笑话讲，直到有人心疼着说这不好笑', category: 'emotion' },
        { id: '11', text: '用离开试探爱的人，失去爱也理所当然', category: 'emotion' },
        { id: '12', text: '蒲公英一吹就散，哪有什么约定', category: 'emotion' },
        { id: '13', text: '这条路没有最佳观众，我永远是我自己', category: 'inspirational' },
        { id: '14', text: '真诚稀薄寡淡，爱也随风而逝', category: 'emotion' },
        { id: '15', text: '我尊重所有失去，也珍惜所有相遇', category: 'emotion' },
        { id: '16', text: '和过去告别，幸福才会开始转动', category: 'emotion' },
        { id: '17', text: '回忆模糊了，只是我太过于执念罢了', category: 'emotion' },
        { id: '18', text: '真正的痛苦不是回忆，而是慢慢忘记', category: 'emotion' },
        { id: '19', text: '一次又一次的落差感后，我逐渐麻木，直到有一天我不再期待幸福的出现', category: 'emotion' },
        { id: '20', text: '时间错过不会再来，想要拥抱你却不在', category: 'emotion' },
        { id: '21', text: '分别这课我永远学不会', category: 'emotion' },
        { id: '22', text: '爱可以是笨拙，可以是不知所措，但绝对不是冷漠和勿视', category: 'love' },
        { id: '23', text: '早知如此绊人心，何如当初莫相识', category: 'love' },
        { id: '24', text: '如果执着与过去，那怎么翻开人生的新篇章', category: 'inspirational' },
        { id: '25', text: '早知如此绊人心，何如当初莫相识', category: 'love' },
        { id: '26', text: '到底要流多少眼泪才能得到真正的幸福', category: 'emotion' },
        { id: '27', text: '爱而不得，终是遗憾，天地尚且不全，何况人呢', category: 'love' },
        { id: '28', text: '当孤独成为习惯，就不会奢求陪伴', category: 'emotion' },
        { id: '29', text: '承诺都是骗子，时间才是答案', category: 'emotion' },
        { id: '30', text: '我开始恐惧幸福，因为幸福过后需要千倍的痛来偿还', category: 'emotion' },
        { id: '31', text: '风吹樱花落，人与樱花错，相逢本无意，花落人终散', category: 'emotion' },
        { id: '32', text: '或许付出的真心就是一场报应', category: 'emotion' },
        { id: '33', text: '人是因为嘴硬而失去很多东西，也会因为心软而受很多委屈', category: 'emotion' },
        { id: '34', text: '有隔阂的那一刻我们永远回不去', category: 'emotion' },
        { id: '35', text: '买了张幸福体验卡，赠品是永久的痛苦', category: 'emotion' },
        { id: '36', text: '人因为嘴硬而失去很多东西，也会因为心软而受很多委屈', category: 'emotion' },
        { id: '37', text: '风吹醒了我的记忆，那段清晰的残局早已无力更改', category: 'emotion' },
        { id: '38', text: '如果泪水比爱多，那我们走到这里就行', category: 'love' },
        { id: '39', text: '或许离别太久已经不适合重逢了', category: 'emotion' },
        { id: '40', text: '每一次不经意间的相遇我都会偷偷回头', category: 'love' },
        { id: '41', text: '当各自不愿让步，爱不爱已经没那么重要了', category: 'love' },
        { id: '42', text: '他永远不会记得你的好，只知道你的错', category: 'emotion' },
        { id: '43', text: '忘掉一个人的方法就是去爱上另一个人', category: 'love' },
        { id: '44', text: '一路走来的委屈我又可以向谁诉说呢', category: 'emotion' },
        { id: '45', text: '就算无法重归于好，我也希望你好好生活', category: 'love' },
        { id: '46', text: '幸福的代价是留下数不清的眼泪', category: 'emotion' },
        { id: '47', text: '短暂的美好记忆却是我无法释怀的东西', category: 'emotion' },
        { id: '48', text: '直到我发现我流的泪比你说的累还多', category: 'emotion' },
        { id: '49', text: '爱玩是我的性格，不是对感情的态度', category: 'emotion' },
        { id: '50', text: '或许我唯一的败笔就是心软', category: 'emotion' },
        { id: '51', text: '幸福太贵了我买不起', category: 'emotion' },
        { id: '52', text: '一生气就不说话，一难过就不吃饭，像我这种没有安全感的人，永远都先惩罚自己', category: 'emotion' },
        { id: '53', text: '真正痛苦的是你不知道那些你自以为很幸福的瞬间，其实对方早就变心了', category: 'emotion' },
        { id: '54', text: '如果我不爱你，我怎么会有那么多情绪', category: 'love' },
        { id: '55', text: '人性最浅薄的地方就是一错抵百好，如果你不记得我的好，那我永远是坏人', category: 'emotion' },
        { id: '56', text: '总想用睡觉来逃避一切，可做梦也会让我想起所有', category: 'emotion' },
        { id: '57', text: '如果无法共鸣，那我选择独行', category: 'inspirational' },
        { id: '58', text: '哪有什么避风港，心情不好的时候从来都是一个人', category: 'emotion' },
        { id: '59', text: '我当然知道人都是会变的，也从来没指望你永远如初', category: 'emotion' },
        { id: '60', text: '人都是会变的，我不可能永远都害怕失去', category: 'emotion' },
        { id: '61', text: '情绪的尽头不是脏话不是发泄，而是沉默', category: 'emotion' },
        { id: '62', text: '相遇总有原因，不是恩赐就是教训', category: 'emotion' },
        { id: '63', text: '后来我才发现，离开是必修课', category: 'emotion' },
        { id: '64', text: '承诺都是骗子，时间才是答案', category: 'emotion' },
        { id: '65', text: '也许有一天你学会珍惜的时候，有些东西已经不存在了', category: 'emotion' },
        { id: '66', text: '从那以后，我就知道，这世上最不被珍惜的就是无底线的原谅和没有原则的妥协', category: 'emotion' },
        { id: '67', text: '可我真的是爱戒指吗？我想要的是戒指另一端不变的爱人', category: 'love' },
        { id: '68', text: '爱本就不虚情假意，他能给你的也能给别人', category: 'love' },
        { id: '69', text: '爱当然困不住我，困住我的是你', category: 'love' },
        { id: '70', text: '人生缓缓自有答案', category: 'life' },
        { id: '71', text: '先懂我再谈永远', category: 'love' },
        { id: '72', text: '若命运送我一生风雪，那我做自己的长明灯', category: 'inspirational' },
        { id: '73', text: '我不再像某一天过分强调爱意，我将如同往常一样深爱我自己', category: 'inspirational' },
        { id: '74', text: '谎言是我们都到此为止', category: 'emotion' },
        { id: '75', text: '遇见是故事的开始，也是离别的倒计时', category: 'emotion' },
        { id: '76', text: '那天心一狠全删了，后来思念差点杀了我', category: 'emotion' },
        { id: '77', text: '真的很讨厌一些短暂陪伴的人，突然闯入我的生活里，打乱我平静已久的生活节奏', category: 'emotion' },
        { id: '78', text: '当孤独成为习惯，就不会奢求陪伴', category: 'emotion' },
        { id: '79', text: '缘分是本书，翻的太快会错过，读的认真会流泪', category: 'love' },
        { id: '80', text: '人不可能每一步都正确，与其重新不如从心', category: 'life' },
        { id: '81', text: '好希望回到那个时候，开心永远不能定格', category: 'emotion' },
        { id: '82', text: '你赢了以后这份感情你有钱也买不到了', category: 'love' },
        { id: '83', text: '当爱有了隔阂，就再也回不到从前', category: 'love' },
        { id: '84', text: '我本以为重蹈覆辙你真的会用心爱我一次', category: 'love' },
        { id: '85', text: '也许我们都回头了，但我们已经错过了', category: 'love' },
        { id: '86', text: '无数个美好瞬间我想的都是我和你', category: 'love' },
        { id: '87', text: '我想把最好的都给你，可你却置之不理', category: 'love' },
        { id: '88', text: '失而复得未必圆满，求而不得未必遗憾', category: 'life' },
        { id: '89', text: '所谓的爱都是谎言和欺骗构成的', category: 'love' },
        { id: '90', text: '泪失尽的那一刻我也无能为力', category: 'emotion' },
        { id: '91', text: '你教会我怎么爱你，却没教会遗忘', category: 'love' },
        { id: '92', text: '我拿命换幸福，哪怕是片刻的', category: 'love' },
        { id: '93', text: '我想离别这一课我始终学不会', category: 'emotion' },
        { id: '94', text: '总以为长篇大论能换回什么', category: 'emotion' },
        { id: '95', text: '讨厌眼角划过泪的感觉，也恨每次都在哭', category: 'emotion' },
        { id: '96', text: '如潮水般的回忆涌入的回忆全是不堪', category: 'emotion' },
        { id: '97', text: '想过幸福，可是幸福总是断断续续的', category: 'emotion' },
        { id: '98', text: '我不再执着我们的那些，或许某天，你也会成为我轻描淡写的一页', category: 'emotion' },
        { id: '99', text: '风吹樱花落，人与樱花错，相逢本无意，花落人终散', category: 'emotion' },
        { id: '100', text: '善良和爱都是免费的，但不是廉价，就像我对你的好，是我愿意，不是我应该的', category: 'life' },
        { id: '101', text: '如果爱是博弈，我想一个人更轻松', category: 'emotion' },
        { id: '102', text: '新鲜感褪去后，迁就并不能撑起稀薄的缘分', category: 'love' },
        { id: '103', text: '人是经不起等待的，算了有算了的道理', category: 'emotion' },
        { id: '104', text: '如果真心，时间算什么？如果在乎，距离又算什么', category: 'love' },
        { id: '105', text: '再见这个词，到底是约定还是告别？', category: 'emotion' },
        { id: '106', text: '有一种花叫满天星，它的花语是我甘愿做配角，瞒着所有人爱你', category: 'love' },
        { id: '107', text: '如果爱情再次降临到我的头上，我希望最终能遇到一个害怕伤害我感情的人', category: 'love' },
        { id: '108', text: '真诚这个东西，很贵，给对的人就是无价，给错的人就是一文不值', category: 'life' },
        { id: '109', text: '离别，是爱里最长的一瞥', category: 'love' },
        { id: '110', text: '教会我的从来不是生活而是形形色色的人', category: 'life' },
        { id: '111', text: '人总是这样，心知肚明还有所期待', category: 'emotion' },
        { id: '112', text: '付出真心是一种晦涩的痛，爱到最后是一堆没用的聊天记录', category: 'emotion' },
        { id: '113', text: '或许，当我真正的想通的时候，就什么都不重要了', category: 'life' },
        { id: '114', text: '很久了我依然站在原地，或许你也没想到', category: 'emotion' },
        { id: '115', text: '我始终不明白，为什么人在最累的时候第一反应是放弃自己爱的人', category: 'love' },
        { id: '116', text: '爱让高傲的人低头，让自卑的人勇敢', category: 'love' },
        { id: '117', text: '有些话说出来很伤人，请对在乎你的人温柔点', category: 'life' },
        { id: '118', text: '前方终归是温柔和月光，接受平凡的自己就是最大的教养', category: 'life' },
        { id: '119', text: '活潇洒一点，让笑容成为心情，而不是表情', category: 'life' },
        { id: '120', text: '任何事情都有答案，与其一味的烦恼，不如顺其自然', category: 'life' },
        { id: '121', text: '那些所谓的遗憾，可能是一种成长，那些曾受过的伤，终会化作照亮前路的光', category: 'inspirational' },
        { id: '122', text: '人情绪的尽头不是脏话不是发泄，是沉默', category: 'emotion' },
        { id: '123', text: '只想安安静静的做好自己，然后在一些方面发一点点光', category: 'life' },
        { id: '124', text: '与其强求别人改变，不如把心放在如何让自己快乐生活', category: 'life' },
        { id: '125', text: '善意可以给任何人，但喜欢和爱不行', category: 'life' },
        { id: '126', text: '光终究会散在我身上，我也会灿烂一场', category: 'inspirational' },
        { id: '127', text: '直到那朵花枯萎了，你才知道爱要及时', category: 'love' },
        { id: '128', text: '可是温和久了，稍有脾气就成了恶人', category: 'emotion' },
        { id: '129', text: '怪风太温柔，像老朋友，像旧时候', category: 'emotion' },
        { id: '130', text: '有人困在雨里，有人雨中赏雨', category: 'life' },
        { id: '131', text: '一个人只拥有此生此世是不够的，他还应该拥有诗意的世界', category: 'life' },
        { id: '132', text: '这世间青山灼灼星光杳杳秋雨渐渐晚风慢慢', category: 'life' },
        { id: '133', text: '青春只有一次，喜欢就不要错过', category: 'love' },
        { id: '134', text: '拥有的时候不要毁，失去的时候不要悔', category: 'life' },
        { id: '135', text: '怪我不出众的脸留不住你暧昧跳动的眼', category: 'love' },
        { id: '136', text: '明明没人心疼还要一副长不大的样子', category: 'emotion' },
        { id: '137', text: '越少人知道我的现状越好，我只想安安静静的生活', category: 'life' },
        { id: '138', text: '很庆幸一路都是自己撑过来的，所以少了谁的陪伴都无关紧要', category: 'life' },
        { id: '139', text: '问心无愧就好，时间证明不了什么，任何人在任何时间分道扬镳都很正常', category: 'life' },
        { id: '140', text: '很多时候你必须一个人前行，这不是孤独而是选择', category: 'inspirational' },
        { id: '141', text: '快乐不难知足就好，今天很好希望明天也是', category: 'life' },
        { id: '142', text: '秋天适合思念，冬天适合相见', category: 'love' },
        { id: '143', text: '爱是雪地里写诗，落下的全是我的心事', category: 'love' },
        { id: '144', text: '有你陪的路雪再大我都觉得温暖', category: 'love' },
        { id: '145', text: '所有的遗憾和不甘都随雪花飘落释怀吧', category: 'life' },
        { id: '146', text: '回忆总是刺向心头，或许我们不该相遇', category: 'love' },
        { id: '147', text: '无奈的是连自己都不知道自己在累什么', category: 'emotion' },
        { id: '148', text: '是不是只要足够冷漠，难过的就不会是我', category: 'emotion' },
        { id: '149', text: '我已经不在乎那些可有可无的陪伴了', category: 'emotion' },
        { id: '150', text: '人生那么短，喜欢就应该纠缠一辈子', category: 'love' },
        { id: '151', text: '时间或许不是回忆的对手', category: 'emotion' },
        { id: '152', text: '理性带着遗憾的放弃，明知有风险却依然坚定选择的跟注', category: 'life' },
        { id: '153', text: '情刀划过旧四季，没人能将你代替', category: 'love' },
        { id: '154', text: '总说我玩的花，但我认真谈的时候也没见谁对得起我', category: 'emotion' },
        { id: '155', text: '我把委屈说给雨听，雨替我哭了好久好久', category: 'emotion' },
        { id: '156', text: '如果有一天我销声匿迹，请原谅我的不辞而别', category: 'emotion' },
        { id: '157', text: '承诺就像一张白纸毫无意义', category: 'emotion' },
        { id: '158', text: '一物可以换一物，一心未必换一心', category: 'emotion' },
        { id: '159', text: '今年很累，我不想和谁吵，不想再和谁闹，我自己走过的这段路，我自己都替自己感到心酸', category: 'emotion' },
        { id: '160', text: '一个人要仰望多少次才能看见苍穹，一个人要回首多少次才能放下旧我', category: 'inspirational' },
        { id: '161', text: '不要等到失去了才明白，Ta有多重要', category: 'love' },
        { id: '162', text: '做自己不是解释自己', category: 'life' },
        { id: '163', text: '野花肆意生长，爱意永不退散', category: 'love' },
        { id: '164', text: '浪漫不止，温柔永生', category: 'love' },
        { id: '165', text: '爱与自由三七分', category: 'love' },
        { id: '166', text: '眼中有爱看什么都浪漫，平安是最幸福的', category: 'life' },
        { id: '167', text: '也许我不完美，但是各花各有各花香', category: 'life' },
        { id: '168', text: '总有一段旧事，提起是遗憾，想起是欢喜', category: 'emotion' },
        { id: '169', text: '摔了一跤虽然很疼，我不怪路不平，我怪我自己没看清', category: 'life' },
        { id: '170', text: '好像走错的路太多了，弥补不过来，确实很累，只是我没说', category: 'emotion' },
        { id: '171', text: '我以为我已经足够坚强了，可是你随便的一句话依然能让我泪水决堤', category: 'emotion' },
        { id: '172', text: '我一个人坐了很久，想了很多事情，还是忍不住红了眼', category: 'emotion' },
        { id: '173', text: '有点难过，突然发现我真心对待的人好像都不能真心对我', category: 'emotion' },
        { id: '174', text: '我从来不是一个勇敢的人，如果我感受到你的冷漠，我会识趣的离开', category: 'love' },
        { id: '175', text: '我没有责怪谁，我就是觉得自己太差了，我很敏感，所以我不开心', category: 'emotion' },
        { id: '176', text: '接受自己的普通，然后拼尽全力去与众不同', category: 'inspirational' },
        { id: '177', text: '要活在自己的热爱里，而不是别人的眼光里', category: 'life' },
        { id: '178', text: '本身就这模样，没办法惊艳不了任何人', category: 'life' },
        { id: '179', text: '不用听别人说我确实不怎么样', category: 'life' },
        { id: '180', text: '真正的爱和平平淡淡安安稳稳的生活就是我想要的', category: 'love' },
        { id: '181', text: '爱是世界上最善变的东西，对吗', category: 'love' },
        { id: '182', text: '爱本该坦诚，可我们的爱诞生于谎言之中', category: 'love' },
        { id: '183', text: '强者脚下没有绝路，懦夫眼里全是悬崖', category: 'inspirational' },
        { id: '184', text: '思念是一场大雪，每一片雪花都是你', category: 'love' },
        { id: '185', text: '万物皆可替代，唯独你是我的唯一', category: 'love' },
        { id: '186', text: '亲爱的，我觉得爱，是世界上最善变的东西，对吗', category: 'love' },
        { id: '187', text: '我曾以为，只要足够虔诚，就能接住另一颗心的温度，可我忘了，人与人之间，没有桥，只有风', category: 'love' },
        { id: '188', text: '我不知道相爱能不能抵万难，我只是想奇迹般的和一位觉得我可爱的人，维持一段永久的感情，仅此而已', category: 'love' },
        { id: '189', text: '我宁愿一个人听歌，一个人哭，一个人散步，也不会再花费时间去了解一个人了', category: 'emotion' },
        { id: '190', text: '如果注定分开的感情，那相遇的意义是什么', category: 'love' },
        { id: '191', text: '世界这么大，为什么我什么都没有', category: 'emotion' },
        { id: '192', text: '侧躺，眼泪划过鼻梁，真的好痛', category: 'emotion' },
        { id: '193', text: '等我想开，你就见不到我了', category: 'emotion' },
        { id: '194', text: '心疼我是吗？那就亲手丢了我', category: 'love' },
        { id: '195', text: '那晚泪失禁，心痛到窒息', category: 'emotion' },
        { id: '196', text: '回忆清零，重新开始', category: 'life' },
        { id: '197', text: '我开始接受一切，于是无所谓', category: 'life' },
        { id: '198', text: '等你想起我的好，我已经走远了', category: 'love' },
        { id: '199', text: '你也会怨我吧，为什么总胡思乱想', category: 'love' },
        { id: '200', text: '我的泪水如同泪水一样廉价', category: 'emotion' },
        { id: '201', text: '誓言像把利刃，让我痛上加痛', category: 'emotion' },
        { id: '202', text: '人有千面，心有千变', category: 'life' },
        { id: '203', text: '你总是这样，遇到难回答的问题就不说话了', category: 'emotion' },
        { id: '204', text: '时间是一面镜子，映曾经，映真心，映伪装', category: 'life' },
        { id: '205', text: '你看起来很幸福，于是我妥协了', category: 'emotion' },
        { id: '206', text: '夜晚的眼泪，我不想再为你而流了', category: 'emotion' },
        { id: '207', text: '心中若有栀子花，庭中怎有梨花树', category: 'love' }
    ];

    try {
        for (const w of wenans) {
            await pool.execute(
                'INSERT IGNORE INTO wenans (id, text, category, likes, favorites) VALUES (?, ?, ?, ?, ?)',
                [w.id, w.text, w.category, Math.floor(Math.random() * 200) + 50, Math.floor(Math.random() * 100)]
            );
        }
        console.log(`[Database] 已导入 ${wenans.length} 条文案`);
    } catch (error) {
        console.error('[Database] 导入文案失败:', error.message);
    }
}

// ============================================
// 工具函数
// ============================================

/**
 * 生成JWT Token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * 生成随机ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 生成文案号
 */
function generateWenanId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'wenan_';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 检查VIP状态和AI使用限制
 * 返回: { isVip, canUse, remaining, limit }
 */
async function checkVipAndAiLimit(userId) {
    // 获取用户VIP状态
    const [users] = await pool.execute(
        'SELECT vip_status, vip_expire_time, vip_plan FROM users WHERE id = ?',
        [userId]
    );

    if (users.length === 0) {
        return { isVip: false, canUse: false, remaining: 0, limit: 3, plan: null };
    }

    const user = users[0];
    const now = new Date();
    let isVip = false;

    if (user.vip_status === 'active' && user.vip_expire_time) {
        const expireTime = new Date(user.vip_expire_time);
        if (expireTime > now) {
            isVip = true;
        }
    }

    // VIP用户无限制
    if (isVip) {
        let limit = -1; // -1表示无限制
        if (user.vip_plan === 'basic_monthly' || user.vip_plan === 'basic_yearly') {
            limit = -1; // 基础VIP无限
        } else if (user.vip_plan === 'pro_monthly' || user.vip_plan === 'pro_yearly') {
            limit = -1; // 高级VIP无限
        }
        return { isVip: true, canUse: true, remaining: -1, limit, plan: user.vip_plan };
    }

    // 免费用户：每天3次
    const today = now.toISOString().slice(0, 10);
    const [usageRows] = await pool.execute(
        'SELECT use_count FROM ai_usage WHERE user_id = ? AND usage_date = ?',
        [userId, today]
    );

    const used = usageRows.length > 0 ? usageRows[0].use_count : 0;
    const limit = 3;
    const remaining = Math.max(0, limit - used);
    const canUse = remaining > 0;

    return { isVip: false, canUse, remaining, limit, plan: null };
}

/**
 * 记录AI使用次数
 */
async function recordAiUsage(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const id = generateId();

    try {
        // 先尝试插入，如果已存在则更新
        await pool.execute(
            'INSERT INTO ai_usage (id, user_id, usage_date, use_count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE use_count = use_count + 1',
            [id, userId, today]
        );
    } catch (err) {
        console.error('[AI] 记录使用次数失败:', err);
    }
}

/**
 * 验证JWT Token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

/**
 * 统一响应格式
 */
function successResponse(res, data, message = '操作成功') {
    res.json({ code: 200, message, data });
}

function errorResponse(res, status, message) {
    res.status(status).json({ code: status, message });
}

/**
 * 从请求中获取用户ID
 */
function getUserIdFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    return decoded ? decoded.id : null;
}

// ============================================
// 中间件配置
// ============================================

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../client'), { index: 'index.html' }));

// 安全头
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS配置
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('不允许的跨域请求'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 认证接口更严格的限流（防止暴力破解）
const authLimiter = rateLimit({
    windowMs: 60000,
    max: 30,
    message: { code: 429, message: '请求过于频繁，请稍后再试' }
});

// 请求日志
app.use((req, res, next) => {
    const requestId = crypto.randomBytes(8).toString('hex');
    res.setHeader('X-Request-Id', requestId);
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// ============================================
// API路由
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
    successResponse(res, {
        database: pool ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    }, '服务正常运行');
});

// ----------------------------------------
// 认证相关
// ----------------------------------------

// 发送验证码
app.post('/api/auth/send-code', authLimiter, (req, res) => {
    const { contact } = req.query;
    if (!contact) {
        return errorResponse(res, 400, '请提供联系方式');
    }
    successResponse(res, null, '验证码已发送');
});

// 注册
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return errorResponse(res, 400, '请输入用户名和密码');
        }
        if (password.length < 6) {
            return errorResponse(res, 400, '密码长度至少6位');
        }

        const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return errorResponse(res, 400, '用户名已存在');
        }

        const userId = generateId();
        const wenanId = generateWenanId();
        await pool.execute(
            'INSERT INTO users (id, username, password, wenan_id) VALUES (?, ?, ?, ?)',
            [userId, username, password, wenanId]
        );

        const token = generateToken({ id: userId, username });
        successResponse(res, { token, user: { id: userId, username, wenanId } }, '注册成功');
    } catch (error) {
        console.error('[Auth] 注册失败:', error);
        errorResponse(res, 500, '注册失败');
    }
});

// 登录
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return errorResponse(res, 400, '请输入用户名和密码');
        }

        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (rows.length === 0) {
            return errorResponse(res, 401, '用户名或密码错误');
        }

        const user = rows[0];
        const token = generateToken({ id: user.id, username: user.username });

        // 检查VIP是否过期
        let vipStatus = user.vip_status || 'inactive';
        if (vipStatus === 'active' && user.vip_expire_time) {
            const expireTime = new Date(user.vip_expire_time);
            if (expireTime <= new Date()) {
                vipStatus = 'expired';
            }
        }

                successResponse(res, {
            token,
            user: {
                id: user.id,
                username: user.username,
                wenanId: user.wenan_id,
                avatar: user.avatar,
                bio: user.bio,
                gender: user.gender,
                birthday: user.birthday,
                constellation: user.constellation,
                location: user.location,
                coverImage: user.cover_image,
                coverVideo: user.cover_video,
                isAdmin: user.is_admin === 1,
                vipStatus: vipStatus,
                vipExpireTime: user.vip_expire_time,
                vipPlan: user.vip_plan,
                usernameChangedAt: user.username_changed_at,
                wenanIdLastChanged: user.wenan_id_last_changed
            }
        }, '登录成功');
    } catch (error) {
        console.error('[Auth] 登录失败:', error);
        errorResponse(res, 500, '登录失败');
    }
});

// ----------------------------------------
// 管理员登录
// ----------------------------------------
const adminLimiter = rateLimit({
    windowMs: 60000,
    max: 20,
    message: { code: 429, message: '请求过于频繁，请稍后再试' }
});

app.post('/api/admin/login', adminLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return errorResponse(res, 400, '请输入账号和密码');
        }

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ? AND password = ? AND is_admin = 1',
            [username, password]
        );
        if (rows.length === 0) {
            return errorResponse(res, 401, '账号、密码错误或非管理员');
        }

        const admin = rows[0];
        const token = generateToken({ id: admin.id, username: admin.username, isAdmin: true });
        successResponse(res, {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                wenanId: admin.wenan_id,
                avatar: admin.avatar,
                isAdmin: true
            }
        }, '登录成功');
    } catch (error) {
        console.error('[Admin] 登录失败:', error);
        errorResponse(res, 500, '登录失败');
    }
});

// ----------------------------------------
// 套餐列表
// ----------------------------------------
app.get('/api/plans', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, price, period, features, popular FROM plans WHERE enabled = 1 ORDER BY price ASC'
        );
        successResponse(res, rows);
    } catch (error) {
        console.error('[Plans] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// ----------------------------------------
// VIP 套餐购买
// ----------------------------------------
app.post('/api/vip/purchase', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return errorResponse(res, 401, '请先登录');

    try {
        const { planId, planName, amount } = req.body;
        if (!planId || !planName || !amount) {
            return errorResponse(res, 400, '参数不完整');
        }

        // 计算VIP过期时间
        let expireTime = new Date();
        if (planId === 'basic_monthly' || planId === 'pro_monthly') {
            expireTime.setMonth(expireTime.getMonth() + 1);
        } else if (planId === 'basic_yearly' || planId === 'pro_yearly') {
            expireTime.setFullYear(expireTime.getFullYear() + 1);
        } else {
            // 默认一个月
            expireTime.setMonth(expireTime.getMonth() + 1);
        }

        const orderId = generateId();
        await pool.execute(
            'INSERT INTO orders (id, user_id, plan_id, plan_name, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
            [orderId, userId, planId, planName, amount, 'paid']
        );

        // 更新用户的VIP状态
        await pool.execute(
            'UPDATE users SET vip_status = ?, vip_expire_time = ?, vip_plan = ? WHERE id = ?',
            ['active', expireTime.toISOString().slice(0, 19).replace('T', ' '), planId, userId]
        );

        successResponse(res, {
            orderId,
            planName,
            amount,
            vipStatus: 'active',
            vipExpireTime: expireTime.toISOString()
        }, '购买成功');
    } catch (error) {
        console.error('[VIP] 购买失败:', error);
        errorResponse(res, 500, '购买失败');
    }
});

// 获取VIP套餐列表
app.get('/api/vip/plans', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, name, price, period, features, popular FROM plans ORDER BY price ASC');
        successResponse(res, rows);
    } catch (error) {
        console.error('[VIP Plans] 获取失败:', error);
        errorResponse(res, 500, '获取套餐列表失败');
    }
});

// 获取VIP状态
app.get('/api/vip/status', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return errorResponse(res, 401, '请先登录');

    try {
        const [rows] = await pool.execute(
            'SELECT vip_status, vip_expire_time, vip_plan FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return errorResponse(res, 404, '用户不存在');
        }

        const user = rows[0];
        const now = new Date();
        let isActive = false;

        if (user.vip_status === 'active' && user.vip_expire_time) {
            const expireTime = new Date(user.vip_expire_time);
            if (expireTime > now) {
                isActive = true;
            } else {
                // VIP已过期，更新状态
                await pool.execute(
                    'UPDATE users SET vip_status = ? WHERE id = ?',
                    ['expired', userId]
                );
            }
        }

        successResponse(res, {
            vipStatus: isActive ? 'active' : 'inactive',
            vipExpireTime: user.vip_expire_time,
            vipPlan: user.vip_plan
        });
    } catch (error) {
        console.error('[VIP] 获取状态失败:', error);
        errorResponse(res, 500, '获取VIP状态失败');
    }
});

// ----------------------------------------
// 用户相关
// ----------------------------------------

// 获取当前用户
app.get('/api/user/me', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return errorResponse(res, 404, '用户不存在');
        }

        const user = rows[0];

        // 检查VIP是否过期
        let vipStatus = user.vip_status || 'inactive';
        if (vipStatus === 'active' && user.vip_expire_time) {
            const expireTime = new Date(user.vip_expire_time);
            if (expireTime <= new Date()) {
                vipStatus = 'expired';
                // 异步更新过期状态
                pool.execute('UPDATE users SET vip_status = ? WHERE id = ?', ['expired', userId]).catch(() => {});
            }
        }

        successResponse(res, {
            id: user.id,
            username: user.username,
            wenanId: user.wenan_id,
            avatar: user.avatar,
            bio: user.bio,
            gender: user.gender,
            birthday: user.birthday,
            constellation: user.constellation,
            location: user.location,
            coverImage: user.cover_image,
            coverVideo: user.cover_video,
            isAdmin: user.is_admin === 1,
            createdAt: user.created_at,
            vipStatus: vipStatus,
            vipExpireTime: user.vip_expire_time,
            vipPlan: user.vip_plan
        });
    } catch (error) {
        console.error('[User] 获取用户失败:', error);
        errorResponse(res, 500, '获取用户信息失败');
    }
});

// 更新用户资料
app.put('/api/user/profile', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return errorResponse(res, 404, '用户不存在');
        }

        const user = users[0];
        const { username, bio, gender, birthday, constellation, location, avatar, coverImage, coverVideo, wenanId } = req.body;
        const updates = [];
        const values = [];

        // 用户名修改限制：一周5次
        if (username !== undefined && username !== null && username.trim() && username !== user.username) {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // 计算这周修改次数
            const [countResult] = await pool.execute(
                `SELECT COUNT(*) as cnt FROM username_change_history
                 WHERE user_id = ? AND changed_at > ?`,
                [userId, weekAgo.toISOString().slice(0, 19).replace('T', ' ')]
            );
            const changeCount = countResult[0]?.cnt || 0;

            if (changeCount >= 5) {
                return errorResponse(res, 400, '本周用户名修改次数已达上限5次，请下周再修改');
            }

            // 记录本次修改
            const changeId = generateId();
            await pool.execute(
                'INSERT INTO username_change_history (id, user_id) VALUES (?, ?)',
                [changeId, userId]
            );

            updates.push('username = ?');
            values.push(username.trim());
            updates.push('username_changed_at = NOW()');
        }

        // 文案号修改限制：每年最多一次
        if (wenanId !== undefined && wenanId !== null && wenanId.trim() && wenanId !== user.wenan_id) {
            // 检查是否距离上次修改满一年
            if (user.wenan_id_last_changed) {
                const lastChange = new Date(user.wenan_id_last_changed);
                const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

                if (lastChange > oneYearAgo) {
                    return errorResponse(res, 400, '文案号修改需要距离上次修改满一年');
                }
            }

            updates.push('wenan_id = ?');
            values.push(wenanId.trim());
            updates.push('wenan_id_last_changed = NOW()');
        }

        if (bio !== undefined && bio !== null) { updates.push('bio = ?'); values.push(bio); }
        if (gender !== undefined && gender !== null) { updates.push('gender = ?'); values.push(gender); }
        if (birthday !== undefined && birthday !== null) { updates.push('birthday = ?'); values.push(birthday); }
        if (constellation !== undefined && constellation !== null) { updates.push('constellation = ?'); values.push(constellation); }
        if (location !== undefined && location !== null) { updates.push('location = ?'); values.push(location); }
        if (avatar !== undefined && avatar !== null) { updates.push('avatar = ?'); values.push(avatar); }
        if (coverImage !== undefined && coverImage !== null) { updates.push('cover_image = ?'); values.push(coverImage); }
        if (coverVideo !== undefined && coverVideo !== null) { updates.push('cover_video = ?'); values.push(coverVideo); }

        if (updates.length > 0) {
            values.push(userId);
            await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [updatedUsers] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const u = updatedUsers[0];
        successResponse(res, {
            id: u.id,
            username: u.username,
            wenanId: u.wenan_id,
            avatar: u.avatar,
            bio: u.bio,
            gender: u.gender,
            birthday: u.birthday,
            constellation: u.constellation,
            location: u.location,
            coverImage: u.cover_image,
            coverVideo: u.cover_video,
            usernameChangedAt: u.username_changed_at,
            wenanIdLastChanged: u.wenan_id_last_changed,
            vipStatus: u.vip_status || 'inactive',
            vipExpireTime: u.vip_expire_time,
            vipPlan: u.vip_plan
        }, '资料更新成功');
    } catch (error) {
        console.error('[User] 更新资料失败:', error);
        errorResponse(res, 500, '更新资料失败');
    }
});

// 重新生成文案号
app.post('/api/user/regenerate-wenanid', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const newWenanId = generateWenanId();
        await pool.execute('UPDATE users SET wenan_id = ? WHERE id = ?', [newWenanId, userId]);
        successResponse(res, { wenanId: newWenanId }, '文案号已重新生成');
    } catch (error) {
        console.error('[User] 重新生成文案号失败:', error);
        errorResponse(res, 500, '重新生成失败');
    }
});

// ----------------------------------------
// 文案相关
// ----------------------------------------

// 获取精选文案（每日6条）
app.get('/api/wenan/featured', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        const [rows] = await pool.execute('SELECT * FROM wenans');
        if (rows.length === 0) {
            return successResponse(res, []);
        }

        // 根据日期生成种子，获取每日精选6条
        const today = new Date();
        const dateStr = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
        const seed = parseInt(dateStr);

        function seededRandom(s) {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        }

        const shuffled = [...rows];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const result = shuffled.slice(0, 6);

        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            result.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }

        successResponse(res, result);
    } catch (error) {
        console.error('[Wenan] 获取精选失败:', error);
        errorResponse(res, 500, '获取精选失败');
    }
});

// 获取分类每日精选（每日6条）
app.get('/api/wenan/featured/category/:cat', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        const [rows] = await pool.execute('SELECT * FROM wenans WHERE category = ?', [req.params.cat]);
        if (rows.length === 0) return successResponse(res, []);

        const today = new Date();
        const dateStr = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
        const seed = parseInt(dateStr) + req.params.cat.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

        function seededRandom(s) {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        }

        const shuffled = [...rows];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const result = shuffled.slice(0, 6);

        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            result.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }

        successResponse(res, result);
    } catch (error) {
        console.error('[Wenan] 获取分类精选失败:', error);
        errorResponse(res, 500, '获取分类精选失败');
    }
});

// 获取所有文案
app.get('/api/wenan/all', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        const [rows] = await pool.execute('SELECT * FROM wenans ORDER BY created_at DESC');
        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            rows.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }
        successResponse(res, rows);
    } catch (error) {
        console.error('[Wenan] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 按分类获取文案
app.get('/api/wenan/category/:cat', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        const [rows] = await pool.execute('SELECT * FROM wenans WHERE category = ? ORDER BY created_at DESC', [req.params.cat]);
        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            rows.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }
        successResponse(res, rows);
    } catch (error) {
        console.error('[Wenan] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 按风格和场景获取文案
app.get('/api/wenan/filter', async (req, res) => {
    try {
        const userId = getUserIdFromRequest(req);
        const { style, scene } = req.query;

        let sql = 'SELECT * FROM wenans WHERE 1=1';
        const params = [];

        // 风格筛选
        if (style && style !== 'all') {
            sql += ' AND style = ?';
            params.push(style);
        }

        // 场景筛选
        if (scene && scene !== 'all') {
            sql += ' AND scene = ?';
            params.push(scene);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(sql, params);

        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId && rows.length > 0) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            rows.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }
        successResponse(res, rows);
    } catch (error) {
        console.error('[Wenan] 筛选失败:', error);
        errorResponse(res, 500, '筛选失败');
    }
});

// 搜索文案
app.get('/api/wenan/search', async (req, res) => {
    const { keyword } = req.query;
    try {
        const userId = getUserIdFromRequest(req);
        let rows;
        if (!keyword) {
            [rows] = await pool.execute('SELECT * FROM wenans ORDER BY created_at DESC');
        } else {
            [rows] = await pool.execute('SELECT * FROM wenans WHERE text LIKE ? ORDER BY created_at DESC', [`%${keyword}%`]);
        }
        // 如果用户已登录，获取用户的点赞和收藏状态
        if (userId && rows.length > 0) {
            const [likes] = await pool.execute('SELECT wenan_id FROM likes WHERE user_id = ?', [userId]);
            const [favorites] = await pool.execute('SELECT wenan_id FROM favorites WHERE user_id = ?', [userId]);
            const likedIds = new Set(likes.map(l => l.wenan_id));
            const favoritedIds = new Set(favorites.map(f => f.wenan_id));
            rows.forEach(row => {
                row.liked = likedIds.has(row.id);
                row.favorited = favoritedIds.has(row.id);
            });
        }
        successResponse(res, rows);
    } catch (error) {
        console.error('[Wenan] 搜索失败:', error);
        errorResponse(res, 500, '搜索失败');
    }
});

// 获取单条文案
app.get('/api/wenan/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM wenans WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return errorResponse(res, 404, '文案不存在');
        }
        successResponse(res, rows[0]);
    } catch (error) {
        console.error('[Wenan] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 创建文案
app.post('/api/wenan/create', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const { text, category, style, scene } = req.body;
        if (!text || text.length < 5) {
            return errorResponse(res, 400, '文案内容至少5个字');
        }
        if (!category) {
            return errorResponse(res, 400, '请选择分类');
        }

        // 从数据库获取所有有效分类（默认 + 自定义）
        const [catRows] = await pool.execute('SELECT id FROM categories');
        const validCategoryIds = catRows.map(r => r.id);
        // 也包含默认分类
        const defaultIds = ['love', 'life', 'inspirational', 'emotion'];
        const allValid = [...defaultIds, ...validCategoryIds];
        if (!allValid.includes(category)) {
            return errorResponse(res, 400, '分类无效');
        }

        // 验证风格标签
        const validStyles = ['cold', 'literary', 'gentle', 'cool', 'ancient'];
        const finalStyle = validStyles.includes(style) ? style : 'cold';

        // 验证场景标签
        const validScenes = ['moments', 'xiaohongshu', 'video', 'job', 'birthday'];
        const finalScene = validScenes.includes(scene) ? scene : 'moments';

        const id = generateId();
        await pool.execute('INSERT INTO wenans (id, user_id, text, category, style, scene) VALUES (?, ?, ?, ?, ?, ?)', [id, userId, text, category, finalStyle, finalScene]);
        successResponse(res, { id, text, category, style: finalStyle, scene: finalScene }, '文案创建成功');
    } catch (error) {
        console.error('[Wenan] 创建失败:', error);
        errorResponse(res, 500, '创建失败');
    }
});

// 更新文案
app.put('/api/wenan/:id', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM wenans WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return errorResponse(res, 404, '文案不存在');
        }
        if (rows[0].user_id !== userId) {
            return errorResponse(res, 403, '无权修改');
        }

        const { text, category } = req.body;
        await pool.execute('UPDATE wenans SET text = ?, category = ? WHERE id = ?', [text, category, req.params.id]);
        successResponse(res, null, '更新成功');
    } catch (error) {
        console.error('[Wenan] 更新失败:', error);
        errorResponse(res, 500, '更新失败');
    }
});

// 删除文案
app.delete('/api/wenan/:id', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM wenans WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return errorResponse(res, 404, '文案不存在');
        }
        if (rows[0].user_id !== userId) {
            return errorResponse(res, 403, '无权删除');
        }

        await pool.execute('DELETE FROM wenans WHERE id = ?', [req.params.id]);
        successResponse(res, null, '删除成功');
    } catch (error) {
        console.error('[Wenan] 删除失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

// 点赞/取消点赞
app.post('/api/wenan/:id/like', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [existing] = await pool.execute('SELECT * FROM likes WHERE user_id = ? AND wenan_id = ?', [userId, req.params.id]);

        if (existing.length > 0) {
            await pool.execute('DELETE FROM likes WHERE user_id = ? AND wenan_id = ?', [userId, req.params.id]);
            await pool.execute('UPDATE wenans SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [req.params.id]);
            const [updated] = await pool.execute('SELECT likes FROM wenans WHERE id = ?', [req.params.id]);
            successResponse(res, { liked: false, likes: updated[0]?.likes || 0 }, '已取消点赞');
        } else {
            await pool.execute('INSERT INTO likes (id, user_id, wenan_id) VALUES (?, ?, ?)', [generateId(), userId, req.params.id]);
            await pool.execute('UPDATE wenans SET likes = likes + 1 WHERE id = ?', [req.params.id]);
            const [updated] = await pool.execute('SELECT likes FROM wenans WHERE id = ?', [req.params.id]);
            successResponse(res, { liked: true, likes: updated[0]?.likes || 0 }, '点赞成功');
        }
    } catch (error) {
        console.error('[Wenan] 点赞失败:', error);
        errorResponse(res, 500, '点赞失败');
    }
});

// 收藏/取消收藏
app.post('/api/wenan/:id/favorite', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [existing] = await pool.execute('SELECT * FROM favorites WHERE user_id = ? AND wenan_id = ?', [userId, req.params.id]);

        if (existing.length > 0) {
            await pool.execute('DELETE FROM favorites WHERE user_id = ? AND wenan_id = ?', [userId, req.params.id]);
            await pool.execute('UPDATE wenans SET favorites = GREATEST(favorites - 1, 0) WHERE id = ?', [req.params.id]);
            const [updated] = await pool.execute('SELECT favorites FROM wenans WHERE id = ?', [req.params.id]);
            successResponse(res, { favorited: false, favorites: updated[0]?.favorites || 0 }, '已取消收藏');
        } else {
            await pool.execute('INSERT INTO favorites (id, user_id, wenan_id) VALUES (?, ?, ?)', [generateId(), userId, req.params.id]);
            await pool.execute('UPDATE wenans SET favorites = favorites + 1 WHERE id = ?', [req.params.id]);
            const [updated] = await pool.execute('SELECT favorites FROM wenans WHERE id = ?', [req.params.id]);
            successResponse(res, { favorited: true, favorites: updated[0]?.favorites || 0 }, '收藏成功');
        }
    } catch (error) {
        console.error('[Wenan] 收藏失败:', error);
        errorResponse(res, 500, '收藏失败');
    }
});

// 获取我的统计数据
app.get('/api/wenan/my/stats', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [uploads] = await pool.execute('SELECT COUNT(*) as count FROM wenans WHERE user_id = ?', [userId]);
        const [likes] = await pool.execute('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', [userId]);
        const [favorites] = await pool.execute('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId]);
        successResponse(res, {
            uploads: uploads[0]?.count || 0,
            likes: likes[0]?.count || 0,
            favorites: favorites[0]?.count || 0
        });
    } catch (error) {
        console.error('[Wenan] 获取统计失败:', error);
        errorResponse(res, 500, '获取统计失败');
    }
});

// 获取我的文案/点赞/收藏
app.get('/api/wenan/my/:type', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const { type } = req.params;
        let data = [];

        if (type === 'uploads') {
            const [rows] = await pool.execute('SELECT * FROM wenans WHERE user_id = ? ORDER BY created_at DESC', [userId]);
            data = rows;
        } else if (type === 'likes') {
            const [rows] = await pool.execute('SELECT w.* FROM wenans w JOIN likes l ON w.id = l.wenan_id WHERE l.user_id = ?', [userId]);
            // 为每条记录添加 liked 字段
            data = rows.map(row => ({ ...row, liked: true }));
        } else if (type === 'favorites') {
            const [rows] = await pool.execute('SELECT w.* FROM wenans w JOIN favorites f ON w.id = f.wenan_id WHERE f.user_id = ?', [userId]);
            // 为每条记录添加 favorited 字段
            data = rows.map(row => ({ ...row, favorited: true }));
        }

        successResponse(res, data);
    } catch (error) {
        console.error('[Wenan] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// ----------------------------------------
// 分类相关
// ----------------------------------------

// 获取所有分类（默认 + 自定义）
app.get('/api/categories', async (req, res) => {
    const userId = getUserIdFromRequest(req);

    let customCategories = [];
    if (userId) {
        try {
            const [rows] = await pool.execute('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC', [userId]);
            customCategories = rows.map(row => ({
                id: row.id,
                name: row.name,
                icon: row.icon,
                color: row.color,
                isDefault: false
            }));
        } catch (error) {
            console.error('[Category] 获取自定义分类失败:', error);
        }
    }

    successResponse(res, [...DEFAULT_CATEGORIES, ...customCategories]);
});

// 创建自定义分类
app.post('/api/categories', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const { name, icon, color } = req.body;

        if (!name || !name.trim()) {
            return errorResponse(res, 400, '分类名称不能为空');
        }

        const id = 'cat_' + Date.now().toString(36);
        const categoryName = name.trim();
        const categoryIcon = icon || '📂';
        const categoryColor = color || '#ff6b9d';

        await pool.execute(
            'INSERT INTO categories (id, user_id, name, icon, color) VALUES (?, ?, ?, ?, ?)',
            [id, userId, categoryName, categoryIcon, categoryColor]
        );

        successResponse(res, {
            id,
            name: categoryName,
            icon: categoryIcon,
            color: categoryColor,
            isDefault: false
        }, '分类创建成功');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return errorResponse(res, 400, '该分类已存在');
        }
        console.error('[Category] 创建分类失败:', error);
        errorResponse(res, 500, '创建分类失败');
    }
});

// 获取所有风格标签
app.get('/api/styles', async (req, res) => {
    successResponse(res, DEFAULT_STYLES);
});

// 获取所有场景标签
app.get('/api/scenes', async (req, res) => {
    successResponse(res, DEFAULT_SCENES);
});

// ============================================
// AI 文案生成
// ============================================

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 512;
console.log('[DEBUG] OLLAMA_MODEL =', OLLAMA_MODEL);

// AI文案生成
app.post('/api/ai/generate', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    const { prompt, category, scene, style, wordCount } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return errorResponse(res, 400, '请输入关键词或描述');
    }

    // 构建AI提示词
    const categoryNames = {
        'love': '爱情',
        'life': '人生',
        'inspirational': '励志',
        'emotion': '情感',
        'all': '通用'
    };

    const sceneNames = {
        'moment': '朋友圈',
        'weibo': '微博',
        'xiaohongshu': '小红书',
        'douyin': '抖音',
        'other': '其他'
    };

    const styleNames = {
        'literary': '文艺清新',
        'humor': '幽默风趣',
        'romantic': '深情款款',
        'inspirational': '励志向上',
        'simple': '简约大气'
    };

    const catName = categoryNames[category] || '情感';
    const sceneName = sceneNames[scene] || '';
    const styleName = styleNames[style] || '文艺清新';
    const targetLength = wordCount || 50;

    const fullPrompt = `Create a short Chinese text based on the user's request.

Requirements:
- About ${targetLength} characters
- Style: ${styleName}
- Theme: ${catName}
${sceneName ? `- Use scene: ${sceneName}` : ''}
- No emoji
- Only output the text, no explanation

User request: ${prompt}`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: 'You are a professional Chinese copywriter. Create beautiful, emotional short texts.' },
                    { role: 'user', content: fullPrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: AI_MAX_TOKENS
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Ollama API error:', response.status, errorData);
            return errorResponse(res, 500, 'AI服务调用失败，请稍后重试');
        }

        const data = await response.json();
        console.log('[AI] Ollama raw response:', JSON.stringify(data).substring(0, 200));
        const generatedText = data.message?.content?.trim() || '';

        if (!generatedText) {
            console.error('[AI] Ollama response no text:', JSON.stringify(data));
            return errorResponse(res, 500, 'AI服务返回异常，请稍后重试');
        }
        console.log('[AI] generated text:', generatedText);

        // 先生成ID并返回结果，再异步保存记录
        const id = generateId();

        // 先返回结果给用户，再异步保存到数据库
        successResponse(res, { text: generatedText, id });

        // 异步保存生成记录（不阻塞响应）
        pool.execute(
            'INSERT INTO ai_generations (id, user_id, prompt, result, category, scene, style, word_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, prompt, generatedText, category, scene, style, wordCount]
        ).catch(err => console.error('[AI] 保存生成记录失败:', err));
    } catch (error) {
        console.error('[AI] 生成文案失败:', error);
        errorResponse(res, 500, '生成文案失败，请稍后重试');
    }
});

// AI分析用户需求
app.post('/api/ai/analyze', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    const { prompt, category, style } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return errorResponse(res, 400, '请输入需求描述');
    }

    const categoryNames = {
        'love': '爱情',
        'life': '人生',
        'inspirational': '励志',
        'emotion': '情感',
        'all': '情感'
    };

    const styleNames = {
        'literary': '文艺清新',
        'humor': '幽默风趣',
        'romantic': '深情款款',
        'inspirational': '励志向上',
        'simple': '简约大气'
    };

    const catName = categoryNames[category] || '情感';
    const styleName = styleNames[style] || '文艺清新';

    const analyzePrompt = `你是一个专业的文案创作助手。请分析以下用户需求的情感特点和创作方向。

用户需求："${prompt}"

请从以下几个维度进行分析（用30-50字概括）：
1. 主要情感倾向（浪漫、温暖、励志、治愈等）
2. 目标受众和适用场景
3. 建议的文案风格和语气
4. 可能的创作角度

直接输出分析结果，不需要额外解释。`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的文案创作助手，擅长分析用户需求并给出有价值的洞察。' },
                    { role: 'user', content: analyzePrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.8,
                    num_predict: 256
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Analyze API error:', response.status, errorData);
            return errorResponse(res, 500, 'AI分析失败，请稍后重试');
        }

        const data = await response.json();
        const analysis = data.message?.content?.trim() || '';

        if (!analysis) {
            return errorResponse(res, 500, 'AI分析返回异常');
        }

        successResponse(res, { analysis });
    } catch (error) {
        console.error('[AI] 分析需求失败:', error);
        errorResponse(res, 500, '分析需求失败，请稍后重试');
    }
});

// 基于分析结果生成文案
app.post('/api/ai/generate-with-analysis', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    const { prompt, analysis, category, style } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return errorResponse(res, 400, '请输入需求描述');
    }

    const categoryNames = {
        'love': '爱情',
        'life': '人生',
        'inspirational': '励志',
        'emotion': '情感',
        'all': '情感'
    };

    const styleNames = {
        'literary': '文艺清新',
        'humor': '幽默风趣',
        'romantic': '深情款款',
        'inspirational': '励志向上',
        'simple': '简约大气'
    };

    const catName = categoryNames[category] || '情感';
    const styleName = styleNames[style] || '文艺清新';

    const generatePrompt = `基于以下分析和用户需求，创作一段高质量文案。

用户原始需求："${prompt}"
${analysis ? `专业分析：${analysis}` : ''}

创作要求：
- 风格：${styleName}
- 主题：${catName}
- 文字优美、有感染力，能引起读者共鸣
- 长度：60-100字
- 不要使用emoji
- 直接输出文案，不要任何解释或前缀

请开始创作：`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的文案创作者，擅长创作优美、感人、有深度的中文短文案。你的文字应该温暖、有力量，能够触动人心。' },
                    { role: 'user', content: generatePrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.85,
                    num_predict: 512
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Generate with analysis error:', response.status, errorData);
            return errorResponse(res, 500, 'AI生成失败，请稍后重试');
        }

        const data = await response.json();
        const generatedText = data.message?.content?.trim() || '';

        if (!generatedText) {
            return errorResponse(res, 500, 'AI生成返回异常');
        }

        // 生成ID并异步保存记录
        const id = generateId();
        successResponse(res, { text: generatedText, id });

        // 异步保存生成记录
        pool.execute(
            'INSERT INTO ai_generations (id, user_id, prompt, result, category, style) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, prompt, generatedText, category, style]
        ).catch(err => console.error('[AI] 保存生成记录失败:', err));
    } catch (error) {
        console.error('[AI] 生成文案失败:', error);
        errorResponse(res, 500, '生成文案失败，请稍后重试');
    }
});

// 获取AI使用状态（剩余次数、VIP状态等）
app.get('/api/ai/usage', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const vipStatus = await checkVipAndAiLimit(userId);
        successResponse(res, {
            isVip: vipStatus.isVip,
            remaining: vipStatus.remaining,
            limit: vipStatus.limit,
            plan: vipStatus.plan
        });
    } catch (error) {
        console.error('[AI] 获取使用状态失败:', error);
        errorResponse(res, 500, '获取使用状态失败');
    }
});

// 获取AI生成历史
app.get('/api/ai/history', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    console.log('[AI History] userId:', userId);

    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [rows] = await pool.execute(
            'SELECT * FROM ai_generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, String(pageSize), String(offset)]
        );

        console.log('[AI History] found rows:', rows.length);

        const [[{ total }]] = await pool.execute(
            'SELECT COUNT(*) as total FROM ai_generations WHERE user_id = ?',
            [userId]
        );

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        successResponse(res, {
            list: rows,
            total,
            page,
            pageSize
        });
    } catch (error) {
        console.error('[AI] 获取历史记录失败:', error);
        errorResponse(res, 500, '获取历史记录失败');
    }
});

// 删除AI生成记录
app.delete('/api/ai/history/:id', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM ai_generations WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );

        if (rows.length === 0) {
            return errorResponse(res, 404, '记录不存在或无权删除');
        }

        await pool.execute('DELETE FROM ai_generations WHERE id = ?', [req.params.id]);
        successResponse(res, null, '记录已删除');
    } catch (error) {
        console.error('[AI] 删除记录失败:', error);
        errorResponse(res, 500, '删除记录失败');
    }
});

// AI 对话（支持问候和闲聊）
app.post('/api/ai/chat', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    const { messages, type } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return errorResponse(res, 400, '请提供对话内容');
    }

    // 构建系统提示词
    let systemPrompt = '你是一个温柔、友善的AI文案助手，名字叫秋辞。你的目标是了解用户需求并帮助他们生成高质量的文案。你应该像朋友一样与用户交流，自然地引导对话。';

    if (type === 'greeting') {
        systemPrompt = '你是一个热情、温暖的AI文案助手。用户的输入是简单的问候，你应该用友好、亲切的方式回应，并自然地引导用户说出他们的文案需求。不要急于介绍功能，用自然的对话方式让用户感到舒适。';
    }

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                ],
                stream: false,
                options: {
                    temperature: 0.85,
                    num_predict: 512
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Chat API error:', response.status, errorData);
            return errorResponse(res, 500, 'AI服务调用失败，请稍后重试');
        }

        const data = await response.json();
        const responseText = data.message?.content?.trim() || '';

        if (!responseText) {
            return errorResponse(res, 500, 'AI服务返回异常');
        }

        // 检测用户消息是否为文案相关请求，只有文案相关才保存到历史记录
        const userPrompt = messages.length > 0 ? messages[messages.length - 1].content : '';
        const isCopyRelated = /文案|生成|写|创作|广告|宣传|推广|营销|文案需求|给我一段|来一句|来一段|帮我写|帮我生成|需要文案|想要文案/i.test(userPrompt);

        if (isCopyRelated) {
            const id = generateId();
            pool.execute(
                'INSERT INTO ai_generations (id, user_id, prompt, result, category, style) VALUES (?, ?, ?, ?, ?, ?)',
                [id, userId, userPrompt, responseText, 'all', 'literary']
            ).catch(err => console.error('[AI] 保存对话历史失败:', err));
        }

        // 检测是否应该建议用户生成文案
        const suggestCopy = /想要|需要|文案|写|创作|生成/i.test(responseText);

        successResponse(res, { response: responseText, suggestCopy: !!suggestCopy });
    } catch (error) {
        console.error('[AI] 对话失败:', error);
        errorResponse(res, 500, '对话失败，请稍后重试');
    }
});

// AI 理解用户意图并生成文案请求
app.post('/api/ai/understand', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    // 检查VIP和AI使用限制
    const vipStatus = await checkVipAndAiLimit(userId);
    if (!vipStatus.canUse) {
        if (vipStatus.isVip) {
            return errorResponse(res, 403, '今日AI使用次数已用完，请明天再来');
        } else {
            return errorResponse(res, 403, '今日AI使用次数已用完（免费用户每日3次），开通VIP解锁更多次数');
        }
    }

    const { prompt, category, style } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return errorResponse(res, 400, '请输入需求描述');
    }

    // 记录使用
    await recordAiUsage(userId);

    const categoryNames = {
        'love': '爱情',
        'life': '人生',
        'inspirational': '励志',
        'emotion': '情感',
        'all': '情感'
    };

    const styleNames = {
        'literary': '文艺清新',
        'humor': '幽默风趣',
        'romantic': '深情款款',
        'inspirational': '励志向上',
        'simple': '简约大气'
    };

    const catName = categoryNames[category] || '情感';
    const styleName = styleNames[style] || '文艺清新';

    const understandPrompt = `用户说："${prompt}"

请分析用户的真实需求，并用温暖、友好的方式回应。

1. 如果用户只是在打招呼或闲聊：
   - 用亲切自然的方式回应
   - 简要提及你可以帮助他们创作文案
   - 不要罗列功能，保持对话自然

2. 如果用户想要生成文案（如：帮我写、生成、创作等）：
   - 先友好地确认理解用户的需求
   - 简要总结你理解的主题和风格
   - 表达你会如何创作
   - 然后直接开始生成一段高质量文案

风格要求：
- 回应要像朋友聊天，不要刻板
- 文字优美，有感染力
- 直接输出内容，不要"以下是..."之类的铺垫

直接输出你的回应内容。`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: '你是一个温暖、友善的AI文案助手，擅长理解用户需求并创作优美文案。' },
                    { role: 'user', content: understandPrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.85,
                    num_predict: 512
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Understand API error:', response.status, errorData);
            return errorResponse(res, 500, 'AI理解失败，请稍后重试');
        }

        const data = await response.json();
        const responseText = data.message?.content?.trim() || '';

        if (!responseText) {
            return errorResponse(res, 500, 'AI理解返回异常');
        }

        // 检查是否包含文案生成（以句号、感叹号结尾且较长，或者包含明确的文案内容）
        const hasCopy = /[。！？]$/.test(responseText) && responseText.length > 20;

        // 只有当生成了真正的文案时才保存到历史记录
        // 闲聊、问候、询问等不算作文案，不记录
        if (hasCopy) {
            const id = generateId();
            pool.execute(
                'INSERT INTO ai_generations (id, user_id, prompt, result, category, style) VALUES (?, ?, ?, ?, ?, ?)',
                [id, userId, prompt, responseText, category || 'all', style || 'literary']
            ).catch(err => console.error('[AI] 保存对话历史失败:', err));
        }

        successResponse(res, {
            response: responseText,
            copy: hasCopy ? responseText : null,
            understood: true
        });
    } catch (error) {
        console.error('[AI] 理解用户意图失败:', error);
        errorResponse(res, 500, '理解用户意图失败，请稍后重试');
    }
});

// AI 图片理解并生成文案（支持上传图片）
app.post('/api/ai/understand-with-image', upload.single('image'), async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    // 检查VIP和AI使用限制
    const vipStatus = await checkVipAndAiLimit(userId);
    if (!vipStatus.canUse) {
        if (vipStatus.isVip) {
            return errorResponse(res, 403, '今日AI使用次数已用完，请明天再来');
        } else {
            return errorResponse(res, 403, '今日AI使用次数已用完（免费用户每日3次），开通VIP解锁更多次数');
        }
    }

    const { prompt, category, style } = req.body;
    const imageFile = req.file;

    if (!prompt && !imageFile) {
        return errorResponse(res, 400, '请提供图片或输入需求描述');
    }

    // 记录使用
    await recordAiUsage(userId);

    const categoryNames = {
        'love': '爱情',
        'life': '人生',
        'inspirational': '励志',
        'emotion': '情感',
        'all': '情感'
    };

    const styleNames = {
        'literary': '文艺清新',
        'humor': '幽默风趣',
        'romantic': '深情款款',
        'inspirational': '励志向上',
        'simple': '简约大气'
    };

    const catName = categoryNames[category] || '情感';
    const styleName = styleNames[style] || '文艺清新';

    let imageDescription = '';
    if (imageFile) {
        // 调用视觉模型获取图片描述
        try {
            const base64Image = imageFile.buffer.toString('base64');
            const visionResponse = await fetch(`${OLLAMA_API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2-vision:11b', // 视觉模型
                    messages: [
                        {
                            role: 'user',
                            content: '请描述这张图片的内容，包括：画面主体、氛围、风格、颜色、场景等细节。用50字以内描述。',
                            images: [base64Image]
                        }
                    ],
                    stream: false
                })
            });

            if (visionResponse.ok) {
                const visionData = await visionResponse.json();
                imageDescription = visionData.message?.content?.trim() || '';
            }
        } catch (error) {
            console.error('[AI] 图片理解失败:', error);
            imageDescription = '';
        }
    }

    const imageContext = imageDescription ? `用户上传了一张图片，内容是：${imageDescription}\n` : '';

    const imagePrompt = `${imageContext}用户说："${prompt || '帮我根据这张图片写一段文案'}"

请分析图片内容和用户需求，创作一段与图片氛围相符的文案。

要求：
- 文案要贴合图片的意境和氛围
- 风格：${styleName}
- 场景：${catName}
- 文字优美，有感染力
- 15-30字以内
- 直接输出文案，不要铺垫

直接输出你的文案内容。`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的AI文案创作助手，擅长根据图片内容和用户需求创作优美文案。' },
                    { role: 'user', content: imagePrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.85,
                    num_predict: 256
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Image understand API error:', response.status, errorData);
            return errorResponse(res, 500, 'AI生成失败，请稍后重试');
        }

        const data = await response.json();
        const responseText = data.message?.content?.trim() || '';

        if (!responseText) {
            return errorResponse(res, 500, 'AI生成返回异常');
        }

        // 保存到历史记录
        const id = generateId();
        pool.execute(
            'INSERT INTO ai_generations (id, user_id, prompt, result, category, style) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, `${imageContext}${prompt}`, responseText, category || 'all', style || 'literary']
        ).catch(err => console.error('[AI] 保存对话历史失败:', err));

        successResponse(res, {
            response: responseText,
            copy: responseText,
            imageDescription: imageDescription,
            understood: true
        });
    } catch (error) {
        console.error('[AI] 图片理解生成失败:', error);
        errorResponse(res, 500, '图片理解生成失败，请稍后重试');
    }
});

// AI 根据上下文生成文案
app.post('/api/ai/generate-copy', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    // 检查VIP和AI使用限制
    const vipStatus = await checkVipAndAiLimit(userId);
    if (!vipStatus.canUse) {
        if (vipStatus.isVip) {
            return errorResponse(res, 403, '今日AI使用次数已用完，请明天再来');
        } else {
            return errorResponse(res, 403, '今日AI使用次数已用完（免费用户每日3次），开通VIP解锁更多次数');
        }
    }

    const { prompt, scene, style } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return errorResponse(res, 400, '请提供文案主题或需求');
    }

    // 记录使用
    await recordAiUsage(userId);

    // 场景标签映射
    const sceneNames = {
        'all': '不限场景',
        'moments': '朋友圈配图',
        'xiaohongshu': '小红书种草',
        'video': '短视频口播',
        'job': '求职社交',
        'birthday': '生日祝福'
    };

    // 风格标签映射
    const styleNames = {
        'all': '不限风格',
        'cold': '高级清冷',
        'literary': '简约文艺',
        'gentle': '温柔治愈',
        'cool': '酷拽短句',
        'ancient': '国风古风'
    };

    const sceneName = sceneNames[scene] || '朋友圈配图';
    const styleName = styleNames[style] || '高级清冷';

    const generatePrompt = `根据用户的需求创作一段高质量文案。

用户需求："${prompt}"

创作要求：
- 使用场景：${sceneName}
- 风格调性：${styleName}
- 文字优美、有感染力，能引起读者共鸣
- 长度：50-100字
- 不要使用emoji
- 不要有"文案："、"以下是"等前缀
- 直接输出文案正文

请开始创作：`;

    try {
        const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: '你是一个专业的文案创作者，擅长创作优美、感人、有深度的中文短文案。你的文字应该温暖、有力量，能够触动人心。' },
                    { role: 'user', content: generatePrompt }
                ],
                stream: false,
                options: {
                    temperature: 0.85,
                    num_predict: 512
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[AI] Generate copy error:', response.status, errorData);
            return errorResponse(res, 500, 'AI生成失败，请稍后重试');
        }

        const data = await response.json();
        const generatedText = data.message?.content?.trim() || '';

        if (!generatedText) {
            return errorResponse(res, 500, 'AI生成返回异常');
        }

        const id = generateId();
        successResponse(res, { copy: generatedText, id });

        // 异步保存生成记录
        pool.execute(
            'INSERT INTO ai_generations (id, user_id, prompt, result, category, style) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, prompt, generatedText, category, style]
        ).catch(err => console.error('[AI] 保存生成记录失败:', err));
    } catch (error) {
        console.error('[AI] 生成文案失败:', error);
        errorResponse(res, 500, '生成文案失败，请稍后重试');
    }
});

// 删除自定义分类
app.delete('/api/categories/:id', async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return errorResponse(res, 401, '未提供认证令牌');
    }

    try {
        const [cats] = await pool.execute('SELECT * FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (cats.length === 0) {
            return errorResponse(res, 404, '分类不存在或无权删除');
        }

        await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
        successResponse(res, null, '分类已删除');
    } catch (error) {
        console.error('[Category] 删除分类失败:', error);
        errorResponse(res, 500, '删除分类失败');
    }
});

// ============================================
// 错误处理
// ============================================

app.use((req, res) => {
    errorResponse(res, 404, '接口不存在');
});

app.use((err, req, res, next) => {
    console.error('[Server] 全局错误:', err);
    if (err.message === '不允许的跨域请求') {
        return errorResponse(res, 403, '跨域请求被拒绝');
    }
    errorResponse(res, 500, '服务器内部错误');
});

// ============================================
// 启动服务器
// ============================================

async function startServer() {
    const dbConnected = await initDatabase();
    if (!dbConnected) {
        console.error('[Error] 数据库连接失败，服务无法启动');
        process.exit(1);
    }

    await importWenans();

    app.listen(PORT, () => {
        console.log('========================================');
        console.log('  文案集服务已启动');
        console.log('========================================');
        console.log(`  端口: ${PORT}`);
        console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`  数据库: MySQL (${DB_CONFIG.host})`);
        console.log(`  数据库名: ${DB_CONFIG.database}`);
        console.log('========================================');
    });
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

startServer();

module.exports = app;