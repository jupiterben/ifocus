import { useEffect } from 'react';
import { useTimer } from './hooks/useTimer';
import { useTasks } from './hooks/useTasks';
import { Timer } from './components/Timer';
import { TaskList } from './components/TaskList';
import './App.css';

function App() {
  const timer = useTimer();
  const tasks = useTasks();

  // 当工作时间结束时，增加当前任务的番茄计数
  useEffect(() => {
    if (timer.mode !== 'work' && timer.timeLeft === timer.totalTime && tasks.activeTaskId) {
      tasks.incrementPomodoro(tasks.activeTaskId);
    }
  }, [timer.mode]);

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
      </header>

      <main className="app__main">
        <div className="app__timer-section">
          <Timer
            mode={timer.mode}
            timeLeft={timer.timeLeft}
            totalTime={timer.totalTime}
            isRunning={timer.isRunning}
            completedPomodoros={timer.completedPomodoros}
            onStart={timer.start}
            onPause={timer.pause}
            onReset={timer.reset}
            onSkip={timer.skipToNext}
            onModeChange={timer.setMode}
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
