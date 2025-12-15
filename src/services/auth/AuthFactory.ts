// 认证工厂 - 根据环境创建对应的认证提供者
import type { IAuthProvider } from './types';
import { TauriAuthProvider } from './providers/TauriAuthProvider';
import { WebAuthProvider } from './providers/WebAuthProvider';
import { LocalStorageProvider } from './storage/LocalStorageProvider';
import { TauriStorageProvider } from './storage/TauriStorageProvider';

/**
 * 检测是否在 Tauri 环境中运行
 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * 创建适合当前环境的认证提供者
 * 
 * @param backendUrl - Web 环境下的后端 API URL（可选）
 * @returns 认证提供者实例
 */
export function createAuthProvider(backendUrl?: string): IAuthProvider {
  if (isTauriEnvironment()) {
    console.log('🖥️ 检测到 Tauri 环境，使用 TauriAuthProvider');
    const storage = new TauriStorageProvider();
    return new TauriAuthProvider(storage);
  } else {
    console.log('🌐 检测到 Web 环境，使用 WebAuthProvider');
    const storage = new LocalStorageProvider();
    return new WebAuthProvider(storage, backendUrl);
  }
}

/**
 * 单例模式的认证提供者
 */
let authProviderInstance: IAuthProvider | null = null;

/**
 * 获取全局认证提供者实例
 */
export function getAuthProvider(backendUrl?: string): IAuthProvider {
  if (!authProviderInstance) {
    authProviderInstance = createAuthProvider(backendUrl);
  }
  return authProviderInstance;
}

/**
 * 重置认证提供者（主要用于测试）
 */
export function resetAuthProvider(): void {
  authProviderInstance = null;
}

