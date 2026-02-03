# 📱 使用 Cloudflare Pages 部署（无需 VPN，国内访问稳定）

## 🎯 为什么选择 Cloudflare Pages？

- ✅ **国内访问稳定**：不需要 VPN 就能访问
- ✅ **完全免费**：和 Vercel 一样免费
- ✅ **全球 CDN**：访问速度快
- ✅ **自动部署**：GitHub 代码更新后自动部署
- ✅ **配置简单**：和 Vercel 类似

---

## 📋 第一步：准备 GitHub 仓库

确保你的代码已经在 GitHub 上：

1. 如果还没有，按照之前的教程将代码推送到 GitHub
2. 仓库地址应该是：`https://github.com/你的用户名/仓库名`

---

## 📋 第二步：注册 Cloudflare Pages

1. 访问 <https://pages.cloudflare.com>
2. 点击右上角 **Sign Up**（或 **Log in** 如果已有账号）
3. 选择 **Continue with GitHub**（使用 GitHub 账号登录，最简单）
4. 授权 Cloudflare 访问你的 GitHub

---

## 📋 第三步：创建 Pages 项目

1. 登录后，点击 **Create a project**
2. 选择 **Connect to Git**
3. 选择你的 GitHub 账号
4. 在仓库列表中找到你的仓库（如 `xiaoxin-s-shouji`）
5. 点击 **Begin setup**

---

## 📋 第四步：配置构建设置

在配置页面填写：

1. **Project name**: 项目名称（可以保持默认或修改）
2. **Production branch**: `main`（默认）
3. **Framework preset**: 选择 **Vite**（会自动识别）
4. **Build command**: `npm run build`（默认）
5. **Build output directory**: `dist`（默认）

**重要：添加环境变量（如果需要）**

如果有环境变量，可以在这里添加。对于这个项目，通常不需要。

1. 点击 **Save and Deploy**

**⚠️ 如果部署失败，按以下步骤排查：**

1. **检查构建配置**：
   - `Build command`: 必须是 `npm run build`
   - `Build output directory`: 必须是 `dist`
   - `Root directory`: 保持默认 `./`

2. **检查 Node.js 版本**：
   - 在 Cloudflare Pages 设置中，找到 **Environment variables**
   - 添加环境变量：`NODE_VERSION` = `18` 或 `20`

3. **查看构建日志**：
   - 点击失败的部署记录
   - 点击 **View build** 或 **查看构建日志**
   - 找到红色错误信息，告诉我具体错误

4. **常见错误及解决方案**：
   - 如果提示找不到模块：检查 `package.json` 中的依赖是否正确
   - 如果提示构建命令失败：确保 `npm run build` 在本地能正常运行
   - 如果提示找不到 dist 目录：确保构建命令正确执行

---

## 📋 第五步：等待部署完成

- 通常 2-3 分钟即可完成
- 部署成功后，会显示一个网址，例如：`https://项目名.pages.dev`

---

## 📋 第六步：配置路由（重要！）

为了让单页应用（SPA）正常工作，需要配置路由重写：

1. 在 Cloudflare Pages 项目页面，点击 **Settings**
2. 点击左侧的 **Functions** → **Compatibility Flags**
3. 或者直接点击 **Custom domains** 旁边的 **Functions**
4. 在项目根目录创建或更新 `_redirects` 文件（见下方）

**或者更简单的方法：**

在项目根目录创建 `public/_redirects` 文件（如果 public 文件夹不存在，先创建）：

```
/*    /index.html   200
```

然后提交并推送：

```powershell
cd "F:\小手机"
# 如果 public 文件夹不存在，先创建
mkdir public
# 创建 _redirects 文件
echo "/*    /index.html   200" > public/_redirects
git add public/_redirects
git commit -m "添加 Cloudflare Pages 路由配置"
git push
```

---

## 📋 第七步：在 iOS 上访问

1. 在 iPhone 的 Safari 浏览器中打开你的网址（`https://项目名.pages.dev`）
2. 点击底部的 **分享按钮**（方框带向上箭头）
3. 向下滑动，找到 **添加到主屏幕**
4. 点击 **添加到主屏幕**
5. 可以修改名称（例如：小手机）
6. 点击 **添加**

---

## 📋 第八步：代码更新后自动同步

每次修改代码后：

```powershell
cd "F:\小手机"
git add .
git commit -m "更新功能"
git push
```

Cloudflare Pages 会自动检测到更新并重新部署，通常 2-3 分钟后手机上的应用就会更新。

---

## 🔧 常见问题

### Q1: 部署失败怎么办？（详细排查步骤）

**步骤 1：查看构建日志**

1. 在 Cloudflare Pages 项目页面，点击 **Deployments**
2. 点击失败的部署记录
3. 点击 **View build** 查看详细日志
4. 找到红色错误信息，记录具体错误

**步骤 2：检查本地构建**
在本地测试构建是否正常：

```powershell
cd "F:\小手机"
npm install
npm run build
```

如果本地构建失败，先修复本地问题。

**步骤 3：检查 Cloudflare Pages 配置**

1. 项目页面 → **Settings** → **Builds & deployments**
2. 确认：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `./`

**步骤 4：设置 Node.js 版本**

1. **Settings** → **Environment variables**
2. 添加变量：
   - **Variable name**: `NODE_VERSION`
   - **Value**: `18` 或 `20`
3. 保存后重新部署

**步骤 5：检查 package.json**

- 确保 `build` 脚本存在：`"build": "vite build"`
- 确保所有依赖都已列出

如果以上都不行，把构建日志中的具体错误信息发给我。

### Q2: 网站显示 404 错误？

- 确保已创建 `public/_redirects` 文件
- 文件内容应该是：`/*    /index.html   200`
- 提交并推送后，等待重新部署

### Q3: 如何更新代码？

- 修改代码 → `git add .` → `git commit -m "描述"` → `git push`
- Cloudflare Pages 会自动部署

### Q4: 可以自定义域名吗？

- 可以！在 Cloudflare Pages 项目设置中，点击 **Custom domains**
- 添加你的域名（需要配置 DNS）

---

## 🎉 完成

现在你的小手机应用已经：

- ✅ 可以在 iOS 上独立运行（无需电脑）
- ✅ 代码修改后自动更新
- ✅ 完全免费
- ✅ **国内访问稳定，不需要 VPN！**

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 Cloudflare Pages 的部署日志
2. 检查 GitHub 仓库是否正确推送
3. 确认所有步骤都已完成

祝你使用愉快！🎊
