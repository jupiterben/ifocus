# GitHub OAuth 流程修复说明

## 问题描述

OAuth 流程的第 5-8 步没有正确执行：
- 5. 调用 Tauri 后端 `handle_github_oauth`
- 6. 后端安全地与 GitHub 交换 token
- 7. 返回 token 和用户信息到前端
- 8. 显示登录成功

## 根本原因

之前的实现尝试手动注册 deep-link 事件处理，但使用了不正确的 API。Tauri 2.0 的 deep-link 插件已经内置了事件处理机制，不需要手动注册。

## 修复内容

### 1. 后端修复 (`src-tauri/src/main.rs`)

**修改前的问题**：
- 尝试使用不存在的 `tauri_plugin_deep_link::register()` 函数
- 试图手动转发 deep-link 事件到前端

**修改后**：
```rust
// 正确使用 DeepLinkExt trait
use tauri_plugin_deep_link::DeepLinkExt;

app.deep_link().on_open_url(|_event| {
    // deep-link://new-url 事件会由插件自动发送到前端
    println!("收到 deep link 事件");
});

// Windows/Linux 开发模式下自动注册所有 schemes
#[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
{
    app.deep_link().register_all()?;
}
```

**关键改进**：
- ✅ 使用正确的 `DeepLinkExt::on_open_url()` API
- ✅ 插件会自动发送 `deep-link://new-url` 事件到前端
- ✅ Windows/Linux 开发环境自动注册 schemes
- ✅ 添加了详细的日志输出

### 2. 前端调试增强 (`src/services/githubSync.ts`)

**新增日志**：
```typescript
export async function handleOAuthCallback(code: string) {
  console.log('📡 handleOAuthCallback 开始处理，code:', code.substring(0, 8) + '...');
  console.log('🔄 正在调用 Tauri 后端 handle_github_oauth 命令...');
  const result = await invoke<{ token: string; user: GitHubUser }>('handle_github_oauth', { code });
  console.log('✅ OAuth 认证成功，用户:', result.user.login);
  console.log('💾 Token 和用户信息已存储');
  // ...
}
```

**关键改进**：
- ✅ 每个关键步骤都有清晰的日志
- ✅ 使用 emoji 前缀便于快速识别
- ✅ 记录 code 的前 8 个字符用于调试（不完整暴露）
- ✅ 详细的错误信息记录

### 3. Hook 调试增强 (`src/hooks/useGitHubSync.ts`)

**新增日志**：
```typescript
const processOAuthCallback = useCallback((url: string) => {
  console.log('🔗 processOAuthCallback 被调用');
  console.log('📥 接收到的 URL:', url);
  console.log('✅ URL 匹配 OAuth 回调格式');
  console.log('🔑 提取的 code:', code ? code.substring(0, 8) + '...' : 'null');
  console.log('✅ OAuth code 获取成功，开始认证流程...');
  console.log('🎉 GitHub 登录成功:', authUser.login);
  // ...
}, []);
```

**关键改进**：
- ✅ URL 解析过程完全可追踪
- ✅ 清晰标识每个步骤的状态
- ✅ 错误和警告都有详细日志
- ✅ Stack trace 记录用于深度调试

## 测试步骤

### 1. 启动应用

```bash
pnpm tauri:dev
```

### 2. 观察控制台输出

后端日志（终端）应该显示：
```
Deep link 插件已初始化，协议: ifocus://
已注册所有配置的 deep-link schemes
```

### 3. 点击 GitHub 登录

在应用的设置页面点击 "🔑 使用 GitHub 登录"

### 4. 浏览器授权

浏览器会打开 GitHub 授权页面，点击 "Authorize" 按钮

### 5. 观察日志输出

**后端日志（终端）**：
```
收到 deep link 事件
开始处理 GitHub OAuth，code: abc123de...
GitHub OAuth 成功，用户: your_username
```

**前端日志（DevTools Console - F12）**：
```
🔗 processOAuthCallback 被调用
📥 接收到的 URL: ifocus://auth/callback?code=...
✅ URL 匹配 OAuth 回调格式
🔑 提取的 code: abc123de...
✅ OAuth code 获取成功，开始认证流程...
📡 handleOAuthCallback 开始处理，code: abc123de...
🔄 正在调用 Tauri 后端 handle_github_oauth 命令...
✅ OAuth 认证成功，用户: your_username
💾 Token 和用户信息已存储
🎉 GitHub 登录成功: your_username
```

### 6. 验证成功

- 设置页面应该显示 "已登录: your_username"
- 系统通知显示 "登录成功 - 欢迎, your_username!"
- 可以点击 "📤 上传到云端" 测试数据同步

## 常见问题排查

### Q: 浏览器显示 "无法打开 ifocus://" 

**A**: 检查以下几点：

1. **Windows/Linux**：确保在开发模式下运行，`register_all()` 会自动注册
2. **日志检查**：查看终端是否有 "已注册所有配置的 deep-link schemes"
3. **手动注册**（Windows）：
   ```bash
   # 打开命令提示符（管理员权限）
   start ifocus://test
   ```

### Q: 后端没有收到 deep-link 事件

**A**: 检查配置：

1. 确认 `src-tauri/tauri.conf.json` 包含：
   ```json
   {
     "plugins": {
       "deep-link": {
         "desktop": {
           "schemes": ["ifocus"]
         }
       }
     }
   }
   ```

2. 确认后端初始化了插件：
   ```rust
   .plugin(tauri_plugin_deep_link::init())
   ```

### Q: 前端没有收到回调

**A**: 检查监听器：

1. 确认 `useGitHubSync` hook 已被使用
2. 检查 DevTools Console 是否有错误
3. 确认 `onOpenUrl` 监听器已注册

### Q: GitHub 返回错误

**A**: 检查环境变量：

1. 确认 `.env` 文件存在且包含 `GITHUB_CLIENT_SECRET`
2. 重启开发服务器以加载环境变量
3. 检查 Client Secret 是否正确

## 文件变更清单

1. ✅ `src-tauri/Cargo.toml` - 添加 single-instance 插件（带 deep-link 功能）
2. ✅ `src-tauri/src/main.rs` - 修复 deep-link 处理和单实例集成
3. ✅ `src/services/githubSync.ts` - 增强调试日志
4. ✅ `src/hooks/useGitHubSync.ts` - 增强调试日志
5. ✅ `GITHUB_OAUTH_SETUP.md` - 更新文档
6. ✅ `单实例_Deep-Link_修复.md` - 详细的修复说明

## 下一步

如果问题仍然存在，请：

1. 分享完整的控制台日志（前端 + 后端）
2. 确认 `.env` 文件配置正确
3. 尝试手动触发 deep-link：
   - Windows: `start ifocus://auth/callback?code=test123`
   - Linux: `xdg-open ifocus://auth/callback?code=test123`

