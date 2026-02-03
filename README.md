# 软糯乙女小手机 📱

一个可以在手机上全屏使用的 AI 对话小手机应用，采用乙女游戏风格的软糯设计。

## 功能特性

- 💬 **微信聊天**：与 AI 角色进行对话，支持多联系人、世界书配置
- 📱 **手机桌面**：仿 iOS 风格的桌面，支持应用图标自定义排序
- 🎨 **乙女风格**：软糯糯的 UI 设计，圆角、渐变、柔和配色
- ⚙️ **个性化设置**：自定义壁纸、AI 配置、世界书管理
- 📝 **多应用**：微信、微博、外卖、小红书、购物等（持续开发中）

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 在浏览器中打开 http://localhost:5173
# 在手机上访问：http://你的电脑IP:5173（确保手机和电脑在同一 Wi-Fi）
```

### 部署到线上（推荐）

#### 方案一：Vercel 部署（最简单）

1. 将代码推送到 GitHub
2. 访问 [Vercel](https://vercel.com) 并登录
3. 导入你的 GitHub 仓库
4. 点击 Deploy，等待完成
5. 获得链接，在 iOS Safari 中打开并"添加到主屏幕"

详细步骤请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

#### 方案二：Netlify 部署

1. 访问 [Netlify](https://www.netlify.com) 并登录
2. 导入 GitHub 仓库
3. 构建命令：`npm run build`
4. 发布目录：`dist`
5. 点击 Deploy

## iOS 使用说明

1. 在 Safari 中打开应用链接
2. 点击底部分享按钮 → "添加到主屏幕"
3. 自定义名称（例如"小手机"）
4. 点击"添加"
5. 主屏幕上会出现应用图标，点击即可使用

## 开发时在手机上测试

### 使用 ngrok（推荐）

```bash
# 1. 启动开发服务器
npm run dev

# 2. 在另一个终端启动 ngrok
ngrok http 5173

# 3. 在手机 Safari 中打开 ngrok 提供的链接
```

### 使用 localtunnel

```bash
# 安装
npm install -g localtunnel

# 启动
lt --port 5173
```

## 技术栈

- React 18
- TypeScript
- Vite
- CSS3 (自定义样式)

## 项目结构

```
src/
├── screens/          # 各个应用页面
│   ├── home/        # 手机桌面
│   ├── wechat/      # 微信应用
│   ├── settings/    # 设置应用
│   └── ...
├── components/       # 通用组件
├── context/         # 全局状态管理
├── services/        # API 服务
└── styles/          # 全局样式
```

## 部署文档

详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 许可证

MIT

