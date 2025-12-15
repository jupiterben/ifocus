
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






## 重新设计页面
使用 router



## 代码优化 
