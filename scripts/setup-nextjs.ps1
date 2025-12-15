# iFocus - Next.js 项目初始化脚本 (PowerShell)

Write-Host "🚀 开始设置 Next.js 项目..." -ForegroundColor Cyan

# 步骤 1: 创建 Next.js 项目
Write-Host "`n📦 步骤 1/5: 创建 Next.js 项目" -ForegroundColor Blue
npx create-next-app@latest next-app `
  --typescript `
  --tailwind `
  --app `
  --no-src-dir `
  --import-alias "@/*"

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Next.js 项目创建成功" -ForegroundColor Green
} else {
  Write-Host "⚠️  项目创建失败，请检查错误信息" -ForegroundColor Yellow
  exit 1
}

# 步骤 2: 创建软链接（代码共享）
Write-Host "`n🔗 步骤 2/5: 创建代码共享链接" -ForegroundColor Blue
Set-Location next-app

# 需要管理员权限
Write-Host "正在创建符号链接（可能需要管理员权限）..." -ForegroundColor Yellow

try {
  New-Item -ItemType SymbolicLink -Path "components" -Target "..\src\components" -ErrorAction Stop
  New-Item -ItemType SymbolicLink -Path "hooks" -Target "..\src\hooks" -ErrorAction Stop
  New-Item -ItemType SymbolicLink -Path "types" -Target "..\src\types" -ErrorAction Stop
  New-Item -ItemType SymbolicLink -Path "styles" -Target "..\src\styles" -ErrorAction Stop
  Write-Host "✅ 代码共享链接创建成功" -ForegroundColor Green
} catch {
  Write-Host "⚠️  创建符号链接失败，尝试使用 Junction..." -ForegroundColor Yellow
  
  # 如果没有管理员权限，使用 Junction（目录）
  cmd /c "mklink /J components ..\src\components"
  cmd /c "mklink /J hooks ..\src\hooks"
  cmd /c "mklink /J types ..\src\types"
  cmd /c "mklink /J styles ..\src\styles"
  
  Write-Host "✅ Junction 链接创建成功" -ForegroundColor Green
}

# 步骤 3: 创建 API 路由目录
Write-Host "`n📂 步骤 3/5: 创建 API 路由结构" -ForegroundColor Blue
New-Item -ItemType Directory -Path "app\api\auth\github\callback" -Force | Out-Null
New-Item -ItemType Directory -Path "app\api\gist" -Force | Out-Null
New-Item -ItemType Directory -Path "app\auth\callback" -Force | Out-Null

Write-Host "✅ 目录结构创建成功" -ForegroundColor Green

# 步骤 4: 创建环境变量文件
Write-Host "`n🔐 步骤 4/5: 创建环境变量配置" -ForegroundColor Blue

@"
# GitHub OAuth 配置
GITHUB_CLIENT_ID=Ov23liZpDAtVMTavdA3s
GITHUB_CLIENT_SECRET=your_secret_here

# 应用配置
NEXT_PUBLIC_APP_NAME=iFocus
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "✅ 环境变量文件已创建" -ForegroundColor Green
Write-Host "⚠️  请在 .env.local 中配置 GITHUB_CLIENT_SECRET" -ForegroundColor Yellow

# 步骤 5: 创建 README
Write-Host "`n📝 步骤 5/5: 创建文档" -ForegroundColor Blue

@"
# iFocus - Next.js Web 版本

## 开发

``````bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
``````

## 环境变量

复制 ``.env.local`` 并配置：

- ``GITHUB_CLIENT_SECRET``: 从 GitHub OAuth App 获取

## 部署到 Vercel

1. 连接 GitHub 仓库
2. 在 Vercel 配置环境变量
3. 点击部署

## 相关文档

- [迁移方案](../dev_doc/迁移到NextJS方案.md)
- [认证架构](../dev_doc/认证层架构设计.md)
"@ | Out-File -FilePath "README.md" -Encoding UTF8

Write-Host "✅ 文档已创建" -ForegroundColor Green

# 完成
Set-Location ..
Write-Host "`n🎉 设置完成！" -ForegroundColor Green
Write-Host "`n下一步：" -ForegroundColor Blue
Write-Host "1. cd next-app"
Write-Host "2. 编辑 .env.local，配置 GITHUB_CLIENT_SECRET"
Write-Host "3. npm run dev  # 启动开发服务器"
Write-Host "`n📖 查看完整迁移方案：" -ForegroundColor Yellow
Write-Host "   dev_doc/迁移到NextJS方案.md"
Write-Host ""

