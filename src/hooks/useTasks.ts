import { useState, useCallback, useEffect } from 'react';
import type { Task } from '../types';

const STORAGE_KEY = 'ifocus_tasks';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // 保存到 localStorage
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const addTask = useCallback((title: string, estimatedPomodoros: number = 1) => {
    const newTask: Task = {
      id: generateId(),
      title,
      completedPomodoros: 0,
      estimatedPomodoros,
      isCompleted: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
  }, [activeTaskId]);

  const toggleComplete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    );
  }, []);

  const incrementPomodoro = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, completedPomodoros: task.completedPomodoros + 1 }
          : task
      )
    );
  }, []);

  const selectTask = useCallback((id: string | null) => {
    setActiveTaskId(id);
  }, []);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((task) => !task.isCompleted));
  }, []);

  return {
    tasks,
    activeTask,
    activeTaskId,
    addTask,
    removeTask,
    toggleComplete,
    incrementPomodoro,
    selectTask,
    clearCompleted,
  };
}

