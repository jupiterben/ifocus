# Next.js 迁移 - 快速开始指南

## 🎯 目标

将 iFocus 扩展为 **Tauri（桌面）+ Next.js（Web）** 混合架构，实现一套代码双端部署。

## 📋 准备工作

### 前置要求
- ✅ Node.js 18+ 
- ✅ npm 或 pnpm
- ✅ Git（用于版本控制）
- ✅ 已有 GitHub OAuth App

### 时间预估
- **快速原型**: 6-8 小时（基本功能）
- **完整迁移**: 25-40 小时（生产就绪）

## 🚀 三种启动方式

### 方式 1: 自动化脚本（推荐）

#### Windows (PowerShell)
```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\setup-nextjs.ps1
```

#### Linux/Mac (Bash)
```bash
chmod +x scripts/setup-nextjs.sh
./scripts/setup-nextjs.sh
```

**脚本会自动**：
- ✅ 创建 Next.js 项目
- ✅ 配置代码共享（软链接）
- ✅ 创建 API 路由目录
- ✅ 生成环境变量模板
- ✅ 创建文档

### 方式 2: 手动创建

```bash
# 1. 创建 Next.js 项目
npx create-next-app@latest next-app \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir

# 2. 进入项目
cd next-app

# 3. 创建代码共享（Windows）
mklink /D components ..\src\components
mklink /D hooks ..\src\hooks
mklink /D types ..\src\types

# 3. 创建代码共享（Linux/Mac）
ln -s ../src/components components
ln -s ../src/hooks hooks
ln -s ../src/types types

# 4. 创建目录结构
mkdir -p app/api/auth/github/callback
mkdir -p app/auth/callback

# 5. 创建环境变量文件
cp .env.example .env.local
# 编辑 .env.local
```

### 方式 3: npm workspace（高级）

适合大型项目，更好的依赖管理。

**根目录 package.json:**
```json
{
  "name": "ifocus-monorepo",
  "private": true,
  "workspaces": [
    "next-app",
    "packages/*"
  ],
  "scripts": {
    "dev:tauri": "tauri dev",
    "dev:web": "npm run dev --workspace=next-app",
    "build:all": "npm run build --workspaces"
  }
}
```

## 📂 项目结构（完成后）

```
ifocus/
├── src/                      # 共享代码（Tauri + Next.js）
│   ├── components/          # ✅ React 组件
│   ├── hooks/               # ✅ React Hooks
│   ├── services/            # ✅ 业务逻辑
│   ├── types/               # ✅ TypeScript 类型
│   └── styles/              # ✅ CSS 样式
│
├── src-tauri/               # Tauri 桌面端
│   ├── src/
│   │   ├── main.rs
│   │   └── github_oauth.rs
│   └── Cargo.toml
│
├── next-app/                # Next.js Web 端 ⭐ 新增
│   ├── app/
│   │   ├── page.tsx        # 主页面
│   │   ├── layout.tsx      # 全局布局
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx   # OAuth 回调页
│   │   └── api/
│   │       └── auth/
│   │           └── github/
│   │               └── callback/
│   │                   └── route.ts  # API 路由
│   ├── components -> ../src/components  # 软链接
│   ├── hooks -> ../src/hooks            # 软链接
│   ├── types -> ../src/types            # 软链接
│   ├── public/
│   ├── .env.local
│   ├── next.config.js
│   └── package.json
│
├── scripts/
│   ├── setup-nextjs.sh     # ⭐ 自动化脚本
│   └── setup-nextjs.ps1    # ⭐ Windows 脚本
│
├── dev_doc/
│   ├── 迁移到NextJS方案.md  # ⭐ 详细方案
│   └── Next.js迁移-快速开始.md  # 本文档
│
└── package.json
```

## 🔧 核心文件创建

### 1. API 路由 - OAuth 回调

**next-app/app/api/auth/github/callback/route.ts:**

<details>
<summary>点击查看完整代码</summary>

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

</details>

### 2. OAuth 回调页面

**next-app/app/auth/callback/page.tsx:**

<details>
<summary>点击查看完整代码</summary>

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

</details>

### 3. 主页面

**next-app/app/page.tsx:**

```typescript
'use client';

import { useTimer } from '@/hooks/useTimer';
import { useTasks } from '@/hooks/useTasks';
// ... 其他导入

export default function Home() {
  const timer = useTimer();
  const tasks = useTasks();
  
  // 复制现有 App.tsx 的逻辑
  
  return (
    <div className="app">
      {/* 复制现有 UI */}
    </div>
  );
}
```

