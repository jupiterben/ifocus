# GitHub 数据同步使用指南

## 概述

iFocus 支持通过 GitHub 账号登录并将数据同步到云端，实现多设备间的数据共享。数据存储在 GitHub Gist 中，私有且安全。

## 使用步骤

### 1. GitHub OAuth 登录

1. 打开 iFocus 应用
2. 点击右上角 "⚙️ 设置" 按钮
3. 在 "🔐 GitHub 数据同步" 部分点击 "🔑 使用 GitHub 登录"
4. 浏览器会自动打开 GitHub 授权页面
5. 点击 "Authorize" 授权应用访问你的 Gist
6. 授权成功后会自动返回应用并完成登录

### 2. 同步数据

登录成功后，你可以：

- **📤 上传到云端**：将本地数据上传到 GitHub Gist
- **📥 从云端下载**：从 GitHub Gist 下载数据并覆盖本地数据

## 数据同步说明

### 同步的数据包括：

- 任务列表（包括完成状态、番茄数等）
- 自动整点模式设置
- 长休息时间段配置

### 数据存储位置

数据存储在 GitHub Gist 中，文件名为 `ifocus-data.json`，Gist 为私有，只有你可以访问。

### 注意事项

1. **数据覆盖**：下载数据会覆盖本地数据，请谨慎操作
2. **网络要求**：同步功能需要网络连接
3. **登录状态**：OAuth token 会安全地存储在本地，下次启动应用时无需重新登录
4. **数据隐私**：所有数据都存储在你的私有 Gist 中，只有你可以访问

## 开发者配置

如果你是开发者并想配置自己的 OAuth App，请查看详细指南：

👉 **[GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md)** - 完整 OAuth 配置文档

### OAuth 架构说明

已实现的功能：
- ✅ Tauri 后端安全处理 Client Secret
- ✅ Deep-link 协议监听 OAuth 回调
- ✅ 自动 token 交换和存储
- ✅ 完整的错误处理和日志记录

开发者需要：
1. 创建 GitHub OAuth App
2. 配置 `.env` 文件中的 `GITHUB_CLIENT_SECRET`
3. 确保 OAuth App 的回调 URL 设置为 `ifocus://auth/callback`

详细步骤请参考 [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md)。

## 故障排除

### 登录失败

1. **浏览器没有打开授权页面**
   - 检查是否允许应用打开外部链接
   - 尝试手动复制 URL 在浏览器中打开

2. **授权后没有返回应用**
   - Windows/Linux: 确保应用正在运行
   - 检查控制台日志是否有 deep-link 事件
   - 查看 [GitHub_OAuth_修复说明.md](GitHub_OAuth_修复说明.md) 获取详细调试信息

3. **显示 "OAuth 认证失败"**
   - 检查 `.env` 文件是否配置了正确的 `GITHUB_CLIENT_SECRET`
   - 重启开发服务器以加载环境变量
   - 查看后端日志了解具体错误

### 同步失败

- **网络连接**: 确保有稳定的网络连接
- **登录状态**: 确认已成功登录（设置页面显示用户名）
- **权限问题**: GitHub token 需要 `gist` 权限
- **查看日志**: 打开 DevTools (F12) 查看详细错误信息

### 需要重新登录

如果需要切换账号或重新授权：

1. 在设置页面点击 "登出"
2. 清除应用数据（可选）
3. 重新点击 "使用 GitHub 登录"

