// 认证服务的通用类型定义

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

export interface AuthResult {
  token: string;
  user: GitHubUser;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: GitHubUser | null;
  token: string | null;
}

// 认证提供者接口 - 定义统一的认证行为
export interface IAuthProvider {
  // 初始化认证（检查已存储的 token）
  initialize(): Promise<AuthState>;
  
  // 启动登录流程
  startLogin(): Promise<void>;
  
  // 处理 OAuth 回调
  handleCallback(code: string): Promise<AuthResult>;
  
  // 验证 token 是否有效
  validateToken(token: string): Promise<boolean>;
  
  // 登出
  logout(): void;
  
  // 获取当前状态
  getAuthState(): AuthState;
}

// 存储提供者接口 - 定义统一的存储行为
export interface IStorageProvider {
  setToken(token: string): void;
  getToken(): string | null;
  setUser(user: GitHubUser): void;
  getUser(): GitHubUser | null;
  setGistId(gistId: string): void;
  getGistId(): string | null;
  clear(): void;
}

