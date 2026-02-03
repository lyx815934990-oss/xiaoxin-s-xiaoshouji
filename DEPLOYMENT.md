# 小手机应用部署指南

## 方案一：Vercel 部署（推荐，免费且简单）

### 优点

- ✅ 完全免费
- ✅ 电脑关闭后手机仍可访问
- ✅ 代码推送到 GitHub 后自动部署
- ✅ 支持自定义域名
- ✅ 全球 CDN 加速

### 步骤

1. **将代码推送到 GitHub**

   ```bash
   # 在项目目录下执行
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/小手机.git
   git push -u origin main
   ```

2. **在 Vercel 部署**
   - 访问 <https://vercel.com>
   - 使用 GitHub 账号登录
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 框架预设选择 "Vite"
   - 点击 "Deploy"
   - 等待部署完成（约 1-2 分钟）

3. **获取访问链接**
   - 部署完成后，Vercel 会提供一个链接，例如：`https://你的项目名.vercel.app`
   - 这个链接可以在任何设备上访问，包括 iOS 手机

4. **实时更新**
   - 每次你推送代码到 GitHub，Vercel 会自动重新部署
   - 通常 1-2 分钟内更新完成
   - 手机刷新页面即可看到最新版本

### 在 iOS 上使用

1. 在 Safari 中打开 Vercel 提供的链接
2. 点击分享按钮 → "添加到主屏幕"
3. 这样就会像原生 App 一样使用

---

## 方案二：Netlify 部署（同样免费）

### 步骤

1. 访问 <https://www.netlify.com>
2. 使用 GitHub 账号登录
3. 点击 "Add new site" → "Import an existing project"
4. 选择你的 GitHub 仓库
5. 构建命令：`npm run build`
6. 发布目录：`dist`
7. 点击 "Deploy site"
8. 获得链接：`https://你的项目名.netlify.app`

---

## 方案三：开发时使用内网穿透（电脑需要开着）

### 使用 ngrok（推荐）

1. **安装 ngrok**
   - 访问 <https://ngrok.com> 注册账号（免费）
   - 下载 ngrok 并解压到项目目录

2. **启动开发服务器**

   ```bash
   npm run dev
   ```

3. **启动 ngrok**

   ```bash
   # Windows PowerShell
   .\ngrok.exe http 5173
   
   # 会显示一个公网链接，例如：https://xxxx.ngrok.io
   ```

4. **在手机上访问**
   - 在 iOS Safari 中打开 ngrok 提供的链接
   - 即可访问开发服务器
   - 代码修改后，手机刷新即可看到更新（Vite HMR 支持）

### 使用 localtunnel（更简单，无需注册）

1. **安装 localtunnel**

   ```bash
   npm install -g localtunnel
   ```

2. **启动开发服务器和 localtunnel**

   ```bash
   # 终端1：启动开发服务器
   npm run dev
   
   # 终端2：启动 localtunnel
   lt --port 5173
   ```

3. **在手机上访问 localtunnel 提供的链接**

---

## 方案四：部署到云服务器（长期运行）

### 使用阿里云/腾讯云等

1. **购买云服务器**（最低配置即可，约 50-100 元/年）
2. **安装 Node.js 和 Nginx**
3. **部署应用**

   ```bash
   # 在服务器上
   git clone 你的仓库地址
   cd 小手机
   npm install
   npm run build
   
   # 配置 Nginx 指向 dist 目录
   ```

---

## 推荐方案对比

| 方案 | 电脑关闭后可用 | 实时更新 | 成本 | 难度 |
|------|---------------|---------|------|------|
| Vercel | ✅ | ✅ 自动 | 免费 | ⭐ 简单 |
| Netlify | ✅ | ✅ 自动 | 免费 | ⭐ 简单 |
| ngrok | ❌ | ✅ 实时 | 免费 | ⭐⭐ 中等 |
| 云服务器 | ✅ | 需手动 | 付费 | ⭐⭐⭐ 较难 |

## 最佳实践建议

**开发阶段**：使用 ngrok 或 localtunnel，代码修改后立即在手机上测试

**正式使用**：使用 Vercel 或 Netlify 部署，电脑关闭后手机仍可正常使用

---

## iOS 添加到主屏幕步骤

1. 在 Safari 中打开应用链接
2. 点击底部分享按钮（方框+箭头图标）
3. 选择"添加到主屏幕"
4. 自定义名称（例如"小手机"）
5. 点击"添加"
6. 主屏幕上会出现应用图标，点击即可像原生 App 一样使用

---

## 注意事项

1. **API 配置**：如果使用 OpenAI API，确保 API Key 安全，不要提交到公开仓库
2. **环境变量**：敏感信息使用环境变量，Vercel/Netlify 都支持
3. **HTTPS**：所有部署方案都自动提供 HTTPS，iOS 可以正常使用
4. **缓存**：如果更新后看不到变化，尝试强制刷新（iOS Safari：长按刷新按钮 → "请求桌面网站"）