### 4. 环境变量

**next-app/.env.local:**

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=Ov23liZpDAtVMTavdA3s
GITHUB_CLIENT_SECRET=your_secret_here

# 应用配置
NEXT_PUBLIC_APP_NAME=iFocus
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 测试步骤

### 本地测试

```bash
# 1. 启动 Next.js 开发服务器
cd next-app
npm run dev

# 访问 http://localhost:3000

# 2. 测试 OAuth 登录
# - 点击"使用 GitHub 登录"
# - 应该重定向到 GitHub
# - 授权后回调到 /auth/callback
# - 自动返回首页并登录

# 3. 测试 Tauri（确保未破坏）
cd ..
npm run tauri:dev
```

### API 测试

```bash
# 测试 OAuth API
curl -X POST http://localhost:3000/api/auth/github/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'
```

## 🚀 部署到 Vercel

### 方式 1: 通过 Git（推荐）

```bash
# 1. 提交代码
git add .
git commit -m "feat: add Next.js web version"
git push

# 2. 在 Vercel 连接仓库
# - 访问 vercel.com
# - Import Project
# - 选择 GitHub 仓库
# - Root Directory: next-app

# 3. 配置环境变量
# GITHUB_CLIENT_ID
# GITHUB_CLIENT_SECRET

# 4. 部署
```

### 方式 2: Vercel CLI

```bash
cd next-app
npm install -g vercel
vercel login
vercel --prod
```

### 部署后配置

1. **更新 GitHub OAuth 设置**

访问 https://github.com/settings/developers

添加回调 URL：
```
https://your-domain.vercel.app/auth/callback
```

2. **测试生产环境**
```bash
curl https://your-domain.vercel.app/api/auth/github/callback
```

## ⚡ 快速迁移检查清单

### Day 1: 项目搭建（4-6h）
- [ ] 运行自动化脚本
- [ ] 配置环境变量
- [ ] 创建 API 路由
- [ ] 测试本地运行

### Day 2: 页面开发（6-8h）
- [ ] 创建主页面
- [ ] 创建回调页面
- [ ] 复用现有组件
- [ ] 测试 OAuth 流程

### Day 3: 样式和优化（4-6h）
- [ ] 迁移样式
- [ ] 响应式适配
- [ ] 性能优化
- [ ] 跨浏览器测试

### Day 4-5: 部署和测试（6-10h）
- [ ] 部署到 Vercel
- [ ] 配置生产环境
- [ ] 完整功能测试
- [ ] 更新文档

## 🐛 常见问题

### Q1: 软链接创建失败（Windows）
**A**: 需要管理员权限。以管理员身份运行 PowerShell。

### Q2: 模块导入错误
**A**: 检查 tsconfig.json 的 paths 配置：
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Q3: API 路由 404
**A**: 确保文件路径正确：`app/api/auth/github/callback/route.ts`

### Q4: OAuth 回调失败
**A**: 
1. 检查 GitHub OAuth App 回调 URL
2. 检查 .env.local 配置
3. 查看浏览器控制台错误

### Q5: Tauri 桌面端受影响
**A**: 不应该受影响，因为：
- Next.js 在独立目录
- 共享代码通过软链接
- 各自独立构建

## 📚 相关资源

### 文档
- [完整迁移方案](./迁移到NextJS方案.md) - 详细技术方案
- [认证层架构](./认证层架构设计.md) - 认证实现原理
- [Next.js 官方文档](https://nextjs.org/docs)

### 教程
- [Next.js App Router](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel 部署](https://vercel.com/docs)

## 🎯 下一步

选择你的路径：

### 路径 A: 快速原型（推荐新手）
1. ✅ 运行自动化脚本
2. ✅ 创建基本页面
3. ✅ 测试 OAuth 登录
4. ✅ 本地验证功能

### 路径 B: 完整迁移（生产就绪）
1. ✅ 按阶段实施（TODO.md）
2. ✅ 完整功能迁移
3. ✅ 样式和优化
4. ✅ 部署到生产环境

### 路径 C: 学习研究
1. ✅ 阅读完整方案
2. ✅ 理解架构设计
3. ✅ 实验性功能
4. ✅ 贡献改进

---

**准备好了吗？执行第一个命令开始吧！** 🚀

```bash
# Windows
.\scripts\setup-nextjs.ps1

# Linux/Mac
./scripts/setup-nextjs.sh
```

需要帮助？查看 `dev_doc/迁移到NextJS方案.md` 获取详细指导。

