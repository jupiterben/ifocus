# iFocus 开发文档目录

## 认证功能

### 核心文档

1. **[认证功能改进总结](./认证功能改进总结.md)** 📌 **推荐先读**
   - 本次改进的完整概述
   - 包含两大改进：登录状态持久化 + 认证层抽象
   - 技术实现、优势对比、测试场景

2. **[认证层架构设计](./认证层架构设计.md)**
   - 详细的架构设计和实现原理
   - 接口定义、类图、设计模式
   - 适合深入了解技术细节

3. **[登录状态持久化](./登录状态持久化.md)**
   - Token 持久化的具体实现
   - 自动验证机制
   - 安全性考虑

### 操作指南

4. **[登录状态测试指南](./登录状态测试指南.md)**
   - 完整的测试步骤
   - 测试场景和预期结果
   - 调试技巧

5. **[迁移到认证抽象层指南](./迁移到认证抽象层指南.md)**
   - 如何将现有代码迁移到新架构
   - 环境配置（Tauri / Web）
   - 常见问题解答

## 问题修复

6. **[重复调用问题修复](./重复调用问题修复.md)**
   - OAuth 回调重复处理问题
   - single-instance 插件配置
   - deep-link 监听优化

## 快速开始

### 开发者快速上手

#### 1. 了解认证功能
```bash
# 阅读顺序
1. 认证功能改进总结.md       # 5分钟，了解全貌
2. 登录状态持久化.md          # 3分钟，了解持久化
3. 认证层架构设计.md          # 10分钟，深入理解
```

#### 2. 测试功能
```bash
# 启动开发服务器
npm run tauri:dev

# 参考测试指南进行测试
# 见：登录状态测试指南.md
```

#### 3. 使用新架构
```typescript
// 选项 1: 使用现有实现（已包含持久化）
import * as GitHubSync from './services/githubSync';

// 选项 2: 使用新的抽象层（推荐）
import * as GitHubSync from './services/githubSyncV2';

// 参考：迁移到认证抽象层指南.md
```

## 文件结构

### 源代码
```
src/services/
├── auth/                           # 认证抽象层
│   ├── types.ts                   # 接口定义
│   ├── AuthFactory.ts             # 工厂类
│   ├── providers/
│   │   ├── TauriAuthProvider.ts   # 桌面端实现
│   │   └── WebAuthProvider.ts     # Web 端实现
│   └── storage/
│       ├── LocalStorageProvider.ts
│       └── TauriStorageProvider.ts
├── githubSync.ts                   # 旧版（已包含持久化）
└── githubSyncV2.ts                 # 新版（使用抽象层）

src/hooks/
└── useGitHubSync.ts                # React Hook

src/components/
└── Settings.tsx                    # 设置界面
```

### 文档
```
dev_doc/
├── README.md                       # 本文件
├── 认证功能改进总结.md             # 📌 总览
├── 认证层架构设计.md               # 架构设计
├── 登录状态持久化.md               # 持久化实现
├── 登录状态测试指南.md             # 测试指南
├── 迁移到认证抽象层指南.md         # 迁移指南
└── 重复调用问题修复.md             # 问题修复
```

## 技术栈

- **桌面端**: Tauri + Rust
- **前端**: React + TypeScript + Vite
- **认证**: GitHub OAuth 2.0
- **存储**: localStorage (未来: Tauri Store)
- **设计模式**: 工厂模式 + 策略模式

## 常见问题

### Q: 如何开始使用持久化登录？
**A**: 无需额外配置！当前版本已经默认支持。首次登录后，下次启动会自动登录。

### Q: 如何支持 Web 部署？
**A**: 参考 [迁移到认证抽象层指南](./迁移到认证抽象层指南.md) 中的"Web 部署"章节。

### Q: Token 存储安全吗？
**A**: 当前使用 localStorage，未来会升级到 Tauri Store 加密存储。详见 [登录状态持久化](./登录状态持久化.md) 的安全性章节。

### Q: 如何测试登录功能？
**A**: 参考 [登录状态测试指南](./登录状态测试指南.md) 的完整测试步骤。

### Q: 我需要迁移现有代码吗？
**A**: 不强制。现有的 `githubSync.ts` 已包含持久化功能。如需支持 Web 部署，建议迁移到 `githubSyncV2.ts`。

## 贡献指南

### 添加新的认证提供者

1. 实现 `IAuthProvider` 接口
2. 实现 `IStorageProvider` 接口
3. 在 `AuthFactory.ts` 中注册
4. 编写单元测试

示例：
```typescript
// src/services/auth/providers/GitLabAuthProvider.ts
export class GitLabAuthProvider implements IAuthProvider {
  // 实现所有接口方法
}
```

### 添加新文档

1. 在 `dev_doc/` 目录创建 Markdown 文件
2. 更新本 README.md 的目录
3. 使用中文编写，清晰简洁

## 更新日志

### 2024-12-14
- ✅ 实现登录状态持久化
- ✅ 创建认证抽象层
- ✅ 支持 Tauri 和 Web 双环境
- ✅ 编写完整文档

## 联系方式

如有问题，请查看相关文档或提交 Issue。

---

**提示**: 所有文档均使用中文编写，力求简洁易懂。建议按照推荐顺序阅读。

