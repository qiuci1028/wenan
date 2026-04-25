# 文案集 AI 后端服务 - 安全说明

## 安全配置清单

### 1. 环境变量配置（必须）

在项目根目录创建 `.env` 文件：

```env
# 百度文心API配置
BAIDU_API_KEY=your_api_key_here
BAIDU_SECRET_KEY=your_secret_key_here
BAIDU_API_ENDPOINT=https://aip.baidubce.com

# 服务器配置
PORT=8080
NODE_ENV=production

# CORS白名单（替换为实际域名）
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# JWT密钥（用于接口认证）
JWT_SECRET=your_jwt_secret_min_32_chars_here

# 请求限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 2. 安全措施清单

| 安全措施 | 实现状态 | 说明 |
|---------|:-------:|:-----|
| API密钥不在前端暴露 | ✅ | 存储在后端.env中 |
| 前端不直接请求第三方API | ✅ | 通过后端代理 |
| CORS跨域限制 | ✅ | 只允许白名单域名 |
| HTTPS强制 | ⚠️ | 需在nginx/apache配置SSL |
| 请求限流 | ✅ | 使用express-rate-limit |
| 身份认证 | ✅ | JWT Token验证 |
| 无eval使用 | ✅ | 代码中无eval |
| 安全请求头 | ✅ | 使用helmet |
| 参数校验 | ✅ | 输入验证与过滤 |

### 3. 启动前检查

```bash
# 1. 确保.env文件存在且配置正确
# 2. 安装依赖
npm install

# 3. 启动服务
npm start

# 4. 或开发模式
npm run dev
```

### 5. 生产环境部署

```bash
# 使用PM2启动
pm2 start server.js --name wenan-ai

# 配置Nginx反向代理（强制HTTPS）
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. API调用示例

```javascript
// 前端调用方式
const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + userToken
    },
    body: JSON.stringify({
        prompt: '关于春天的温柔文案',
        category: 'love'
    })
});
```

### 7. 错误码说明

| 错误码 | 说明 |
|:------:|:-----|
| 400 | 请求参数错误 |
| 401 | 未授权或Token过期 |
| 403 | 禁止访问（CORS/权限） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | AI服务不可用 |

### 8. 安全监控建议

- [ ] 启用日志记录与监控
- [ ] 配置入侵检测系统
- [ ] 定期备份日志
- [ ] 更新安全补丁
- [ ] 监控异常请求模式
