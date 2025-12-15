#!/bin/bash

# iFocus - Next.js 项目初始化脚本

echo "🚀 开始设置 Next.js 项目..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤 1: 创建 Next.js 项目
echo -e "${BLUE}📦 步骤 1/5: 创建 Next.js 项目${NC}"
npx create-next-app@latest next-app \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Next.js 项目创建成功${NC}"
else
  echo -e "${YELLOW}⚠️  项目创建失败，请检查错误信息${NC}"
  exit 1
fi

# 步骤 2: 创建软链接（代码共享）
echo -e "${BLUE}🔗 步骤 2/5: 创建代码共享链接${NC}"
cd next-app

# 检测操作系统
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  # Windows
  echo "检测到 Windows 系统，使用 mklink..."
  cmd //c "mklink /D components ..\\src\\components"
  cmd //c "mklink /D hooks ..\\src\\hooks"
  cmd //c "mklink /D types ..\\src\\types"
  cmd //c "mklink /D styles ..\\src\\styles"
else
  # Linux/Mac
  echo "检测到 Unix 系统，使用 ln -s..."
  ln -s ../src/components components
  ln -s ../src/hooks hooks
  ln -s ../src/types types
  ln -s ../src/styles styles
fi

echo -e "${GREEN}✅ 代码共享链接创建成功${NC}"

# 步骤 3: 创建 API 路由目录
echo -e "${BLUE}📂 步骤 3/5: 创建 API 路由结构${NC}"
mkdir -p app/api/auth/github/callback
mkdir -p app/api/gist
mkdir -p app/auth/callback

echo -e "${GREEN}✅ 目录结构创建成功${NC}"

# 步骤 4: 创建环境变量文件
echo -e "${BLUE}🔐 步骤 4/5: 创建环境变量配置${NC}"

cat > .env.local << 'EOF'
# GitHub OAuth 配置
GITHUB_CLIENT_ID=Ov23liZpDAtVMTavdA3s
GITHUB_CLIENT_SECRET=your_secret_here

# 应用配置
NEXT_PUBLIC_APP_NAME=iFocus
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}✅ 环境变量文件已创建${NC}"
echo -e "${YELLOW}⚠️  请在 .env.local 中配置 GITHUB_CLIENT_SECRET${NC}"

# 步骤 5: 创建 README
echo -e "${BLUE}📝 步骤 5/5: 创建文档${NC}"

cat > README.md << 'EOF'
# iFocus - Next.js Web 版本

## 开发

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 环境变量

复制 `.env.local` 并配置：

- `GITHUB_CLIENT_SECRET`: 从 GitHub OAuth App 获取

## 部署到 Vercel

1. 连接 GitHub 仓库
2. 在 Vercel 配置环境变量
3. 点击部署

## 相关文档

- [迁移方案](../dev_doc/迁移到NextJS方案.md)
- [认证架构](../dev_doc/认证层架构设计.md)
EOF

echo -e "${GREEN}✅ 文档已创建${NC}"

# 完成
cd ..
echo ""
echo -e "${GREEN}🎉 设置完成！${NC}"
echo ""
echo -e "${BLUE}下一步：${NC}"
echo "1. cd next-app"
echo "2. 编辑 .env.local，配置 GITHUB_CLIENT_SECRET"
echo "3. npm run dev  # 启动开发服务器"
echo ""
echo -e "${YELLOW}📖 查看完整迁移方案：${NC}"
echo "   dev_doc/迁移到NextJS方案.md"
echo ""

