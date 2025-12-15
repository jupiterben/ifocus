// LocalStorage 存储提供者 - 用于浏览器环境
import type { IStorageProvider, GitHubUser } from '../types';

const TOKEN_KEY = 'github_access_token';
const USER_KEY = 'github_user';
const GIST_ID_KEY = 'github_gist_id';

export class LocalStorageProvider implements IStorageProvider {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
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

