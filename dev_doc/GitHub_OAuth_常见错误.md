# GitHub OAuth 常见错误排查

## 错误：缺少 `access_token` 字段

### 错误信息
```
GitHub OAuth 失败: 解析响应失败: error decoding response body: 
missing field `access_token` at line 1 column 236
```

### 问题原因

这个错误表明 GitHub 没有返回 `access_token`，而是返回了错误响应。常见原因包括：

#### 1. **Authorization Code 已被使用**

OAuth authorization code 是**一次性**的，使用后立即失效。

**场景**：
- 用户授权后，GitHub 重定向 `ifocus://auth/callback?code=xxx`
- 应用处理了这个 code 并交换了 token
- 但由于某些原因（如调试、刷新），应用再次尝试使用同一个 code

**GitHub 错误响应**：
```json
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired.",
  "error_uri": "https://docs.github.com/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors/#bad-verification-code"
}
```

**解决方案**：
- ✅ 重新进行 OAuth 流程（点击 "使用 GitHub 登录"）
- ✅ 确保 code 只使用一次
- ✅ 不要在开发时多次刷新

#### 2. **Client Secret 不正确**

**场景**：
- `.env` 文件中的 `GITHUB_CLIENT_SECRET` 不正确
- 或者 GitHub OAuth App 的 Secret 已更新但 `.env` 未更新

**GitHub 错误响应**：
```json
{
  "error": "incorrect_client_credentials",
  "error_description": "The client_id and/or client_secret passed are incorrect.",
  "error_uri": "https://docs.github.com/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors/#incorrect-client-credentials"
}
```

**解决方案**：
1. 检查 `.env` 文件：
   ```bash
   cat .env
   # 应该看到：
   # GITHUB_CLIENT_SECRET=你的实际secret
   ```

2. 确认 Secret 正确：
   - 访问 https://github.com/settings/developers
   - 找到你的 OAuth App
   - 如果需要，重新生成 Client Secret
   - 更新 `.env` 文件

3. **重要**：重启开发服务器以加载新的环境变量
   ```bash
   # 停止当前服务器 (Ctrl+C)
   pnpm tauri:dev
   ```

#### 3. **Client ID 不匹配**

**场景**：
- 代码中的 `GITHUB_CLIENT_ID` 与 OAuth App 的 Client ID 不一致
- 或使用了其他 OAuth App 的 ID

**GitHub 错误响应**：
```json
{
  "error": "incorrect_client_credentials",
  "error_description": "The client_id and/or client_secret passed are incorrect."
}
```

**解决方案**：
1. 检查 `src-tauri/src/github_oauth.rs`：
   ```rust
   const GITHUB_CLIENT_ID: &str = "Ov23liZpDAtVMTavdA3s";
   ```

2. 确认与 GitHub OAuth App 的 Client ID 一致

#### 4. **OAuth App 被暂停或删除**

**场景**：
- GitHub OAuth App 被暂停
- OAuth App 被删除

**解决方案**：
- 访问 https://github.com/settings/developers
- 检查 OAuth App 状态
- 如需要，重新创建 OAuth App

#### 5. **网络问题或 GitHub API 异常**

**场景**：
- 网络连接不稳定
- GitHub API 临时故障

**解决方案**：
- 检查网络连接
- 稍后重试
- 查看 GitHub Status: https://www.githubstatus.com/

## 🔧 修复后的错误处理

现在代码会显示详细的错误信息：

### 改进前
```
❌ 解析响应失败: missing field `access_token`
```

### 改进后
```
📄 响应内容: {"error":"bad_verification_code","error_description":"The code passed is incorrect or expired."}
❌ GitHub OAuth 错误: bad_verification_code
   描述: The code passed is incorrect or expired.
GitHub OAuth 失败: bad_verification_code - The code passed is incorrect or expired.
```

## 🧪 调试步骤

### 1. 查看完整错误信息

**后端日志**（终端）会显示：
```
📄 响应内容: {...}
❌ GitHub OAuth 错误: error_type
   描述: error_description
```

### 2. 识别错误类型

常见错误类型：
- `bad_verification_code` - Code 已使用或无效
- `incorrect_client_credentials` - Client ID/Secret 错误
- `redirect_uri_mismatch` - 回调 URL 不匹配

### 3. 对应解决

| 错误类型 | 原因 | 解决方案 |
|---------|------|---------|
| `bad_verification_code` | Code 已使用 | 重新授权 |
| `incorrect_client_credentials` | Secret 错误 | 检查 `.env` 并重启 |
| `redirect_uri_mismatch` | 回调 URL 错误 | 检查 OAuth App 配置 |

## 📋 检查清单

在报告问题前，请确认：

- [ ] `.env` 文件存在且包含正确的 `GITHUB_CLIENT_SECRET`
- [ ] 已重启开发服务器以加载环境变量
- [ ] Client ID 与 GitHub OAuth App 一致
- [ ] 这是一次新的 OAuth 授权（不是重复使用旧的 code）
- [ ] GitHub OAuth App 状态正常（未暂停）
- [ ] 网络连接正常

## 🔍 手动测试 OAuth App 配置

使用 curl 测试 token 交换：

```bash
curl -X POST https://github.com/login/oauth/access_token \
  -H "Accept: application/json" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=TEMP_CODE"
```

**成功响应**：
```json
{
  "access_token": "gho_xxxxx",
  "token_type": "bearer",
  "scope": "gist"
}
```

**失败响应**：
```json
{
  "error": "bad_verification_code",
  "error_description": "The code passed is incorrect or expired."
}
```

## 🎯 最常见的问题

### Code 重复使用

**症状**：第一次登录成功，刷新页面后失败

**原因**：应用可能多次触发了 OAuth 回调处理

**解决方案**：
1. 确保没有重复的 deep-link 监听器
2. 检查是否有 React 的 StrictMode 导致双重执行
3. 重新授权获取新的 code

### 忘记重启服务器

**症状**：更新 `.env` 后仍然报错

**原因**：环境变量在启动时加载，不会自动刷新

**解决方案**：
```bash
# 停止服务器
Ctrl+C

# 重新启动
pnpm tauri:dev
```

## 📚 相关资源

- [GitHub OAuth 文档](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [OAuth 错误代码说明](https://docs.github.com/en/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors)
- [GitHub Status](https://www.githubstatus.com/)

## 💡 下一步

如果问题仍然存在：
1. 查看完整的后端日志
2. 检查响应内容（现在会打印出来）
3. 参考 GitHub 文档中对应的错误说明
4. 必要时重新创建 OAuth App

