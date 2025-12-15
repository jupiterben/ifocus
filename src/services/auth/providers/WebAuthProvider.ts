// Web 服务端认证提供者
import type { IAuthProvider, IStorageProvider, AuthState, AuthResult, GitHubUser } from '../types';

const GITHUB_CLIENT_ID = 'Ov23liZpDAtVMTavdA3s';
// Web 环境使用不同的回调 URL
const GITHUB_REDIRECT_URI = window.location.origin + '/auth/callback';

export class WebAuthProvider implements IAuthProvider {
  private storage: IStorageProvider;
  private backendUrl: string;

  constructor(storage: IStorageProvider, backendUrl: string = '/api') {
    this.storage = storage;
    this.backendUrl = backendUrl;
  }

  async initialize(): Promise<AuthState> {
    const token = this.storage.getToken();
    const user = this.storage.getUser();

    if (!token || !user) {
      return {
        isLoggedIn: false,
        user: null,
        token: null,
      };
    }

    // 验证 token 是否仍然有效
    const isValid = await this.validateToken(token);
    if (!isValid) {
      this.storage.clear();
      return {
        isLoggedIn: false,
        user: null,
        token: null,
      };
    }

    return {
      isLoggedIn: true,
      user,
      token,
    };
  }

  async startLogin(): Promise<void> {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=gist`;
    
    // 在 Web 环境中直接重定向
    window.location.href = authUrl;
  }

  async handleCallback(code: string): Promise<AuthResult> {
    console.log('📡 WebAuthProvider: 处理 OAuth 回调');
    
    try {
      // 调用后端 API 来交换 token
      const response = await fetch(`${this.backendUrl}/auth/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('OAuth 认证失败');
      }

      const result: AuthResult = await response.json();
      
      // 存储 token 和用户信息
      this.storage.setToken(result.token);
      this.storage.setUser(result.user);
      
      console.log('✅ WebAuthProvider: 认证成功');
      
      return result;
    } catch (error) {
      console.error('❌ WebAuthProvider: OAuth 回调处理失败', error);
      throw new Error('OAuth 认证失败，请重试');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'iFocus-App',
        },
      });

      if (!response.ok) {
        return false;
      }

      // 更新用户信息
      const user: GitHubUser = await response.json();
      this.storage.setUser(user);
      return true;
    } catch (error) {
      console.error('验证 token 失败:', error);
      return false;
    }
  }

  logout(): void {
    this.storage.clear();
  }

  getAuthState(): AuthState {
    const token = this.storage.getToken();
    const user = this.storage.getUser();

    return {
      isLoggedIn: !!token,
      user,
      token,
    };
  }
}

