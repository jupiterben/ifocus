// Tauri 安全存储提供者 - 用于桌面应用
import type { IStorageProvider, GitHubUser } from '../types';

const TOKEN_KEY = 'github_access_token';
const USER_KEY = 'github_user';
const GIST_ID_KEY = 'github_gist_id';

/**
 * Tauri 存储提供者
 * 
 * 未来可以使用 Tauri 的 Store 插件实现更安全的存储：
 * https://github.com/tauri-apps/tauri-plugin-store
 * 
 * 当前实现：使用 localStorage 作为后备方案
 * TODO: 迁移到 @tauri-apps/plugin-store
 */
export class TauriStorageProvider implements IStorageProvider {
  // 注意：这里暂时使用 localStorage
  // 后续可以改用 Tauri Store 插件实现加密存储
  
  setToken(token: string): void {
    // TODO: 使用 Tauri Store 加密存储
    // await Store.set(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    // TODO: 使用 Tauri Store 读取
    // return await Store.get(TOKEN_KEY);
    return localStorage.getItem(TOKEN_KEY);
  }

  setUser(user: GitHubUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser(): GitHubUser | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setGistId(gistId: string): void {
    localStorage.setItem(GIST_ID_KEY, gistId);
  }

  getGistId(): string | null {
    return localStorage.getItem(GIST_ID_KEY);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GIST_ID_KEY);
  }
}

