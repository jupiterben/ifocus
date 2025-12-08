import { useState } from 'react';
import type { Task } from '../types';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onAddTask: (title: string, estimated: number) => void;
  onRemoveTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onSelectTask: (id: string | null) => void;
  onClearCompleted: () => void;
}

export function TaskList({
  tasks,
  activeTaskId,
  onAddTask,
  onRemoveTask,
  onToggleComplete,
  onSelectTask,
  onClearCompleted,
}: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estimated, setEstimated] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), estimated);
      setNewTaskTitle('');
      setEstimated(1);
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalPomodoros = tasks.reduce((sum, t) => sum + t.completedPomodoros, 0);

  return (
    <div className="task-list">
      <div className="task-list__header">
        <h2>📋 任务列表</h2>
        <span className="task-list__count">{tasks.length} 个任务</span>
      </div>

      <form className="task-list__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="task-list__input"
          placeholder="添加新任务..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <div className="task-list__form-row">
          <label className="task-list__estimate">
            预估番茄数:
            <input
              type="number"
              min="1"
              max="10"
              value={estimated}
              onChange={(e) => setEstimated(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="task-list__add-btn">
            + 添加
          </button>
        </div>
      </form>

      <div className="task-list__items">
        {tasks.length === 0 ? (
          <div className="task-list__empty">
            <span>🌱</span>
            <p>还没有任务，添加一个开始吧！</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.isCompleted ? 'completed' : ''} ${
                activeTaskId === task.id ? 'active' : ''
              }`}
              onClick={() => onSelectTask(task.id === activeTaskId ? null : task.id)}
            >
              <button
                className="task-item__check"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete(task.id);
                }}
              >
                {task.isCompleted ? '✓' : '○'}
              </button>
              
              <div className="task-item__content">
                <span className="task-item__title">{task.title}</span>
                <div className="task-item__progress">
                  <span className="task-item__pomodoros">
                    {Array(task.estimatedPomodoros)
                      .fill(0)
                      .map((_, i) => (
                        <span
                          key={i}
                          className={`task-item__tomato ${
                            i < task.completedPomodoros ? 'filled' : ''
                          }`}
                        >
                          🍅
                        </span>
                      ))}
                  </span>
                  <span className="task-item__count">
                    {task.completedPomodoros}/{task.estimatedPomodoros}
                  </span>
                </div>
              </div>

              <button
                className="task-item__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTask(task.id);
                }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {tasks.length > 0 && (
        <div className="task-list__footer">
          <div className="task-list__summary">
            <span>✅ 已完成 {completedCount}/{tasks.length}</span>
            <span>🍅 共 {totalPomodoros} 个番茄</span>
          </div>
          {completedCount > 0 && (
            <button className="task-list__clear" onClick={onClearCompleted}>
              清除已完成
            </button>
          )}
        </div>
      )}
    </div>
  );
}

