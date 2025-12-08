import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTimer } from './hooks/useTimer';
import { useTasks } from './hooks/useTasks';
import { Timer } from './components/Timer';
import { MiniTimer } from './components/MiniTimer';
import { TaskList } from './components/TaskList';
import './App.css';

interface MonitorInfo {
  name: string;
  position: [number, number];
  size: [number, number];
  scale_factor: number;
  is_primary: boolean;
}

function App() {
  const timer = useTimer();
  const tasks = useTasks();
  const [isWallpaperMode, setIsWallpaperMode] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [showMonitorSelector, setShowMonitorSelector] = useState(false);
  const [selectedMonitorIndex, setSelectedMonitorIndex] = useState<number | null>(null);

  // 初始化时获取桌面背景模式和 mini 模式状态和显示器列表
  useEffect(() => {
    invoke<boolean>('get_wallpaper_mode').then(setIsWallpaperMode).catch(() => {});
    invoke<boolean>('get_mini_mode').then(setIsMiniMode).catch(() => {});
    loadMonitors();
  }, []);

  // 根据桌面背景模式和 mini 模式状态设置 body 和 html 类名
  useEffect(() => {
    if (isWallpaperMode) {
      document.body.classList.add('wallpaper-mode');
      document.documentElement.classList.add('wallpaper-mode');
    } else {
      document.body.classList.remove('wallpaper-mode');
      document.documentElement.classList.remove('wallpaper-mode');
    }
    if (isMiniMode) {
      document.body.classList.add('mini-mode');
      document.documentElement.classList.add('mini-mode');
    } else {
      document.body.classList.remove('mini-mode');
      document.documentElement.classList.remove('mini-mode');
    }
    // 清理函数：组件卸载时移除类名
    return () => {
      document.body.classList.remove('wallpaper-mode');
      document.documentElement.classList.remove('wallpaper-mode');
      document.body.classList.remove('mini-mode');
      document.documentElement.classList.remove('mini-mode');
    };
  }, [isWallpaperMode, isMiniMode]);

  // 加载显示器列表
  const loadMonitors = useCallback(async () => {
    try {
      const monitorList = await invoke<MonitorInfo[]>('get_available_monitors');
      setMonitors(monitorList);
      // 默认选择主显示器
      const primaryIndex = monitorList.findIndex(m => m.is_primary);
      if (primaryIndex !== -1) {
        setSelectedMonitorIndex(primaryIndex);
      }
    } catch (err) {
      console.error('获取显示器列表失败:', err);
    }
  }, []);

  // 切换桌面背景模式
  const toggleWallpaperMode = useCallback(async (monitorIndex?: number) => {
    try {
      const index = monitorIndex !== undefined ? monitorIndex : selectedMonitorIndex;
      const result = await invoke<boolean>('toggle_wallpaper_mode', { 
        monitorIndex: index !== null ? index : undefined 
      });
      setIsWallpaperMode(result);
      setShowMonitorSelector(false);
    } catch (err) {
      console.error('切换桌面背景模式失败:', err);
    }
  }, [selectedMonitorIndex]);

  // 切换 mini 模式
  const toggleMiniMode = useCallback(async () => {
    try {
      const result = await invoke<boolean>('toggle_mini_mode');
      setIsMiniMode(result);
    } catch (err) {
      console.error('切换 mini 模式失败:', err);
    }
  }, []);

  // 显示显示器选择器
  const handleWallpaperButtonClick = useCallback(() => {
    if (isWallpaperMode) {
      // 如果已经是桌面背景模式，直接退出
      toggleWallpaperMode();
    } else {
      // 显示选择器
      setShowMonitorSelector(true);
    }
  }, [isWallpaperMode, toggleWallpaperMode]);

  // 当工作时间结束时，增加当前任务的番茄计数
  useEffect(() => {
    if (timer.mode !== 'work' && timer.timeLeft === timer.totalTime && tasks.activeTaskId) {
      tasks.incrementPomodoro(tasks.activeTaskId);
    }
  }, [timer.mode]);

  // 如果是 mini 模式，只显示 MiniTimer
  if (isMiniMode) {
    return (
      <div className={`app app--${timer.mode} app--mini`}>
        <MiniTimer
          mode={timer.mode}
          timeLeft={timer.timeLeft}
          totalTime={timer.totalTime}
          isRunning={timer.isRunning}
          onExitMini={toggleMiniMode}
        />
      </div>
    );
  }

  return (
    <div className={`app app--${timer.mode} ${isWallpaperMode ? 'app--wallpaper' : ''}`}>
      <div className="app__background">
        <div className="app__gradient" />
        <div className="app__pattern" />
      </div>

      {!isWallpaperMode && (
        <header className="app__header">
          <h1 className="app__logo">
            <span className="app__logo-icon">🍅</span>
            iFocus
          </h1>
          <p className="app__tagline">专注每一刻，成就每一天</p>
          <div className="app__wallpaper-controls">
            <button
              className={`app__wallpaper-btn ${isWallpaperMode ? 'active' : ''}`}
              onClick={handleWallpaperButtonClick}
              title={isWallpaperMode ? '退出桌面背景模式' : '切换为桌面背景'}
            >
              🖼️ {isWallpaperMode ? '退出桌面' : '桌面背景'}
            </button>
            <button
              className={`app__wallpaper-btn ${isMiniMode ? 'active' : ''}`}
              onClick={toggleMiniMode}
              title={isMiniMode ? '退出 mini 模式' : '切换为 mini 模式'}
            >
              📌 {isMiniMode ? '退出 mini' : 'Mini 模式'}
            </button>
            {showMonitorSelector && monitors.length > 0 && (
              <div className="app__monitor-selector">
                <div className="app__monitor-selector-title">选择显示器：</div>
                <div className="app__monitor-list">
                  {monitors.map((monitor, index) => (
                    <button
                      key={index}
                      className={`app__monitor-item ${selectedMonitorIndex === index ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMonitorIndex(index);
                        toggleWallpaperMode(index);
                      }}
                    >
                      {monitor.name} ({monitor.size[0]}×{monitor.size[1]})
                    </button>
                  ))}
                </div>
                <button
                  className="app__monitor-cancel"
                  onClick={() => setShowMonitorSelector(false)}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className="app__main">
        <div className="app__timer-section">
          <Timer
            mode={timer.mode}
            timeLeft={timer.timeLeft}
            totalTime={timer.totalTime}
            isRunning={timer.isRunning}
            completedPomodoros={timer.completedPomodoros}
            autoHourlyMode={timer.autoHourlyMode}
            isWallpaperMode={isWallpaperMode}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onSkip={timer.skipToNext}
            onModeChange={timer.setMode}
            onToggleAutoHourly={timer.toggleAutoHourlyMode}
          />

          {!isWallpaperMode && tasks.activeTask && (
            <div className="app__active-task">
              <span className="app__active-label">当前任务</span>
              <span className="app__active-title">{tasks.activeTask.title}</span>
            </div>
          )}
        </div>

        <div className="app__tasks-section">
          <TaskList
            tasks={tasks.tasks}
            activeTaskId={tasks.activeTaskId}
            onAddTask={tasks.addTask}
            onRemoveTask={tasks.removeTask}
            onToggleComplete={tasks.toggleComplete}
            onSelectTask={tasks.selectTask}
            onClearCompleted={tasks.clearCompleted}
          />
        </div>
      </main>

      <footer className="app__footer">
        <p>基于 Tauri + React + TypeScript 构建</p>
      </footer>
    </div>
  );
}

export default App;
