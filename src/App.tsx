import { useEffect, useState, useCallback } from 'react';
import { useTimer } from './hooks/useTimer';
import { useTasks } from './hooks/useTasks';
import { useAppState } from './hooks/useAppState';
import { Timer } from './components/Timer';
import { MiniTimer } from './components/MiniTimer';
import { TaskList } from './components/TaskList';
import './App.css';

function App() {
  const timer = useTimer();
  const tasks = useTasks();
  const appState = useAppState();
  
  const [showMonitorSelector, setShowMonitorSelector] = useState(false);
  const [selectedMonitorIndex, setSelectedMonitorIndex] = useState<number | null>(null);

  // 设置默认选择主显示器
  useEffect(() => {
    if (appState.monitors.length > 0 && selectedMonitorIndex === null) {
      const primaryIndex = appState.monitors.findIndex(m => m.is_primary);
      if (primaryIndex !== -1) {
        setSelectedMonitorIndex(primaryIndex);
      }
    }
  }, [appState.monitors, selectedMonitorIndex]);

  // 根据模式状态设置 body 和 html 类名
  useEffect(() => {
    if (appState.isWallpaperMode) {
      document.body.classList.add('wallpaper-mode');
      document.documentElement.classList.add('wallpaper-mode');
    } else {
      document.body.classList.remove('wallpaper-mode');
      document.documentElement.classList.remove('wallpaper-mode');
    }
    if (appState.isMiniMode) {
      document.body.classList.add('mini-mode');
      document.documentElement.classList.add('mini-mode');
    } else {
      document.body.classList.remove('mini-mode');
      document.documentElement.classList.remove('mini-mode');
    }
    return () => {
      document.body.classList.remove('wallpaper-mode', 'mini-mode');
      document.documentElement.classList.remove('wallpaper-mode', 'mini-mode');
    };
  }, [appState.isWallpaperMode, appState.isMiniMode]);

  // 显示显示器选择器
  const handleWallpaperButtonClick = useCallback(() => {
    if (appState.isWallpaperMode) {
      appState.toggleWallpaperMode();
    } else {
      setShowMonitorSelector(true);
    }
  }, [appState]);

  // 选择显示器并切换
  const handleMonitorSelect = useCallback(async (index: number) => {
    setSelectedMonitorIndex(index);
    await appState.toggleWallpaperMode(index);
    setShowMonitorSelector(false);
  }, [appState]);

  // 当工作时间结束时，增加当前任务的番茄计数
  useEffect(() => {
    if (timer.mode !== 'work' && timer.timeLeft === timer.totalTime && tasks.activeTaskId) {
      tasks.incrementPomodoro(tasks.activeTaskId);
    }
  }, [timer.mode]);

  // 加载中
  if (appState.loading) {
    return (
      <div className="app app--loading">
        <div className="app__loader">加载中...</div>
      </div>
    );
  }

  // Mini 模式
  if (appState.isMiniMode) {
    return (
      <div className={`app app--${timer.mode} app--mini`}>
        <MiniTimer
          mode={timer.mode}
          timeLeft={timer.timeLeft}
          totalTime={timer.totalTime}
          isRunning={timer.isRunning}
          onExitMini={appState.toggleMiniMode}
        />
      </div>
    );
  }

  return (
    <div className={`app app--${timer.mode} ${appState.isWallpaperMode ? 'app--wallpaper' : ''}`}>
      <div className="app__background">
        <div className="app__gradient" />
        <div className="app__pattern" />
      </div>

      {!appState.isWallpaperMode && (
        <header className="app__header">
          <h1 className="app__logo">
            <span className="app__logo-icon">🍅</span>
            iFocus
          </h1>
          <p className="app__tagline">专注每一刻，成就每一天</p>
          <div className="app__wallpaper-controls">
            <button
              className={`app__wallpaper-btn ${appState.isWallpaperMode ? 'active' : ''}`}
              onClick={handleWallpaperButtonClick}
              title={appState.isWallpaperMode ? '退出桌面背景模式' : '切换为桌面背景'}
            >
              🖼️ {appState.isWallpaperMode ? '退出桌面' : '桌面背景'}
            </button>
            <button
              className={`app__wallpaper-btn ${appState.isMiniMode ? 'active' : ''}`}
              onClick={appState.toggleMiniMode}
              title={appState.isMiniMode ? '退出 mini 模式' : '切换为 mini 模式'}
            >
              📌 {appState.isMiniMode ? '退出 mini' : 'Mini 模式'}
            </button>
            {showMonitorSelector && appState.monitors.length > 0 && (
              <div className="app__monitor-selector">
                <div className="app__monitor-selector-title">选择显示器：</div>
                <div className="app__monitor-list">
                  {appState.monitors.map((monitor, index) => (
                    <button
                      key={index}
                      className={`app__monitor-item ${selectedMonitorIndex === index ? 'selected' : ''}`}
                      onClick={() => handleMonitorSelect(index)}
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
            isWallpaperMode={appState.isWallpaperMode}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onSkip={timer.skipToNext}
            onModeChange={timer.setMode}
            onToggleAutoHourly={timer.toggleAutoHourlyMode}
          />

          {!appState.isWallpaperMode && tasks.activeTask && (
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
