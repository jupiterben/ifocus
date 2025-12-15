// GitHub 数据同步服务 V2 - 使用抽象的认证层
import { getAuthProvider } from './auth/AuthFactory';
import type { GitHubUser } from './auth/types';

export type { GitHubUser };

export interface SyncData {
  tasks: any[];
  settings: {
    autoHourlyMode: boolean;
    longBreakPeriods: any[];
  };
  lastSync: number;
}

const GIST_FILENAME = 'ifocus-data.json';

/**
 * 获取认证提供者
 */
function getAuth() {
  return getAuthProvider();
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): GitHubUser | null {
  return getAuth().getAuthState().user;
}

/**
 * 获取存储的 token
 */
export function getStoredToken(): string | null {
  return getAuth().getAuthState().token;
}

/**
 * 获取存储的 Gist ID
 */
export function getStoredGistId(): string | null {
  // 这个需要从存储提供者获取，暂时使用 localStorage
  return localStorage.getItem('github_gist_id');
}

/**
 * 存储 Gist ID
 */
function storeGistId(gistId: string): void {
  localStorage.setItem('github_gist_id', gistId);
}

/**
 * 清除认证信息
 */
export function clearAuth(): void {
  getAuth().logout();
}

/**
 * 启动 GitHub OAuth 流程
 */
export async function startGitHubAuth(): Promise<void> {
  await getAuth().startLogin();
}

/**
 * 处理 OAuth 回调
 */
export async function handleOAuthCallback(code: string): Promise<{ token: string; user: GitHubUser }> {
  console.log('📡 handleOAuthCallback 开始处理，code:', code.substring(0, 8) + '...');
  
  try {
    const result = await getAuth().handleCallback(code);
    console.log('✅ OAuth 认证成功，用户:', result.user.login);
    return result;
  } catch (error) {
    console.error('❌ OAuth 回调处理失败:', error);
    throw new Error('OAuth 认证失败，请重试');
  }
}

/**
 * 验证 token 是否有效
 */
export async function validateToken(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) {
    return false;
  }

  return await getAuth().validateToken(token);
}

/**
 * 检查登录状态
 */
export function isLoggedIn(): boolean {
  return getAuth().getAuthState().isLoggedIn;
}

/**
 * 初始化认证（应用启动时调用）
 */
export async function initializeAuth() {
  return await getAuth().initialize();
}

/**
 * 使用 token 进行 GitHub API 调用
 */
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

/**
 * 同步数据到 GitHub Gist
 */
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

/**
 * 从 GitHub Gist 同步数据
 */
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

