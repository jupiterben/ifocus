# iFocus 迁移到 Next.js 方案

## 概述

将当前的 Tauri + React + Vite 应用迁移到 Next.js，以支持 Web 部署并保持桌面端功能。

## 为什么选择 Next.js？

### 优势
✅ **全栈框架** - 内置后端 API 路由，无需单独服务器  
✅ **SEO 友好** - 服务端渲染 (SSR) / 静态生成 (SSG)  
✅ **部署简单** - Vercel 一键部署  
✅ **文件路由** - 约定式路由，减少配置  
✅ **API Routes** - 完美解决 GitHub OAuth 后端需求  
✅ **React 生态** - 现有组件可直接复用  

### 适用场景
- 🌐 需要 Web 版本
- 🔐 需要后端 API（OAuth 回调）
- 📱 未来可能需要 PWA
- 🚀 快速部署和迭代

## 架构对比

### 当前架构（Tauri）
```
┌────────────────────────────┐
│   React + Vite (前端)       │
├────────────────────────────┤
│   Tauri (桌面容器)          │
├────────────────────────────┤
│   Rust 后端                 │
│   - OAuth 处理              │
│   - 系统调用                │
└────────────────────────────┘
```

### Next.js 架构
```
┌────────────────────────────┐
│   Next.js App              │
│   ├─ pages/ (路由)         │
│   ├─ components/ (组件)    │
│   ├─ api/ (后端 API)       │
│   └─ public/ (静态资源)    │
└────────────────────────────┘
```

### 混合架构（推荐）
```
桌面端                     Web 端
┌──────────────┐          ┌──────────────┐
│   Tauri      │          │   Next.js    │
│   + React    │          │   - SSR      │
│   - 本地功能  │          │   - API路由  │
│   - 离线可用  │          │   - 云部署   │
└──────────────┘          └──────────────┘
        │                        │
        └────────┬───────────────┘
               共享代码
        ┌──────────────────┐
        │ components/      │
        │ hooks/           │
        │ services/        │
        │ types/           │
        └──────────────────┘
```

## 迁移方案

### 方案 A: 完全迁移到 Next.js（仅 Web）

**适合**: 只需要 Web 版本，不需要桌面应用

#### 优点
- 🎯 架构简单统一
- 🚀 部署容易（Vercel）
- 💰 维护成本低

#### 缺点
- ❌ 失去桌面端特性（离线、通知等）
- ❌ 无法使用 Tauri 原生功能

#### 工作量
**预计时间**: 16-24 小时

### 方案 B: Next.js + Tauri 共存（推荐）

**适合**: 需要同时支持 Web 和桌面端

#### 优点
- ✅ 保留桌面端优势
- ✅ 同时支持 Web 部署
- ✅ 代码复用率高
- ✅ 灵活选择部署方式

#### 缺点
- ⚠️ 需要维护两个构建流程
- ⚠️ 某些功能需要环境适配

#### 工作量
**预计时间**: 24-40 小时

---

## 方案 B 详细实施计划（推荐）

### 阶段 1: 项目结构调整（4-6h）

#### 1.1 创建 Next.js 项目

```bash
# 在项目根目录创建 next-app/
npx create-next-app@latest next-app --typescript --tailwind --app --no-src-dir

cd next-app
```

#### 1.2 新项目结构

```
ifocus/
├── src/                      # 共享前端代码
│   ├── components/          # ✅ 可直接复用
│   ├── hooks/               # ✅ 可直接复用
│   ├── services/            # ⚠️ 需要环境适配
│   ├── types/               # ✅ 可直接复用
│   └── styles/              # ✅ 可直接复用
│
├── src-tauri/               # Tauri 桌面端
│   ├── src/
│   │   ├── main.rs
│   │   └── github_oauth.rs
│   └── Cargo.toml
│
├── next-app/                # Next.js Web 端
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── github/
│   │               └── callback/
│   │                   └── route.ts
│   ├── components/          # → 软链接到 ../src/components
│   ├── hooks/               # → 软链接到 ../src/hooks
│   ├── public/
│   └── next.config.js
│
├── package.json             # 根目录 - 管理所有依赖
├── vite.config.ts          # Tauri 构建配置
└── README.md
```

#### 1.3 配置软链接（代码共享）

**Windows:**
```bash
# 在 next-app/ 目录下
mklink /D components ..\src\components
mklink /D hooks ..\src\hooks
mklink /D types ..\src\types
```

**Linux/Mac:**
```bash
cd next-app/
ln -s ../src/components components
ln -s ../src/hooks hooks
ln -s ../src/types types
```

或使用 npm workspace:

**package.json (根目录):**
```json
{
  "name": "ifocus-monorepo",
  "private": true,
  "workspaces": [
    "next-app",
    "packages/*"
  ]
}
```

