# 秋辞文案馆

一个 AI 驱动的文案创作平台，支持多种场景和风格的文案生成。

## 功能特点

- **AI 文案生成**：基于 Ollama 大语言模型，生成高质量文案
- **多场景支持**：朋友圈、小红书、短视频、求职社交等
- **多风格选择**：高级清冷、简约文艺、温柔治愈、酷拽短句、国风古风
- **图片理解**：上传图片，AI 分析图片内容并生成匹配文案
- **用户系统**：注册登录、收藏、点赞、分享
- **会员体系**：基础VIP、高级VIP 多档位选择

## 技术栈

### 前端
- Vue 3 + Composition API
- Pinia 状态管理
- Element Plus UI
- Vue Router

### 后端
- Node.js + Express
- MySQL 数据库
- JWT 认证
- Ollama AI

## 项目结构

```
├── client/          # 前端项目
├── server/          # 后端项目
│   └── backend/    # Express 服务
├── ai-server/      # AI 服务配置
└── logo.png        # 项目 Logo
```

## 快速启动

### 前置要求

- Node.js 18+
- MySQL 8.0+
- Ollama (已配置 qwen2.5:7b 模型)

### 后端启动

```bash
cd server/backend
npm install
node server.js
```

### 前端启动

```bash
cd client
npm install
npm run dev
```

### AI 服务

确保 Ollama 服务运行在 localhost:11434

## 环境变量

后端 `.env` 配置：

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wenan_001
PORT=8081
JWT_SECRET=your_secret
```

## 接口文档

详见 [API 文档](./API.md)

## 许可证

MIT License

## 联系方式

- 邮箱：qiuci061028@outlook.com
