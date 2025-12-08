import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// 与 Rust 端 AppState 对应的类型
export interface AppState {
  wallpaper_mode: boolean;
  mini_mode: boolean;
}

export interface MonitorInfo {
  name: string;
  position: [number, number];
  size: [number, number];
  scale_factor: number;
  is_primary: boolean;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    wallpaper_mode: false,
    mini_mode: false,
  });
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化：获取状态和显示器列表
  useEffect(() => {
    const init = async () => {
      try {
        const [appState, monitorList] = await Promise.all([
          invoke<AppState>('get_app_state'),
          invoke<MonitorInfo[]>('get_available_monitors'),
        ]);
        setState(appState);
        setMonitors(monitorList);
      } catch (err) {
        console.error('初始化状态失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // 监听状态变化事件（服务端单一数据源）
    const unlisten = listen<AppState>('app-state-changed', (event) => {
      setState(event.payload);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // 切换桌面背景模式
  const toggleWallpaperMode = useCallback(async (monitorIndex?: number) => {
    try {
      const newState = await invoke<AppState>('toggle_wallpaper_mode', {
        monitorIndex: monitorIndex !== undefined ? monitorIndex : null,
      });
      setState(newState);
      return newState;
    } catch (err) {
      console.error('切换桌面背景模式失败:', err);
      throw err;
    }
  }, []);

  // 切换 Mini 模式
  const toggleMiniMode = useCallback(async () => {
    try {
      const newState = await invoke<AppState>('toggle_mini_mode');
      setState(newState);
      return newState;
    } catch (err) {
      console.error('切换 Mini 模式失败:', err);
      throw err;
    }
  }, []);

  // 刷新显示器列表
  const refreshMonitors = useCallback(async () => {
    try {
      const monitorList = await invoke<MonitorInfo[]>('get_available_monitors');
      setMonitors(monitorList);
      return monitorList;
    } catch (err) {
      console.error('获取显示器列表失败:', err);
      throw err;
    }
  }, []);

  return {
    // 状态（只读，由服务端管理）
    isWallpaperMode: state.wallpaper_mode,
    isMiniMode: state.mini_mode,
    monitors,
    loading,
    
    // 操作（调用服务端 API）
    toggleWallpaperMode,
    toggleMiniMode,
    refreshMonitors,
  };
}

