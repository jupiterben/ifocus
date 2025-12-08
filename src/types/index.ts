export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  completedPomodoros: number;
  estimatedPomodoros: number;
  isCompleted: boolean;
  createdAt: number;
}

export interface PomodoroSettings {
  workDuration: number;      // 工作时长（分钟）
  shortBreakDuration: number; // 短休息时长
  longBreakDuration: number;  // 长休息时长
  longBreakInterval: number;  // 长休息间隔（几个番茄后）
}

export interface Statistics {
  totalPomodoros: number;
  totalWorkMinutes: number;
  todayPomodoros: number;
  streak: number;
}