### 阶段 2: 实现 Next.js API 路由（4-6h）

#### 2.1 GitHub OAuth 回调

**next-app/app/api/auth/github/callback/route.ts:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    // 1. 交换 access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.json(
        { error: tokenData.error_description },
        { status: 400 }
      );
    }

    // 2. 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        'User-Agent': 'iFocus-App',
      },
    });

    const user = await userResponse.json();

    // 3. 返回结果
    return NextResponse.json({
      token: tokenData.access_token,
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.2 Gist 同步代理（可选）

如果需要服务端代理 GitHub API：

**next-app/app/api/gist/[action]/route.ts:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  const { token, gistId, data } = await request.json();

  // 根据 action 调用不同的 GitHub API
  switch (params.action) {
    case 'create':
      // 创建 Gist
      break;
    case 'update':
      // 更新 Gist
      break;
    case 'get':
      // 获取 Gist
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

### 阶段 3: 适配认证服务（2-4h）

#### 3.1 环境检测增强

**src/services/auth/AuthFactory.ts:**

```typescript
function detectEnvironment(): 'tauri' | 'nextjs' | 'browser' {
  // Tauri 环境
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return 'tauri';
  }
  
  // Next.js 环境（服务端或客户端）
  if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME) {
    return 'nextjs';
  }
  
  // 普通浏览器
  return 'browser';
}

export function createAuthProvider(backendUrl?: string): IAuthProvider {
  const env = detectEnvironment();
  
  console.log(`🔍 检测到环境: ${env}`);
  
  switch (env) {
    case 'tauri':
      return new TauriAuthProvider(new TauriStorageProvider());
    
    case 'nextjs':
      // Next.js 环境使用内置 API 路由
      return new WebAuthProvider(
        new LocalStorageProvider(),
        '/api'  // Next.js API 路由前缀
      );
    
    case 'browser':
      return new WebAuthProvider(
        new LocalStorageProvider(),
        backendUrl
      );
  }
}
```

#### 3.2 Next.js 专用 Provider（可选）

**src/services/auth/providers/NextJSAuthProvider.ts:**

```typescript
export class NextJSAuthProvider implements IAuthProvider {
  private storage: IStorageProvider;

  constructor(storage: IStorageProvider) {
    this.storage = storage;
  }

  async startLogin(): Promise<void> {
    // Next.js 使用相对路径重定向
    const redirectUri = `${window.location.origin}/auth/callback`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=gist`;
    
    window.location.href = authUrl;
  }

  async handleCallback(code: string): Promise<AuthResult> {
    // 调用 Next.js API 路由
    const response = await fetch('/api/auth/github/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const result = await response.json();
    
    this.storage.setToken(result.token);
    this.storage.setUser(result.user);
    
    return result;
  }

  // ... 其他方法实现
}
```

### 阶段 4: 页面和路由（6-8h）

#### 4.1 主页面

**next-app/app/page.tsx:**

```typescript
'use client';

import { useTimer } from '@/hooks/useTimer';
import { useTasks } from '@/hooks/useTasks';
import { Timer } from '@/components/Timer';
import { TaskList } from '@/components/TaskList';
import { Settings } from '@/components/Settings';

export default function Home() {
  const timer = useTimer();
  const tasks = useTasks();
  
  // 其他逻辑...（从 App.tsx 复制）
  
  return (
    <div className="app">
      {/* UI 组件（从 App.tsx 复制） */}
    </div>
  );
}
```

#### 4.2 OAuth 回调页面

**next-app/app/auth/callback/page.tsx:**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleOAuthCallback } from '@/services/githubSyncV2';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      handleOAuthCallback(code)
        .then(() => {
          router.push('/');
        })
        .catch((error) => {
          console.error('登录失败:', error);
          router.push('/?error=auth_failed');
        });
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">正在登录...</h1>
        <p className="text-gray-600">请稍候</p>
      </div>
    </div>
  );
}
```

#### 4.3 Layout（全局布局）

**next-app/app/layout.tsx:**

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'iFocus - 专注每一刻，成就每一天',
  description: '基于番茄工作法的时间管理应用',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

### 阶段 5: 样式迁移（2-4h）

#### 5.1 选择方案

**方案 A: 使用 Tailwind CSS（推荐）**
- Next.js 默认集成
- 现代化、响应式
- 需要重写现有 CSS

**方案 B: 保留现有 CSS**
- 将 `src/App.css` 复制到 Next.js
- 最小改动
- 可能需要调整路径

#### 5.2 Tailwind 迁移示例

**当前 CSS:**
```css
.app__header {
  text-align: center;
  padding: 2rem;
}
```

**Tailwind:**
```tsx
<header className="text-center p-8">
  {/* ... */}
</header>
```

### 阶段 6: 环境变量配置（1-2h）

#### 6.1 Next.js 环境变量

**next-app/.env.local:**
```bash
GITHUB_CLIENT_ID=Ov23liZpDAtVMTavdA3s
GITHUB_CLIENT_SECRET=your_secret_here

# Next.js 公开变量（客户端可访问）
NEXT_PUBLIC_APP_NAME=iFocus
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

#### 6.2 Tauri 环境变量

**src-tauri/.env:**
```bash
GITHUB_CLIENT_SECRET=your_secret_here
```

### 阶段 7: 构建和部署（2-4h）

#### 7.1 更新 package.json

**根目录 package.json:**
```json
{
  "scripts": {
    "dev:tauri": "tauri dev",
    "dev:web": "cd next-app && npm run dev",
    "build:tauri": "tauri build",
    "build:web": "cd next-app && npm run build",
    "start:web": "cd next-app && npm start"
  }
}
```

#### 7.2 Vercel 部署

**next-app/vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "GITHUB_CLIENT_ID": "@github-client-id",
    "GITHUB_CLIENT_SECRET": "@github-client-secret"
  }
}
```

**部署步骤:**
```bash
# 1. 连接 GitHub 仓库到 Vercel
# 2. 配置环境变量
# 3. 部署
vercel --prod
```

#### 7.3 更新 GitHub OAuth 设置

在 https://github.com/settings/developers 添加：

```
Authorization callback URLs:
- ifocus://auth/callback          (Tauri 桌面端)
- https://yourdomain.com/auth/callback  (Next.js Web 端)
- http://localhost:3000/auth/callback    (本地开发)
```

---

## 完整迁移检查清单

### 准备阶段
- [ ] 备份当前代码
- [ ] 创建新分支 `feature/nextjs-migration`
- [ ] 规划项目结构

### 开发阶段
- [ ] 创建 Next.js 项目
- [ ] 设置代码共享（软链接/workspace）
- [ ] 实现 API 路由（OAuth 回调）
- [ ] 适配认证服务
- [ ] 迁移组件和页面
- [ ] 迁移样式
- [ ] 配置环境变量

### 测试阶段
- [ ] 本地测试 Next.js Web 端
- [ ] 测试 Tauri 桌面端（确保未破坏）
- [ ] 测试 OAuth 登录流程
- [ ] 测试数据同步功能
- [ ] 跨浏览器测试

### 部署阶段
- [ ] 部署到 Vercel
- [ ] 更新 GitHub OAuth 回调 URL
- [ ] 配置生产环境变量
- [ ] 测试生产环境

### 文档阶段
- [ ] 更新 README
- [ ] 编写部署文档
- [ ] 更新 TODO
- [ ] 记录已知问题

---

## 时间估算

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| 项目结构调整 | 4-6h | 创建项目、配置共享 |
| API 路由实现 | 4-6h | OAuth、Gist 代理 |
| 认证服务适配 | 2-4h | 环境检测、Provider |
| 页面路由开发 | 6-8h | 主页、回调页、布局 |
| 样式迁移 | 2-4h | CSS/Tailwind |
| 环境变量配置 | 1-2h | .env 文件 |
| 构建部署 | 2-4h | Vercel 配置 |
| 测试调试 | 4-6h | 功能测试 |
| **总计** | **25-40h** | 约 3-5 个工作日 |

---

## 风险和挑战

### 技术风险
1. **状态管理**: Next.js SSR 可能影响 localStorage
   - **解决**: 使用客户端组件 (`'use client'`)

2. **路由差异**: Tauri deep-link vs Next.js 路由
   - **解决**: 环境检测，条件处理

3. **构建复杂度**: 维护两套构建流程
   - **解决**: 统一脚本，CI/CD 自动化

### 业务风险
1. **功能缺失**: 某些 Tauri 特性在 Web 不可用
   - **解决**: 渐进增强，功能降级

2. **用户迁移**: 现有桌面端用户
   - **解决**: 保持桌面端不变

---

## 推荐实施方案

### 短期（1-2周）
1. ✅ 创建 Next.js 项目并行开发
2. ✅ 实现基本 Web 功能
3. ✅ 部署到 Vercel

### 中期（1个月）
4. ✅ 完善 Web 端功能
5. ✅ 统一代码库
6. ✅ 优化用户体验

### 长期（持续）
7. ✅ PWA 支持
8. ✅ 移动端适配
9. ✅ 性能优化

---

## 开始第一步

想要开始迁移吗？我可以帮你：

```bash
# 1. 创建 Next.js 项目
npx create-next-app@latest next-app --typescript --tailwind --app

# 2. 安装共享依赖
cd next-app
npm install

# 3. 创建第一个 API 路由
# 我可以帮你生成代码
```

需要我帮你开始实施吗？😊

