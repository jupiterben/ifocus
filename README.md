# iFocus

基于 Tauri v2 + React + TypeScript 构建的现代番茄钟桌面应用。

[![Release](https://img.shields.io/github/v/release/user/ifocus?style=flat-square)](https://github.com/user/ifocus/releases)
[![License](https://img.shields.io/github/license/user/ifocus?style=flat-square)](LICENSE)

## 🎯 功能特性

- **🍅 番茄钟计时** - 标准番茄工作法，25分钟专注 + 5分钟短休息 + 15分钟长休息
- **📋 任务管理** - 创建任务、预估番茄数、追踪完成进度
- **🖼️ 桌面背景模式** - 将计时器嵌入桌面壁纸，沉浸式专注
- **📌 Mini 模式** - 小巧浮窗，置顶显示，拖动移动，双击退出
- **⏰ 半点自动模式** - 每半小时自动循环（25分专注 + 5分休息），契合自然节律
- **🖥️ 多显示器支持** - 自由选择桌面背景显示的目标屏幕
- **🌈 优雅界面** - 根据专注/休息状态自动切换主题色
- **💾 数据持久化** - 任务和设置本地保存，重启不丢失
- **🔐 GitHub 数据同步** - 使用 GitHub 账号登录，将数据同步到云端，支持多设备共享
- **🔒 单实例应用** - 防止重复启动，确保数据一致性和 OAuth 回调正常工作

## 📥 下载安装

前往 [Releases 页面](https://github.com/user/ifocus/releases) 下载最新版本：

| 平台 | 下载 |
|------|------|
| Windows | `.msi` 或 `.exe` 安装包 |
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x86_64) |
| Linux | `.deb` / `.AppImage` |

## ✨ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri v2
- **样式**: CSS Modules
- **构建**: Vite + Cargo

## 🔐 GitHub 数据同步

iFocus 支持通过 GitHub 账号登录并将数据同步到云端。

### 快速开始（Personal Access Token 方式）

1. 创建 GitHub Personal Access Token（需要 `gist` 权限）
2. 在应用设置中点击 "使用 GitHub 登录"
3. 粘贴 Token 完成登录
4. 使用 "上传到云端" 和 "从云端下载" 进行数据同步

### 完整 OAuth 流程（可选）

应用已内置 Tauri 后端支持完整 OAuth 认证流程，Client Secret 安全存储在本地。

- 📖 用户配置指南：[GITHUB_SYNC.md](GITHUB_SYNC.md)
- 🔧 开发实现指南：[GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md)

## 📋 前置要求

- [Node.js](https://nodejs.org/) (推荐 v18+)
- [Rust](https://www.rust-lang.org/) (最新稳定版)
- [pnpm](https://pnpm.io/) / npm / yarn (推荐 pnpm)

### Windows 额外要求

- [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 10/11 一般已内置)

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
# 或者
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
pnpm dev

# 在另一个终端启动 Tauri 开发模式
pnpm tauri:dev
```

### 构建生产版本

```bash
pnpm tauri:build
```

构建完成后，可执行文件位于 `src-tauri/target/release/`。

## 📁 项目结构

```
ifocus/
├── src/                    # 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── App.css            # 组件样式
│   ├── main.tsx           # React 入口
│   ├── styles.css         # 全局样式
│   └── vite-env.d.ts      # Vite 类型定义
├── src-tauri/             # Rust 后端代码
│   ├── src/
│   │   └── main.rs        # Rust 主程序
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri v2 配置
├── index.html             # HTML 入口
├── package.json           # Node.js 配置
├── tsconfig.json          # TypeScript 配置
└── vite.config.ts         # Vite 配置
```

## 🔧 可用命令

- `pnpm dev` - 启动 Vite 开发服务器
- `pnpm build` - 构建前端
- `pnpm preview` - 预览构建结果
- `pnpm tauri:dev` - 启动 Tauri 开发模式
- `pnpm tauri:build` - 构建桌面应用

## 📖 开发指南

### 添加 Tauri 命令

在 `src-tauri/src/main.rs` 中定义新命令：

```rust
#[tauri::command]
fn my_command(param: String) -> String {
    format!("收到: {}", param)
}
```

在前端调用：

```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('my_command', { param: 'hello' });
```

### 版本管理

项目版本号需在以下三个文件中保持同步：
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### 发布新版本

使用发布脚本自动完成版本更新、Git 提交、打标签和推送：

```bash
# 修订版本 (0.0.x)
pnpm release patch

# 次版本 (0.x.0)
pnpm release minor

# 主版本 (x.0.0)
pnpm release major
```

推送标签后，GitHub Actions 会自动构建多平台安装包并创建 Release。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](LICENSE)
