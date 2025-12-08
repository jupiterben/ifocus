import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTimer } from './hooks/useTimer';
import { useTasks } from './hooks/useTasks';
import { Timer } from './components/Timer';
import { TaskList } from './components/TaskList';
import './App.css';

function App() {
  const timer = useTimer();
  const tasks = useTasks();
  const [isWallpaperMode, setIsWallpaperMode] = useState(false);

  // 初始化时获取桌面背景模式状态
  useEffect(() => {
    invoke<boolean>('get_wallpaper_mode').then(setIsWallpaperMode).catch(() => {});
  }, []);

  // 切换桌面背景模式
  const toggleWallpaperMode = useCallback(async () => {
    try {
      const result = await invoke<boolean>('toggle_wallpaper_mode');
      setIsWallpaperMode(result);
    } catch (err) {
      console.error('切换桌面背景模式失败:', err);
    }
  }, []);

  // 当工作时间结束时，增加当前任务的番茄计数
  useEffect(() => {
    if (timer.mode !== 'work' && timer.timeLeft === timer.totalTime && tasks.activeTaskId) {
      tasks.incrementPomodoro(tasks.activeTaskId);
    }
  }, [timer.mode]);

  return (
    <div className={`app app--${timer.mode} ${isWallpaperMode ? 'app--wallpaper' : ''}`}>
      <div className="app__background">
        <div className="app__gradient" />
        <div className="app__pattern" />
      </div>

      <header className="app__header">
        <h1 className="app__logo">
          <span className="app__logo-icon">🍅</span>
          iFocus
        </h1>
        <p className="app__tagline">专注每一刻，成就每一天</p>
        <button
          className={`app__wallpaper-btn ${isWallpaperMode ? 'active' : ''}`}
          onClick={toggleWallpaperMode}
          title={isWallpaperMode ? '退出桌面背景模式' : '切换为桌面背景'}
        >
          🖼️ {isWallpaperMode ? '退出桌面' : '桌面背景'}
        </button>
      </header>

      <main className="app__main">
        <div className="app__timer-section">
          <Timer
            mode={timer.mode}
            timeLeft={timer.timeLeft}
            totalTime={timer.totalTime}
            isRunning={timer.isRunning}
            completedPomodoros={timer.completedPomodoros}
            autoHourlyMode={timer.autoHourlyMode}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onSkip={timer.skipToNext}
            onModeChange={timer.setMode}
            onToggleAutoHourly={timer.toggleAutoHourlyMode}
          />

          {tasks.activeTask && (
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
