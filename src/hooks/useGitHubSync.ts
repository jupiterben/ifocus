import { useState, useCallback, useEffect } from 'react';
import {
  startGitHubAuth,
  handleOAuthCallback,
  syncToGitHub,
  syncFromGitHub,
  isLoggedIn,
  getStoredUser,
  clearAuth,
  type GitHubUser,
  type SyncData,
} from '../services/githubSync';
import type { Task } from '../types';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

const STORAGE_KEY_TASKS = 'ifocus_tasks';
const STORAGE_KEY_AUTO_HOURLY = 'ifocus_auto_hourly';
const STORAGE_KEY_PERIODS = 'ifocus_long_break_periods';

export function useGitHubSync() {
  const [user, setUser] = useState<GitHubUser | null>(getStoredUser());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
  }, []);

  // 处理 OAuth 回调的公共逻辑
  const processOAuthCallback = useCallback((url: string) => {
    console.log('🔗 processOAuthCallback 被调用');
    console.log('📥 接收到的 URL:', url);
    
    if (url.startsWith('ifocus://auth/callback')) {
      console.log('✅ URL 匹配 OAuth 回调格式');
      
      try {
        const urlObj = new URL(url.replace('ifocus://', 'http://'));
        const code = urlObj.searchParams.get('code');
        
        console.log('🔑 提取的 code:', code ? code.substring(0, 8) + '...' : 'null');
        
        if (code) {
          console.log('✅ OAuth code 获取成功，开始认证流程...');
          setSyncError(null);
          setIsSyncing(true);
          
          handleOAuthCallback(code)
            .then(({ user: authUser }) => {
              setUser(authUser);
              setIsSyncing(false);
              console.log('🎉 GitHub 登录成功:', authUser.login);
              
              // 显示成功提示
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('登录成功', {
                  body: `欢迎, ${authUser.login || authUser.name}!`,
                });
              }
            })
            .catch((error) => {
              console.error('❌ OAuth 认证失败:', error);
              setSyncError(error instanceof Error ? error.message : '认证失败');
              setIsSyncing(false);
            });
        } else {
          console.error('❌ URL 中没有找到 code 参数，URL:', url);
          setSyncError('OAuth 回调参数错误');
        }
      } catch (error) {
        console.error('❌ 处理 OAuth 回调失败:', error);
        console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
        setSyncError('处理回调失败');
      }
    } else {
      console.warn('⚠️ URL 不匹配 OAuth 回调格式:', url);
    }
  }, []);

  // 监听 OAuth 回调（deep link）
  useEffect(() => {
    let unlistenDeepLink: (() => void) | undefined;

    const setupListeners = async () => {
      // 监听 deep link
      // 注意：single-instance 插件会自动处理 deep-link 转发
      // 所以只需要一个 onOpenUrl 监听器即可
      unlistenDeepLink = await onOpenUrl((urls) => {
        for (const url of urls) {
          console.log('接收到 deep link:', url);
          processOAuthCallback(url);
        }
      });
    };

    setupListeners().catch((error) => {
      console.error('设置监听失败:', error);
    });

    return () => {
      if (unlistenDeepLink) {
        unlistenDeepLink();
      }
    };
  }, [processOAuthCallback]);

  // 登录 - 使用 GitHub OAuth
  const login = useCallback(async () => {
    try {
      setSyncError(null);
      await startGitHubAuth();
      // OAuth 回调会通过 deep-link 自动处理
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '登录失败');
      throw error;
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setLastSyncTime(null);
  }, []);

  // 收集本地数据
  const collectLocalData = useCallback((): SyncData => {
    const tasksStr = localStorage.getItem(STORAGE_KEY_TASKS);
    const autoHourlyStr = localStorage.getItem(STORAGE_KEY_AUTO_HOURLY);
    const periodsStr = localStorage.getItem(STORAGE_KEY_PERIODS);

    return {
      tasks: tasksStr ? JSON.parse(tasksStr) : [],
      settings: {
        autoHourlyMode: autoHourlyStr === 'true',
        longBreakPeriods: periodsStr ? JSON.parse(periodsStr) : [],
      },
      lastSync: Date.now(),
    };
  }, []);

  // 应用同步数据到本地
  const applySyncData = useCallback((data: SyncData) => {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(data.tasks));
    localStorage.setItem(STORAGE_KEY_AUTO_HOURLY, String(data.settings.autoHourlyMode));
    localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(data.settings.longBreakPeriods));
  }, []);

  // 上传数据到 GitHub
  const uploadData = useCallback(async () => {
    if (!isLoggedIn()) {
      throw new Error('请先登录');
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const data = collectLocalData();
      await syncToGitHub(data);
      setLastSyncTime(Date.now());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setSyncError(errorMessage);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [collectLocalData]);

  // 从 GitHub 下载数据
  const downloadData = useCallback(async (merge: boolean = false) => {
    if (!isLoggedIn()) {
      throw new Error('请先登录');
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const remoteData = await syncFromGitHub();
      
      if (!remoteData) {
        throw new Error('云端没有数据');
      }

      if (merge) {
        // 合并策略：保留本地较新的数据
        const localData = collectLocalData();
        const mergedData: SyncData = {
          tasks: [...remoteData.tasks, ...localData.tasks].reduce((acc, task) => {
            const existing = acc.find((t: Task) => t.id === task.id);
            if (!existing || task.createdAt > existing.createdAt) {
              return [...acc.filter((t: Task) => t.id !== task.id), task];
            }
            return acc;
          }, []),
          settings: {
            autoHourlyMode: localData.settings.autoHourlyMode || remoteData.settings.autoHourlyMode,
            longBreakPeriods: [
              ...remoteData.settings.longBreakPeriods,
              ...localData.settings.longBreakPeriods,
            ].reduce((acc, period) => {
              const existing = acc.find((p: any) => p.id === period.id);
              if (!existing) {
                acc.push(period);
              }
              return acc;
            }, []),
          },
          lastSync: Date.now(),
        };
        applySyncData(mergedData);
      } else {
        // 直接覆盖本地数据
        applySyncData(remoteData);
      }

      setLastSyncTime(remoteData.lastSync);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败';
      setSyncError(errorMessage);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [collectLocalData, applySyncData]);

  return {
    user,
    isLoggedIn: isLoggedIn(),
    isSyncing,
    syncError,
    lastSyncTime,
    login,
    logout,
    uploadData,
    downloadData,
  };
}

