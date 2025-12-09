export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  completedPomodoros: number;
  estimatedPomodoros: number;
  isCompleted: boolean;
  createdAt: number;
}

// 内置图标分类列表
export const PERIOD_ICON_CATEGORIES = [
  { name: '餐饮', icons: ['🍽️', '🍜', '🍱', '🥗', '☕', '🍵', '🍔', '🍕', '🍰', '🧁'] },
  { name: '睡眠', icons: ['😴', '🛏️', '💤', '🌙', '🌛', '😪', '🌜', '🌚', '💫'] },
  { name: '运动', icons: ['🏃', '🚶', '🧘', '💪', '🏋️', '🚴', '🏊', '⚽', '🎾', '🏸'] },
  { name: '娱乐', icons: ['📚', '📖', '✏️', '💼', '🎮', '🎬', '🎵', '🎧', '📺', '🖥️'] },
  { name: '自然', icons: ['🌴', '🌸', '🌺', '🌻', '🍀', '🌿', '🌳', '🌈', '☀️', '🌤️'] },
  { name: '家居', icons: ['🏠', '🛋️', '🛁', '🚿', '🧹', '🧺'] },
  { name: '交通', icons: ['🚗', '🚌', '✈️', '🚂', '🚶‍♂️', '🛵'] },
  { name: '健康', icons: ['💊', '🏥', '🩺', '💉', '🧘‍♀️', '❤️'] },
  { name: '其他', icons: ['⏰', '🔔', '✨', '🎯', '📝', '✅', '🎁', '🎉', '👨‍👩‍👧', '🐶'] },
] as const;

// 所有图标的扁平列表（用于兼容）
export const PERIOD_ICONS = PERIOD_ICON_CATEGORIES.flatMap(c => c.icons);

// 长休息时间段配置
export interface LongBreakPeriod {
  id: string;
  name: string;       // 时间段名称，如"午餐"、"睡觉"
  icon: string;       // 自定义图标
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

