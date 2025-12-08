# iFocus

基于 Tauri v2 + React + TypeScript 构建的现代桌面应用。

## ✨ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri v2
- **样式**: CSS Modules
- **构建**: Vite + Cargo

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

