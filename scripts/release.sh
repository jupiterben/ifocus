#!/bin/bash
#
# 发布新版本的完整流程脚本
# 用法: ./scripts/release.sh <patch|minor|major>
# 示例: ./scripts/release.sh patch
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取当前版本
get_version() {
  grep '"version"' "$ROOT_DIR/package.json" | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/'
}

# 计算新版本号
bump_version() {
  local version=$1
  local bump_type=$2
  local major minor patch
  
  IFS='.' read -r major minor patch <<< "$version"
  # 移除 patch 中可能的预发布标签
  patch="${patch%%-*}"
  
  case "$bump_type" in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "$major.$((minor + 1)).0"
      ;;
    patch)
      echo "$major.$minor.$((patch + 1))"
      ;;
  esac
}

# 更新 package.json
update_package_json() {
  local version=$1
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$ROOT_DIR/package.json"
  echo -e "  ${GREEN}✓${NC} package.json"
}

# 更新 tauri.conf.json
update_tauri_conf() {
  local version=$1
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/" "$ROOT_DIR/src-tauri/tauri.conf.json"
  echo -e "  ${GREEN}✓${NC} tauri.conf.json"
}

# 更新 Cargo.toml
update_cargo_toml() {
  local version=$1
  sed -i "s/^version = \"[^\"]*\"/version = \"$version\"/" "$ROOT_DIR/src-tauri/Cargo.toml"
  echo -e "  ${GREEN}✓${NC} Cargo.toml"
}

# 主流程
main() {
  local bump_type=$1
  local current_version=$(get_version)

  echo ""
  echo -e "${YELLOW}🚀 iFocus 发布脚本${NC}"
  echo ""
  echo "当前版本: $current_version"

  # 检查参数
  if [ -z "$bump_type" ]; then
    echo ""
    echo "用法: ./scripts/release.sh <patch|minor|major>"
    echo "  patch - 修订版本 (0.0.x)"
    echo "  minor - 次版本   (0.x.0)"
    echo "  major - 主版本   (x.0.0)"
    exit 0
  fi

  # 验证参数
  if [[ ! "$bump_type" =~ ^(patch|minor|major)$ ]]; then
    echo -e "\n${RED}❌ 无效参数，应为: patch, minor 或 major${NC}"
    exit 1
  fi

  local new_version=$(bump_version "$current_version" "$bump_type")
  echo "新版本: $new_version ($bump_type)"

  # Step 1: 同步版本号
  echo ""
  echo -e "${YELLOW}📝 步骤 1/4: 同步版本号${NC}"
  update_package_json "$new_version"
  update_tauri_conf "$new_version"
  update_cargo_toml "$new_version"

  # Step 2: Git 提交
  echo ""
  echo -e "${YELLOW}📦 步骤 2/4: Git 提交${NC}"
  git add -A
  git commit -m "chore: release v$new_version"

  # Step 3: 创建标签
  echo ""
  echo -e "${YELLOW}🏷️  步骤 3/4: 创建标签${NC}"
  git tag "v$new_version"

  # Step 4: 推送
  echo ""
  echo -e "${YELLOW}🚀 步骤 4/4: 推送到远程${NC}"
  git push
  git push origin "v$new_version"

  echo ""
  echo -e "${GREEN}✅ 发布完成！${NC}"
  echo ""
  echo "版本 v$new_version 已推送，GitHub Action 将自动构建并创建 Release。"
}

main "$1"

