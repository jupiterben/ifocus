export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  completedPomodoros: number;
  estimatedPomodoros: number;
  isCompleted: boolean;
  createdAt: number;
}

// 长休息时间段配置
export interface LongBreakPeriod {
  id: string;
  name: string;       // 时间段名称，如"午餐"、"睡觉"
  startTime: string;  // 开始时间，格式 "HH:mm"
  endTime: string;    // 结束时间，格式 "HH:mm"
  enabled: boolean;   // 是否启用
}

export interface PomodoroSettings {
  workDuration: number;      // 工作时长（分钟）
  shortBreakDuration: number; // 短休息时长
  longBreakDuration: number;  // 长休息时长
  longBreakInterval: number;  // 长休息间隔（几个番茄后）
  autoHourlyMode: boolean;   // 自动整点模式
  longBreakPeriods: LongBreakPeriod[];  // 长休息时间段列表
}

export interface Statistics {
  totalPomodoros: number;
  totalWorkMinutes: number;
  todayPomodoros: number;
  streak: number;
}

