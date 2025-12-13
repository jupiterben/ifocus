# OAuth Deep-Link 测试指南

## ✅ 编译成功确认

依赖已正确安装：
- ✅ `tauri-plugin-single-instance = "2.3.6"`
- ✅ `tauri-plugin-deep-link = "2.4.5"`
- ✅ 编译通过，无错误

## 🧪 测试步骤

### 1. 启动开发服务器

```bash
pnpm tauri:dev
```

**观察后端日志**（终端）：
```
Deep link 插件已初始化，协议: ifocus://
已注册所有配置的 deep-link schemes
```

### 2. 测试单实例功能

**在应用仍在运行时**，打开另一个终端：

```bash
# 尝试再次启动应用
pnpm tauri:dev
```

**预期结果**：
- ❌ 不会打开新窗口
- ✅ 第一个实例的窗口被激活
- ✅ 终端显示：
  ```
  检测到新实例启动，参数: ["...\\ifocus.exe"]
  ```

### 3. 测试 Deep-Link 参数传递

**在应用仍在运行时**，在另一个终端执行：

#### Windows (PowerShell/CMD)
```powershell
start ifocus://auth/callback?code=test123456789
```

#### Linux
```bash
xdg-open ifocus://auth/callback?code=test123456789
```

**预期日志**：

**后端（终端）**：
```
检测到新实例启动，参数: ["...\\ifocus.exe", "ifocus://auth/callback?code=test123456789"]
收到 deep link 事件
```

**前端（DevTools Console - F12）**：
```
接收到 deep link: ifocus://auth/callback?code=test123456789
🔗 processOAuthCallback 被调用
📥 接收到的 URL: ifocus://auth/callback?code=test123456789
✅ URL 匹配 OAuth 回调格式
🔑 提取的 code: test1234...
✅ OAuth code 获取成功，开始认证流程...
📡 handleOAuthCallback 开始处理，code: test1234...
```

### 4. 测试完整 OAuth 流程

#### 前提条件
确保 `.env` 文件包含：
```env
GITHUB_CLIENT_SECRET=你的_client_secret
```

#### 测试步骤

1. **打开设置页面**
   - 点击右上角 ⚙️ 设置按钮

2. **启动 OAuth 登录**
   - 找到 "🔐 GitHub 数据同步" 部分
   - 点击 "🔑 使用 GitHub 登录"

3. **浏览器授权**
   - 浏览器会自动打开 GitHub 授权页面
   - URL 应该是：`https://github.com/login/oauth/authorize?client_id=Ov23liZpDAtVMTavdA3s&...`
   - 点击 "Authorize" 按钮

4. **观察日志**

**浏览器重定向**：
```
ifocus://auth/callback?code=0565aac4b6c929df62b4
```

**后端日志**：
```
检测到新实例启动，参数: ["...\\ifocus.exe", "ifocus://auth/callback?code=0565aac4b6c929df62b4"]
收到 deep link 事件
开始处理 GitHub OAuth，code: 0565aac4...
🔄 开始交换 access token，code: 0565aac4...
📤 正在向 GitHub 发送 token 交换请求...
📥 收到 GitHub 响应，正在解析...
✅ Access token 交换成功
🔄 开始获取用户信息...
✅ 用户信息获取成功: your_username
GitHub OAuth 成功，用户: your_username
```

**前端日志**：
```
接收到 deep link: ifocus://auth/callback?code=0565aac4b6c929df62b4
🔗 processOAuthCallback 被调用
📥 接收到的 URL: ifocus://auth/callback?code=0565aac4b6c929df62b4
✅ URL 匹配 OAuth 回调格式
🔑 提取的 code: 0565aac4...
✅ OAuth code 获取成功，开始认证流程...
📡 handleOAuthCallback 开始处理，code: 0565aac4...
🔄 正在调用 Tauri 后端 handle_github_oauth 命令...
✅ OAuth 认证成功，用户: your_username
💾 Token 和用户信息已存储
🎉 GitHub 登录成功: your_username
```

5. **验证登录状态**
   - 设置页面应该显示："已登录: your_username"
   - 系统通知："登录成功 - 欢迎, your_username!"

6. **测试数据同步**
   - 点击 "📤 上传到云端" - 应该成功
   - 访问 https://gist.github.com/ 确认创建了 `ifocus-data.json`
   - 点击 "📥 从云端下载" - 应该成功

## 🐛 故障排查

### 问题：浏览器显示 "无法打开 ifocus://"

**原因**：Deep-link 协议未注册

**解决方案**：
1. 检查后端日志是否有：`已注册所有配置的 deep-link schemes`
2. 手动注册（Windows）：
   ```bash
   start ifocus://test
   ```
   应该会弹出选择应用的对话框

### 问题：应用没有收到 deep-link 事件

**检查清单**：
- ✅ 应用正在运行
- ✅ 后端日志显示 "检测到新实例启动"
- ✅ 参数包含完整的 URL
- ✅ `tauri.conf.json` 配置了 `ifocus` scheme

**解决方案**：
1. 查看后端日志，确认参数传递
2. 检查前端 DevTools Console
3. 重启开发服务器

### 问题：OAuth 认证失败

**常见错误**：

1. **"缺少 access_token 字段"**
   - **最常见**：Authorization code 已被使用（一次性）
   - 解决：重新进行 OAuth 授权
   - 详见：[GitHub_OAuth_常见错误.md](GitHub_OAuth_常见错误.md)

2. **"未找到 GITHUB_CLIENT_SECRET"**
   - 检查 `.env` 文件是否存在
   - 重启开发服务器以加载环境变量

3. **"incorrect_client_credentials"**
   - Client ID 或 Secret 不正确
   - 检查 `.env` 文件并确认与 GitHub OAuth App 一致
   - **重要**：修改后必须重启服务器

4. **"bad_verification_code"**
   - Code 已使用或过期
   - 重新点击 "使用 GitHub 登录"

**调试技巧**：
- 现在后端会打印完整的响应内容
- 查看日志中的 `📄 响应内容` 行
- 根据 `error` 字段确定具体问题

## 📊 测试检查清单

### 基础功能
- [ ] 应用启动正常
- [ ] Deep-link 协议已注册
- [ ] 单实例检测工作正常

### Deep-Link 功能
- [ ] 手动触发 deep-link，应用收到事件
- [ ] 参数正确传递到前端
- [ ] URL 解析正常

### OAuth 流程
- [ ] 点击登录按钮打开浏览器
- [ ] GitHub 授权页面正常显示
- [ ] 授权后正确重定向
- [ ] Deep-link 回调被处理
- [ ] Token 交换成功
- [ ] 用户信息获取成功
- [ ] 登录状态显示正确

### 数据同步
- [ ] 上传数据成功
- [ ] Gist 正确创建
- [ ] 下载数据成功
- [ ] 数据恢复正常

## 🎯 成功标准

所有以下日志都应该出现：

**后端**：
```
✅ Deep link 插件已初始化
✅ 已注册所有配置的 deep-link schemes
✅ 检测到新实例启动，参数包含 deep-link URL
✅ 收到 deep link 事件
✅ Access token 交换成功
✅ 用户信息获取成功
```

**前端**：
```
✅ 接收到 deep link
✅ URL 匹配 OAuth 回调格式
✅ OAuth code 获取成功
✅ OAuth 认证成功
✅ Token 和用户信息已存储
✅ GitHub 登录成功
```

**UI**：
```
✅ 设置页面显示 "已登录: username"
✅ 系统通知显示 "登录成功"
✅ 数据同步按钮可用
```

如果所有这些都正常，那么 OAuth deep-link 集成就完美工作了！🎉

