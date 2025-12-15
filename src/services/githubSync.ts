// GitHub OAuth 和数据同步服务
import { open } from '@tauri-apps/plugin-shell';

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

export interface SyncData {
  tasks: any[];
  settings: {
    autoHourlyMode: boolean;
    longBreakPeriods: any[];
  };
  lastSync: number;
}

// 注意：需要替换为实际的 GitHub OAuth App Client ID
// 创建方法：https://github.com/settings/developers -> New OAuth App
const GITHUB_CLIENT_ID = 'Ov23liZpDAtVMTavdA3s';
const GITHUB_REDIRECT_URI = 'ifocus://auth/callback';
const GIST_FILENAME = 'ifocus-data.json';

// 存储 token
const TOKEN_STORAGE_KEY = 'github_access_token';
const USER_STORAGE_KEY = 'github_user';
const GIST_ID_STORAGE_KEY = 'github_gist_id';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): GitHubUser | null {
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

export function getStoredGistId(): string | null {
  return localStorage.getItem(GIST_ID_STORAGE_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function storeUser(user: GitHubUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function storeGistId(gistId: string): void {
  localStorage.setItem(GIST_ID_STORAGE_KEY, gistId);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(GIST_ID_STORAGE_KEY);
}

// 启动 GitHub OAuth 流程
export async function startGitHubAuth(): Promise<void> {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=gist`;
  
  // 在 Tauri 中打开外部浏览器
  await open(authUrl);
}

// 使用 code 交换 token（通过 Tauri 后端处理）
export async function handleOAuthCallback(code: string): Promise<{ token: string; user: GitHubUser }> {
  console.log('📡 handleOAuthCallback 开始处理，code:', code.substring(0, 8) + '...');
  
  // 调用 Tauri 后端命令来处理 OAuth 回调
  const { invoke } = await import('@tauri-apps/api/core');
  
  try {
    console.log('🔄 正在调用 Tauri 后端 handle_github_oauth 命令...');
    const result = await invoke<{ token: string; user: GitHubUser }>('handle_github_oauth', { code });
    
    console.log('✅ OAuth 认证成功，用户:', result.user.login);
    
    // 存储 token 和用户信息
    storeToken(result.token);
    storeUser(result.user);
    
    console.log('💾 Token 和用户信息已存储');
    
    return result;
  } catch (error) {
    console.error('❌ OAuth 回调处理失败:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: code.substring(0, 8) + '...',
    });
    throw new Error('OAuth 认证失败，请重试');
  }
}

// 使用 token 进行 API 调用
async function githubApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('未登录');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// 创建或更新 Gist
export async function syncToGitHub(data: SyncData): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('未登录');
  }

  const gistId = getStoredGistId();
  const content = JSON.stringify(data, null, 2);

  if (gistId) {
    // 更新现有 Gist
    const response = await githubApiRequest(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('同步失败');
    }
  } else {
    // 创建新 Gist
    const response = await githubApiRequest('https://api.github.com/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: 'iFocus 数据同步',
        public: false,
        files: {
          [GIST_FILENAME]: {
            content,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('创建 Gist 失败');
    }

    const gist = await response.json();
    storeGistId(gist.id);
  }
}

// 从 GitHub 同步数据
export async function syncFromGitHub(): Promise<SyncData | null> {
  const gistId = getStoredGistId();
  if (!gistId) {
    return null;
  }

  const response = await githubApiRequest(`https://api.github.com/gists/${gistId}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('获取数据失败');
  }

  const gist = await response.json();
  const file = gist.files[GIST_FILENAME];

  if (!file) {
    return null;
  }

  return JSON.parse(file.content);
}

// 检查登录状态
export function isLoggedIn(): boolean {
  return !!getStoredToken();
}

// 验证 token 是否有效
export async function validateToken(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'iFocus-App',
      },
    });

    if (!response.ok) {
      // Token 无效，清除存储
      clearAuth();
      return false;
    }

    // Token 有效，更新用户信息
    const user: GitHubUser = await response.json();
    storeUser(user);
    return true;
  } catch (error) {
    console.error('验证 token 失败:', error);
    return false;
  }
}

