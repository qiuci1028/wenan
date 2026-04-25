/**
 * 管理系统后端服务 - 独立端口 3001
 * 数据库：wenan_guanli_001
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'wenan-jwt-secret-change-in-production';

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'wenan_AdministratorSystem',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool = null;

async function initDatabase() {
    pool = mysql.createPool(DB_CONFIG);
    console.log('[AdminDB] 管理数据库连接成功');
    return true;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function successResponse(res, data, message = '操作成功') {
    res.json({ code: 200, message, data });
}

function errorResponse(res, status, message) {
    res.status(status).json({ code: status, message });
}

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function getAdminIdFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.adminId || null;
    } catch {
        return null;
    }
}

// 中间件
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'],
    credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
    const requestId = crypto.randomBytes(8).toString('hex');
    req.requestId = requestId;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// 管理员登录
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return errorResponse(res, 400, '请输入账号和密码');
        }

        const [rows] = await pool.execute(
            'SELECT * FROM admin_users WHERE username = ? AND password = ?',
            [username, password]
        );
        if (rows.length === 0) {
            return errorResponse(res, 401, '账号或密码错误');
        }

        const admin = rows[0];
        const token = generateToken({ adminId: admin.id, username: admin.username });
        successResponse(res, {
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                nickname: admin.nickname,
                avatar: admin.avatar
            }
        }, '登录成功');
    } catch (error) {
        console.error('[Admin Login] 失败:', error);
        errorResponse(res, 500, '登录失败');
    }
});

// 仪表盘统计
app.get('/api/admin/stats', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        // 连接主数据库获取统计
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const [users] = await mainPool.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = 0');
        const [wenans] = await mainPool.execute('SELECT COUNT(*) as count FROM wenans');
        const [admins] = await mainPool.execute('SELECT COUNT(*) as count FROM users WHERE is_admin = 1');
        const [customCats] = await mainPool.execute('SELECT COUNT(*) as count FROM categories');
        const [orders] = await mainPool.execute('SELECT COUNT(*) as count FROM orders');

        successResponse(res, {
            users: users[0].count || 0,
            wenans: wenans[0].count || 0,
            admins: admins[0].count || 0,
            categories: customCats[0].count || 0,
            orders: orders[0].count || 0
        });
        await mainPool.end();
    } catch (error) {
        console.error('[Stats] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 获取用户列表
app.get('/api/admin/users', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [rows] = await mainPool.query(
            'SELECT id, username, wenan_id, avatar, bio, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ total }]] = await mainPool.query('SELECT COUNT(*) as total FROM users');

        successResponse(res, { list: rows, total, page, pageSize });
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Users] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 删除用户
app.delete('/api/admin/users/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute('DELETE FROM likes WHERE user_id = ?', [req.params.id]);
        await mainPool.execute('DELETE FROM favorites WHERE user_id = ?', [req.params.id]);
        await mainPool.execute('DELETE FROM wenans WHERE user_id = ?', [req.params.id]);
        await mainPool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

        successResponse(res, null, '用户已删除');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Delete User] 失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

// 获取文案列表
app.get('/api/admin/wenans', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [rows] = await mainPool.query(
            'SELECT w.id, w.text, w.category, w.likes, w.favorites, w.created_at, u.username FROM wenans w LEFT JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ total }]] = await mainPool.query('SELECT COUNT(*) as total FROM wenans');

        successResponse(res, { list: rows, total, page, pageSize });
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Wenans] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 更新文案
app.put('/api/admin/wenans/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    const { text, category } = req.body;
    if (!text || !text.trim()) {
        return errorResponse(res, 400, '文案内容不能为空');
    }

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute(
            'UPDATE wenans SET text = ?, category = ? WHERE id = ?',
            [text.trim(), category || null, req.params.id]
        );

        successResponse(res, null, '文案已更新');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Update Wenan] 失败:', error);
        errorResponse(res, 500, '更新失败');
    }
});

// 删除文案
app.delete('/api/admin/wenans/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute('DELETE FROM likes WHERE wenan_id = ?', [req.params.id]);
        await mainPool.execute('DELETE FROM favorites WHERE wenan_id = ?', [req.params.id]);
        await mainPool.execute('DELETE FROM wenans WHERE id = ?', [req.params.id]);

        successResponse(res, null, '文案已删除');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Delete Wenan] 失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

// 获取分类列表
app.get('/api/admin/categories', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const [rows] = await mainPool.execute('SELECT id, name, icon, color, user_id, created_at FROM categories ORDER BY created_at DESC');
        successResponse(res, rows);
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Categories] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 删除分类
app.delete('/api/admin/categories/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
        successResponse(res, null, '分类已删除');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Delete Category] 失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

// 获取订单列表（会员购买记录）
app.get('/api/admin/orders', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [rows] = await mainPool.query(
            'SELECT o.id, o.user_id, o.plan_id, o.plan_name, o.amount, o.status, o.created_at, u.username FROM orders o LEFT JOIN users u ON CAST(o.user_id AS CHAR) = CAST(u.id AS CHAR) ORDER BY o.created_at DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ total }]] = await mainPool.query('SELECT COUNT(*) as total FROM orders');

        successResponse(res, { list: rows, total, page, pageSize });
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Orders] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 获取套餐列表
app.get('/api/admin/plans', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const [rows] = await mainPool.execute('SELECT id, name, price, period, features, popular, enabled, created_at FROM plans ORDER BY created_at DESC');
        successResponse(res, rows);
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Plans] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 创建套餐
app.post('/api/admin/plans', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const { name, price, period, features, popular } = req.body;
        if (!name || !price || !period) {
            return errorResponse(res, 400, '请填写完整的套餐信息');
        }

        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const id = generateId();
        const featuresJson = JSON.stringify(features || []);
        await mainPool.execute(
            'INSERT INTO plans (id, name, price, period, features, popular) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, price, period, featuresJson, popular ? 1 : 0]
        );

        successResponse(res, { id, name, price, period, features: featuresJson, popular: popular ? 1 : 0 }, '套餐创建成功');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Create Plan] 失败:', error);
        errorResponse(res, 500, '创建失败');
    }
});

// 更新套餐
app.put('/api/admin/plans/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const { name, price, period, features, popular, enabled } = req.body;
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const featuresJson = JSON.stringify(features || []);
        await mainPool.execute(
            'UPDATE plans SET name = ?, price = ?, period = ?, features = ?, popular = ?, enabled = ? WHERE id = ?',
            [name, price, period, featuresJson, popular ? 1 : 0, enabled ? 1 : 0, req.params.id]
        );

        successResponse(res, null, '套餐更新成功');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Update Plan] 失败:', error);
        errorResponse(res, 500, '更新失败');
    }
});

// 删除套餐
app.delete('/api/admin/plans/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute('DELETE FROM plans WHERE id = ?', [req.params.id]);
        successResponse(res, null, '套餐已删除');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Delete Plan] 失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

// 健康检查
app.get('/api/admin/health', (req, res) => {
    successResponse(res, { status: 'ok', database: pool ? 'connected' : 'disconnected' });
});

// 获取AI生成记录
app.get('/api/admin/ai-history', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [rows] = await mainPool.query(
            'SELECT g.id, g.user_id, g.prompt, g.result, g.category, g.style, g.created_at, u.username FROM ai_generations g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT ? OFFSET ?',
            [pageSize, offset]
        );
        const [[{ total }]] = await mainPool.query('SELECT COUNT(*) as total FROM ai_generations');

        successResponse(res, { list: rows, total, page, pageSize });
        await mainPool.end();
    } catch (error) {
        console.error('[Admin AI History] 获取失败:', error);
        errorResponse(res, 500, '获取失败');
    }
});

// 删除AI生成记录
app.delete('/api/admin/ai-history/:id', async (req, res) => {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) return errorResponse(res, 401, '未授权');

    try {
        const mainPool = mysql.createPool({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            database: 'wenan_001',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });

        await mainPool.execute('DELETE FROM ai_generations WHERE id = ?', [req.params.id]);
        successResponse(res, null, '记录已删除');
        await mainPool.end();
    } catch (error) {
        console.error('[Admin Delete AI History] 失败:', error);
        errorResponse(res, 500, '删除失败');
    }
});

app.listen(PORT, async () => {
    await initDatabase();
    console.log(`========================================`);
    console.log(`  管理系统已启动`);
    console.log(`  端口: ${PORT}`);
    console.log(`  数据库: wenan_guanli_001`);
    console.log(`========================================`);
});
