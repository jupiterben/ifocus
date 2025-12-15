
#TODO 


## ✅ Github登录功能 - 认证层抽象 (已完成)

已实现认证抽象层，支持服务端和PC端的登录：

### 完成的功能
- ✅ 定义 `IAuthProvider` 和 `IStorageProvider` 接口
- ✅ 实现 `TauriAuthProvider` (桌面端)
- ✅ 实现 `WebAuthProvider` (Web端)
- ✅ 实现 `LocalStorageProvider` 和 `TauriStorageProvider`
- ✅ 创建 `AuthFactory` 工厂类自动选择实现
- ✅ 创建 `githubSyncV2.ts` 使用新的抽象层
- ✅ 登录状态持久化（无需每次启动重新登录）
- ✅ Token 自动验证和失效处理

### 相关文档
- `dev_doc/认证层架构设计.md` - 详细架构设计
- `dev_doc/登录状态持久化.md` - 持久化功能说明
- `dev_doc/迁移到认证抽象层指南.md` - 迁移指南

### 待优化项

详细实施计划见：`dev_doc/待优化项实施计划.md`

#### 优先级排序

## 🚀 迁移到 Next.js（新计划）

详细方案见：`dev_doc/迁移到NextJS方案.md`

### 目标
- 同时支持 Web 部署和桌面应用
- 利用 Next.js API 路由解决 OAuth 后端需求
- 代码复用，降低维护成本

### 实施方案：Next.js + Tauri 共存（推荐）

**预计时间**: 25-40小时（3-5个工作日）

#### 阶段 1: 项目搭建（4-6h）
- [ ] 创建 Next.js 项目 (`next-app/`)
- [ ] 配置代码共享（软链接/workspace）
- [ ] 项目结构调整

#### 阶段 2: API 路由（4-6h）
- [ ] 实现 GitHub OAuth 回调 API
- [ ] 实现 Gist 同步代理（可选）
- [ ] 环境变量配置

#### 阶段 3: 认证适配（2-4h）
- [ ] 增强环境检测（Tauri/Next.js/Browser）
- [ ] 创建 NextJSAuthProvider
- [ ] 更新 AuthFactory

#### 阶段 4: 页面开发（6-8h）
- [ ] 主页面 (`app/page.tsx`)
- [ ] OAuth 回调页 (`app/auth/callback/page.tsx`)
- [ ] 全局布局 (`app/layout.tsx`)
- [ ] 复用现有组件

#### 阶段 5: 样式迁移（2-4h）
- [ ] 选择方案（Tailwind 或保留 CSS）
- [ ] 迁移样式文件
- [ ] 响应式适配

#### 阶段 6: 部署配置（2-4h）
- [ ] Vercel 部署配置
- [ ] 更新 GitHub OAuth 回调 URL
- [ ] 生产环境测试

#### 阶段 7: 测试优化（4-6h）
- [ ] 功能测试（Web + Tauri）
- [ ] 跨浏览器测试
- [ ] 性能优化
- [ ] 文档更新

### 快速开始

```bash
# 创建 Next.js 项目
npx create-next-app@latest next-app --typescript --tailwind --app

# 安装依赖
cd next-app && npm install

# 开发服务器
npm run dev        # Next.js Web
npm run tauri:dev  # Tauri 桌面
```

### 架构优势
- ✅ 一套代码，双端部署
- ✅ Next.js 内置后端 API
- ✅ Vercel 一键部署
- ✅ 保留桌面端特性





## 重新设计页面
使用 router



## 代码优化 
