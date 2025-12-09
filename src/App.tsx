import { useEffect, useState } from 'react';
import { useTimer } from './hooks/useTimer';
import { useTasks } from './hooks/useTasks';
import { useAppState } from './hooks/useAppState';
import { Timer } from './components/Timer';
import { MiniTimer } from './components/MiniTimer';
import { TaskList } from './components/TaskList';
import { Settings } from './components/Settings';
import './App.css';

function App() {
  const timer = useTimer();
  const tasks = useTasks();
  const appState = useAppState();
  const [showSettings, setShowSettings] = useState(false);

  // 根据模式状态设置 body 和 html 类名
  useEffect(() => {
    if (appState.isMiniMode) {
      document.body.classList.add('mini-mode');
      document.documentElement.classList.add('mini-mode');
    } else {
      document.body.classList.remove('mini-mode');
      document.documentElement.classList.remove('mini-mode');
    }
    return () => {
      document.body.classList.remove('mini-mode');
      document.documentElement.classList.remove('mini-mode');
    };
  }, [appState.isMiniMode]);

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
          longBreakPeriods={timer.longBreakPeriods}
          onExitMini={appState.toggleMiniMode}
        />
      </div>
    );
  }

  return (
    <div className={`app app--${timer.mode}`}>
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
        <div className="app__mode-controls">
          <button
            className={`app__mode-btn ${appState.isMiniMode ? 'active' : ''}`}
            onClick={appState.toggleMiniMode}
            title={appState.isMiniMode ? '退出 mini 模式' : '切换为 mini 模式'}
          >
            📌 {appState.isMiniMode ? '退出 mini' : 'Mini 模式'}
          </button>
          <button
            className="app__mode-btn"
            onClick={() => setShowSettings(true)}
            title="设置"
          >
            ⚙️ 设置
          </button>
        </div>
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

      {showSettings && (
        <Settings
          longBreakPeriods={timer.longBreakPeriods}
          onAddPeriod={timer.addLongBreakPeriod}
          onUpdatePeriod={timer.updateLongBreakPeriod}
          onRemovePeriod={timer.removeLongBreakPeriod}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
