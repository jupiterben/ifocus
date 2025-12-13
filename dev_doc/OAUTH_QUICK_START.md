# GitHub OAuth 快速配置指南

## 🚀 5 分钟完成配置

### 第 1 步：创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 **"New OAuth App"**
3. 填写信息：
   ```
   Application name: iFocus
   Homepage URL: https://github.com/你的用户名/ifocus
   Authorization callback URL: ifocus://auth/callback
   ```
4. 点击 **"Register application"**
5. 进入应用页面后，点击 **"Generate a new client secret"**
6. **复制 Client Secret**（只显示一次！）

### 第 2 步：配置环境变量

编辑项目根目录的 `.env` 文件，填入 Client Secret：

```bash
GITHUB_CLIENT_SECRET=你刚才复制的_secret
```

💡 **提示**：`.env` 文件已存在，只需要替换 `YOUR_GITHUB_CLIENT_SECRET_HERE`

### 第 3 步：启动应用

```bash
# 开发模式
pnpm tauri:dev

# 或构建生产版本
pnpm tauri:build
```

### 第 4 步：测试登录

1. 打开应用
2. 点击右上角 **⚙️ 设置**
3. 在 "GitHub 数据同步" 部分点击 **"🔑 使用 GitHub 登录"**
4. 浏览器会打开 GitHub 授权页面
5. 点击 **"Authorize"** 授权
6. 浏览器会重定向（可能显示"找不到应用"，这是正常的）
7. **应用会自动检测到回调并完成登录** ✅
8. 查看设置页面，应该显示 "已登录: 你的用户名"

## ✅ 登录成功后

登录成功后，你可以：

- **📤 上传到云端**：保存数据到 GitHub Gist
- **📥 从云端下载**：恢复数据到本地
- 数据在所有登录设备间自动同步

## 🔍 排查问题

### 问题 1：浏览器提示"无法打开应用"

**原因**：首次使用需要注册协议

**解决**：
- Windows：重新构建应用 `pnpm tauri:build`，运行安装包
- macOS：首次运行开发版时会自动注册
- 或者手动注册：应用会在首次启动时尝试注册

### 问题 2：回调后应用没有反应

**检查步骤**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 检查 `.env` 文件中的 Secret 是否正确
4. 确认 GitHub OAuth App 的 callback URL 是 `ifocus://auth/callback`

**测试后端**：
```bash
# 在项目目录
cd src-tauri
cargo build
```

查看是否有编译错误。

### 问题 3：Token 交换失败

**可能原因**：
- Client Secret 配置错误
- 网络连接问题
- OAuth App 配置问题

**解决方法**：
1. 检查 `.env` 文件
2. 确认网络可以访问 GitHub
3. 重新生成 Client Secret 并更新 `.env`

### 问题 4：仍然显示 Token 输入框

**说明**：这是备用方案，如果 OAuth 流程遇到问题，你仍然可以使用 Personal Access Token 登录：

1. 访问 https://github.com/settings/tokens/new
2. 勾选 `gist` 权限
3. 生成 Token 并复制
4. 在应用中粘贴 Token

## 📝 开发提示

### 查看日志

**前端日志**（Tauri DevTools Console）：
```javascript
// 应该看到类似输出
接收到 deep link: ifocus://auth/callback?code=xxx
OAuth code 获取成功，开始认证...
GitHub 登录成功: 你的用户名
```

**后端日志**（终端）：
```
[Tauri] Running on http://localhost:15173
```

### 环境变量验证

在 Rust 代码中打印验证（仅测试用）：
```rust
// src-tauri/src/main.rs
fn main() {
    dotenv::dotenv().ok();
    
    if let Ok(secret) = std::env::var("GITHUB_CLIENT_SECRET") {
        println!("✅ Client Secret 已加载: {}...", &secret[..8]);
    } else {
        println!("❌ 未找到 GITHUB_CLIENT_SECRET");
    }
    
    // ...
}
```

## 🔐 安全提醒

- ✅ `.env` 已加入 `.gitignore`，不会提交到 Git
- ✅ Client Secret 只在本地使用，不会发送到前端
- ✅ Token 存储在本地浏览器 localStorage
- ⚠️ 不要分享你的 `.env` 文件
- ⚠️ 不要在公开场合展示 Client Secret

## 🎉 完成！

配置完成后，你就可以在多个设备间同步 iFocus 数据了！

有问题？查看详细文档：
- [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md) - 完整技术实现
- [GITHUB_SYNC.md](GITHUB_SYNC.md) - 用户使用指南

