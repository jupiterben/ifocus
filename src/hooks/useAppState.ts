import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// 与 Rust 端 AppState 对应的类型
export interface AppState {
  mini_mode: boolean;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    mini_mode: false,
  });
  const [loading, setLoading] = useState(true);

  // 初始化：获取状态
  useEffect(() => {
    const init = async () => {
      try {
        const appState = await invoke<AppState>('get_app_state');
        setState(appState);
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

  return {
    // 状态（只读，由服务端管理）
    isMiniMode: state.mini_mode,
    loading,
    
    // 操作（调用服务端 API）
    toggleMiniMode,
  };
}

