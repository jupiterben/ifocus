# 单实例 + Deep-Link 集成修复

## 🔍 问题分析

你发现了一个关键问题！当用户通过 `ifocus://auth/callback?code=xxx` 启动应用时：

### Windows/Linux 的行为

1. **用户点击 deep-link** → `ifocus://auth/callback?code=xxx`
2. **操作系统启动新的应用实例**，将 URL 作为命令行参数传入
3. **问题**：之前的单实例检测会立即退出新实例
4. **结果**：❌ Deep-link 参数丢失，OAuth 回调失败！

### 代码流程（修复前）

```rust
fn main() {
    // 单实例检测
    let instance = SingleInstance::new("ifocus-app").unwrap();
    if !instance.is_single() {
        eprintln!("iFocus 已经在运行中，只允许运行一个实例");
        std::process::exit(1);  // ❌ 直接退出！deep-link 参数丢失
    }
    // ... 后面的代码永远不会执行
}
```

### macOS/iOS 的行为

在 macOS 和 iOS 上，deep-link 的行为不同：
- 系统不会启动新实例
- Deep-link 会作为事件发送给已运行的应用
- `on_open_url` 回调会被正确触发

## ✅ 解决方案

使用 Tauri 官方的 `single-instance` 插件，它内置了对 deep-link 的支持。

### 1. 更新依赖

**src-tauri/Cargo.toml**

```toml
# 移除
single-instance = "0.3"

# 添加（仅桌面平台：Windows/Linux/macOS）
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-single-instance = { version = "2", features = ["deep-link"] }
```

**注意**：使用 `cfg(not(any(target_os = "android", target_os = "ios")))` 而不是 `cfg(desktop)`，因为后者不是 Rust 的标准 cfg。

### 2. 更新代码

**src-tauri/src/main.rs**

```rust
fn main() {
    dotenv::dotenv().ok();
    
    let mut builder = tauri::Builder::default();
    
    // ✅ 配置单实例插件（必须在 deep-link 之前）
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("检测到新实例启动，参数: {:?}", argv);
            
            // ✅ deep-link 插件会自动处理 argv 中的 URL
            // 如果有 deep-link URL，会触发 deep-link://new-url 事件
            
            // 显示并聚焦主窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }
    
    // ✅ Deep-link 插件（在 single-instance 之后）
    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        // ...
}
```

## 🔄 工作流程（修复后）

### 场景：应用已经在运行，用户点击 OAuth 回调 URL

```
1. 用户在浏览器中授权
   ↓
2. GitHub 重定向: ifocus://auth/callback?code=xxx
   ↓
3. OS 启动新的应用实例，传入参数
   ↓
4. ✅ single-instance 插件检测到已有实例
   ↓
5. ✅ 调用回调函数，传入 argv 参数
   ↓
6. ✅ deep-link 插件检查 argv 是否包含 deep-link URL
   ↓
7. ✅ 如果是 deep-link，提取 URL 并发送到第一个实例
   ↓
8. ✅ 第一个实例触发 "deep-link://new-url" 事件
   ↓
9. ✅ 前端 onOpenUrl 接收到事件
   ↓
10. ✅ 处理 OAuth 回调，完成登录
    ↓
11. ✅ 新实例退出（参数已转发）
```

## 📋 关键点

### 插件顺序很重要

```rust
// ❌ 错误的顺序
.plugin(tauri_plugin_deep_link::init())
.plugin(tauri_plugin_single_instance::init(...))

// ✅ 正确的顺序
.plugin(tauri_plugin_single_instance::init(...))  // 先
.plugin(tauri_plugin_deep_link::init())           // 后
```

**原因**：`single-instance` 插件需要在 `deep-link` 插件之前初始化，这样才能在检测到新实例时，让 `deep-link` 插件有机会处理命令行参数。

### Deep-Link 功能集成

启用 `deep-link` 功能后，`single-instance` 插件会：
1. ✅ 自动检查新实例的 `argv` 参数
2. ✅ 识别 deep-link URL（匹配配置的 schemes）
3. ✅ 将 URL 转发到第一个实例
4. ✅ 触发 `deep-link://new-url` 事件

### 平台差异

| 平台 | 行为 | 需要 single-instance 插件吗？ |
|------|------|---------------------------|
| **Windows** | 启动新实例 | ✅ 是 |
| **Linux** | 启动新实例 | ✅ 是 |
| **macOS** | 发送事件到已运行实例 | ⚠️ 可选（建议使用） |
| **iOS** | 发送事件到已运行实例 | ❌ 否（不支持） |
| **Android** | 发送事件到已运行实例 | ❌ 否（不支持） |

## 🧪 测试方法

### 1. 测试单实例功能

```bash
# 终端 1
pnpm tauri:dev

# 终端 2（另开一个终端）
pnpm tauri:dev
```

**预期结果**：
- 第二个实例不会启动新窗口
- 第一个实例的窗口会被激活和聚焦
- 控制台输出："检测到新实例启动"

### 2. 测试 Deep-Link 功能

```bash
# 启动应用
pnpm tauri:dev

# 在另一个终端触发 deep-link（应用仍在运行）
# Windows:
start ifocus://auth/callback?code=test123

# Linux:
xdg-open ifocus://auth/callback?code=test123
```

**预期结果**：
- 不会启动新窗口
- 应用窗口被激活
- **后端日志**：
  ```
  检测到新实例启动，参数: ["path/to/ifocus.exe", "ifocus://auth/callback?code=test123"]
  收到 deep link 事件
  ```
- **前端日志**（DevTools Console）：
  ```
  🔗 processOAuthCallback 被调用
  📥 接收到的 URL: ifocus://auth/callback?code=test123
  ```

### 3. 测试完整 OAuth 流程

1. 点击 "使用 GitHub 登录"
2. 在浏览器中授权
3. GitHub 重定向到 `ifocus://auth/callback?code=xxx`
4. 观察日志确认流程正确

## 📝 相关文档更新

需要更新以下文档：

- ✅ **单实例_Deep-Link_修复.md**（本文档）
- 🔄 **GITHUB_OAUTH_SETUP.md** - 添加单实例配置说明
- 🔄 **GitHub_OAuth_修复说明.md** - 更新故障排查部分

## 🎯 总结

### 问题
- ❌ 旧的单实例实现会丢弃 deep-link 参数
- ❌ OAuth 回调无法正常工作

### 解决
- ✅ 使用 Tauri 官方 `single-instance` 插件
- ✅ 启用 `deep-link` 功能集成
- ✅ 自动转发参数到第一个实例
- ✅ OAuth 流程完美工作

### 优势
- 🚀 零配置集成
- 🔒 更安全（官方维护）
- 🎯 专为 Tauri 设计
- 📱 跨平台兼容

这个修复确保了 Windows 和 Linux 上的 OAuth deep-link 回调能够正常工作！

