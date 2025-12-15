// Tauri 桌面端认证提供者
import type { IAuthProvider, IStorageProvider, AuthState, AuthResult, GitHubUser } from '../types';
import { open } from '@tauri-apps/plugin-shell';

const GITHUB_CLIENT_ID = 'Ov23liZpDAtVMTavdA3s';
const GITHUB_REDIRECT_URI = 'ifocus://auth/callback';

export class TauriAuthProvider implements IAuthProvider {
  private storage: IStorageProvider;

  constructor(storage: IStorageProvider) {
    this.storage = storage;
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
    
    // 在 Tauri 中打开外部浏览器
    await open(authUrl);
  }

  async handleCallback(code: string): Promise<AuthResult> {
    console.log('📡 TauriAuthProvider: 处理 OAuth 回调');
    
    // 调用 Tauri 后端命令来处理 OAuth 回调
    const { invoke } = await import('@tauri-apps/api/core');
    
    try {
      const result = await invoke<{ token: string; user: GitHubUser }>('handle_github_oauth', { code });
      
      // 存储 token 和用户信息
      this.storage.setToken(result.token);
      this.storage.setUser(result.user);
      
      console.log('✅ TauriAuthProvider: 认证成功');
      
      return result;
    } catch (error) {
      console.error('❌ TauriAuthProvider: OAuth 回调处理失败', error);
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

