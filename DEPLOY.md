# 部署指南 - 让手机独立运行并支持自动更新

本指南提供三种部署方案，让您的「小手机」应用可以在电脑关闭的情况下，在 iOS 手机上独立运行，并且代码修改后自动同步更新。

---

## 🚀 方案一：Vercel 部署（推荐，最简单）

### 优点

- ✅ 完全免费
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ✅ 自动部署（代码推送后 1-2 分钟自动更新）
- ✅ 支持自定义域名

### 步骤

#### 1. 准备代码仓库

```bash
# 如果还没有 Git 仓库，先初始化
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 创建新仓库，然后推送
git remote add origin https://github.com/lyx815934990-oss/xiaoshouji
git branch -M main
git push -u origin main
```

#### 2. 部署到 Vercel

1. 访问 [Vercel](https://vercel.com)，使用 GitHub 账号登录
2. 点击 **"Add New Project"**
3. 选择你的 GitHub 仓库
4. 配置：
   - **Framework Preset**: 选择 `Vite`
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build`（自动检测）
   - **Output Directory**: `dist`（自动检测）
5. 点击 **"Deploy"**

#### 3. 获取访问链接

部署完成后，Vercel 会提供一个链接，例如：

```
https://小手机-xxx.vercel.app
```

#### 4. 在 iOS 手机上访问

- 打开 Safari 浏览器
- 输入 Vercel 提供的链接
- 点击分享按钮 → **"添加到主屏幕"**
- 之后就可以像原生 App 一样使用

#### 5. 自动更新机制

- 每次你 `git push` 代码到 GitHub
- Vercel 会自动检测并重新构建部署
- 1-2 分钟后，手机上的应用会自动更新（刷新页面即可看到新版本）

---

## 🌐 方案二：Netlify 部署

### 优点

- ✅ 完全免费
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 自动部署

### 步骤

#### 1. 准备代码仓库（同方案一）

#### 2. 部署到 Netlify

1. 访问 [Netlify](https://www.netlify.com)，使用 GitHub 账号登录
2. 点击 **"Add new site"** → **"Import an existing project"**
3. 选择你的 GitHub 仓库
4. 配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. 点击 **"Deploy site"**

#### 3. 获取访问链接

部署完成后，Netlify 会提供一个链接，例如：

```
https://小手机-xxx.netlify.app
```

#### 4. 在 iOS 手机上访问（同方案一）

---

## 📦 方案三：GitHub Pages 部署（完全免费，但需要手动触发）

### 优点

- ✅ 完全免费
- ✅ 使用 GitHub 仓库即可
- ✅ 支持自定义域名

### 缺点

- ⚠️ 需要手动配置 GitHub Actions

### 步骤

#### 1. 准备代码仓库（同方案一）

#### 2. 配置 GitHub Pages

1. 在 GitHub 仓库页面，点击 **Settings** → **Pages**
2. 在 **Source** 中选择 **"GitHub Actions"**
3. 代码中已包含 `.github/workflows/deploy.yml`，会自动使用

#### 3. 推送代码触发部署

```bash
git add .
git commit -m "Setup GitHub Pages"
git push
```

#### 4. 查看部署状态

- 在 GitHub 仓库页面，点击 **Actions** 标签
- 等待部署完成（约 2-3 分钟）
- 部署完成后，访问链接格式为：

```
https://你的用户名.github.io/小手机/
```

#### 5. 在 iOS 手机上访问（同方案一）

---

## 📱 iOS 手机使用技巧

### 添加到主屏幕

1. 在 Safari 中打开部署后的链接
2. 点击底部分享按钮（方框+箭头图标）
3. 选择 **"添加到主屏幕"**
4. 自定义名称（例如："小手机"）
5. 点击 **"添加"**

### 全屏使用

- 添加到主屏幕后，点击图标会以全屏模式打开
- 没有浏览器地址栏，体验更接近原生 App

### 更新应用

- **自动更新**：每次代码推送后，服务器会自动部署新版本
- **手动刷新**：在应用中下拉刷新，或关闭后重新打开
- **清除缓存**：如果遇到问题，可以在 Safari 设置中清除网站数据

---

## 🔄 开发工作流

### 日常开发流程

```bash
# 1. 本地开发
npm run dev

# 2. 修改代码后，提交到 GitHub
git add .
git commit -m "更新功能：xxx"
git push

# 3. 等待 1-2 分钟，Vercel/Netlify 自动部署
# 4. 在手机上刷新页面，即可看到更新
```

### 测试新功能

1. 本地 `npm run dev` 测试
2. 确认无误后 `git push`
3. 等待自动部署完成
4. 在手机上验证

---

## 🎯 推荐方案对比

| 方案 | 部署速度 | 自动更新 | 易用性 | 推荐度 |
|------|---------|---------|--------|--------|
| **Vercel** | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Netlify** | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **GitHub Pages** | ⭐⭐⭐ | ✅ | ⭐⭐⭐ | ⭐⭐⭐ |

**建议使用 Vercel**，因为它最简单、最快，而且对 Vite 项目支持最好。

---

## ❓ 常见问题

### Q: 部署后手机访问很慢？

A: 首次访问可能需要加载资源，后续会有 CDN 缓存加速。如果持续慢，可以尝试：

- 使用 Vercel（全球 CDN 节点更多）
- 配置自定义域名

### Q: 代码更新后手机上看不到？

A:

1. 确认 GitHub Actions/Vercel 部署已完成
2. 在手机上强制刷新（下拉刷新或关闭重开）
3. 清除浏览器缓存

### Q: 可以离线使用吗？

A: 目前是纯 Web 应用，需要网络连接。如果需要离线功能，可以考虑：

- 使用 Service Worker 实现 PWA
- 将应用打包成原生 App（需要额外开发）

### Q: 数据会丢失吗？

A: 应用使用 `localStorage` 存储数据，数据保存在手机浏览器中，不会丢失。但要注意：

- 清除浏览器数据会删除所有设置
- 建议定期备份重要配置

---

## 🎉 完成

部署完成后，你就可以：

- ✅ 在电脑关闭的情况下，用手机独立使用应用
- ✅ 代码修改后自动同步更新
- ✅ 像原生 App 一样添加到主屏幕
- ✅ 全屏使用，体验更好

如有问题，随时询问！
