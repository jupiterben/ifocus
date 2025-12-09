import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerMode, PomodoroSettings, LongBreakPeriod } from '../types';

// 默认长休息时间段
const DEFAULT_LONG_BREAK_PERIODS: LongBreakPeriod[] = [
  { id: '1', name: '午餐', icon: '🍽️', startTime: '12:00', endTime: '13:00', enabled: true },
  { id: '2', name: '晚餐', icon: '🍜', startTime: '18:00', endTime: '19:00', enabled: true },
  { id: '3', name: '睡觉', icon: '😴', startTime: '23:00', endTime: '07:00', enabled: true },
];

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoHourlyMode: false,
  longBreakPeriods: DEFAULT_LONG_BREAK_PERIODS,
};

// localStorage keys
const STORAGE_KEY = 'ifocus_auto_hourly';
const PERIODS_STORAGE_KEY = 'ifocus_long_break_periods';

export function useTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const savedAuto = localStorage.getItem(STORAGE_KEY);
    const savedPeriods = localStorage.getItem(PERIODS_STORAGE_KEY);
    return {
      ...DEFAULT_SETTINGS,
      autoHourlyMode: savedAuto === 'true',
      longBreakPeriods: savedPeriods ? JSON.parse(savedPeriods) : DEFAULT_LONG_BREAK_PERIODS,
    };
  });
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState<LongBreakPeriod | null>(null);
  
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hourlyCheckRef = useRef<number | null>(null);

  // 获取当前模式的总时长（秒）
  const getTotalTime = useCallback((timerMode: TimerMode) => {
    switch (timerMode) {
      case 'work':
        return settings.workDuration * 60;
      case 'shortBreak':
        return settings.shortBreakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
    }
  }, [settings]);

  // 计算时间段的总时长（秒）
  const getPeriodTotalTime = useCallback((period: LongBreakPeriod | null) => {
    if (!period) return settings.longBreakDuration * 60;
    
    const [startH, startM] = period.startTime.split(':').map(Number);
    const [endH, endM] = period.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // 处理跨午夜的情况
    if (startMinutes > endMinutes) {
      return ((24 * 60 - startMinutes) + endMinutes) * 60;
    }
    return (endMinutes - startMinutes) * 60;
  }, [settings.longBreakDuration]);

  // 检查当前时间是否在长休息时间段内
  const isInLongBreakPeriod = useCallback(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const period of settings.longBreakPeriods) {
      if (!period.enabled) continue;

      const [startH, startM] = period.startTime.split(':').map(Number);
      const [endH, endM] = period.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // 处理跨午夜的情况（如 23:00 - 07:00）
      if (startMinutes > endMinutes) {
        // 跨午夜：当前时间 >= 开始时间 或 当前时间 < 结束时间
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return period;
        }
      } else {
        // 不跨午夜：当前时间在开始和结束之间
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return period;
        }
      }
    }
    return null;
  }, [settings.longBreakPeriods]);

  // 播放提示音
  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT4KQHC4zetPFgI8ntPwp1YVESqk3e+pVRsKIJbT8rphEhInmNfzsWUUDiKU0/OzZRMOIZHQ8rdoFBAhj83ytGsWERuLy/GxaxYRGonI8K9tFxEXh8bwr28YERaGxPCucRkRFIXC8K5yGhEShsHwrnMaERGGwPCvcxsREYbA8K9zGxERhsDwr3MbERGGwPCvcxsREYbA8K9zGxERhsDwrnQbEQ+Hv/CudRsRDoi+8K91GxENib3wrnYbEQyKvPCudhsRC4q78K52GxELirvwrnYaEQuKu/CudhsRC4q78K52GxELirrwr3YaEQuKuvCvdhsRC4q68K92GhELirrwr3YbEQuKuvCvdRsRDIm68K91GxEMibrwrnUbEQ2JufCudRsRDYm58K51GhENibnwrnUbEQ2JufCudRsRDom58K51GhEOibjwrnYaEQ6JuPCudhsRDom48K52GxEOibfwr3YbEQ+It/CvdhsRD4i38K92GxEPiLfwr3YaEQ+It/Cvdh0RD4i38K92HREP');
    }
    audioRef.current.play().catch(() => {});
  }, []);

  // 发送系统通知
  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    playNotificationSound();
  }, [playNotificationSound]);

  // 切换到下一个模式
  const switchMode = useCallback(() => {
    if (mode === 'work') {
      const newCompleted = completedPomodoros + 1;
      setCompletedPomodoros(newCompleted);
      
      // 自动整点模式下，直接切换到休息并继续运行
      if (settings.autoHourlyMode) {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        sendNotification('☕ 休息时间！', '专注结束，休息5分钟~');
        // 保持运行状态
        return;
      }
      
      if (newCompleted % settings.longBreakInterval === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        sendNotification('🎉 长休息时间！', '完成了4个番茄，休息15分钟吧！');
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        sendNotification('☕ 短休息时间！', '休息5分钟，放松一下眼睛~');
      }
    } else {
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      sendNotification('🍅 工作时间！', '开始新的番茄，专注25分钟！');
      
      // 自动整点模式下，继续运行
      if (settings.autoHourlyMode) {
        return;
      }
    }
    setIsRunning(false);
  }, [mode, completedPomodoros, settings, sendNotification]);

  // 计时器逻辑
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      switchMode();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, switchMode]);

  // 根据当前时间获取应该处于的模式和剩余时间
  const getScheduledModeAndTime = useCallback(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // 首先检查是否在长休息时间段内
    const longBreakPeriod = isInLongBreakPeriod();
    if (longBreakPeriod) {
      // 计算距离长休息时间段结束的剩余时间
      const [endH, endM] = longBreakPeriod.endTime.split(':').map(Number);
      const endMinutes = endH * 60 + endM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      let remainingMinutes: number;
      if (endMinutes <= currentMinutes) {
        // 跨午夜情况，结束时间在明天
        remainingMinutes = (24 * 60 - currentMinutes) + endMinutes;
      } else {
        remainingMinutes = endMinutes - currentMinutes;
      }
      
      return {
        mode: 'longBreak' as TimerMode,
        timeLeft: remainingMinutes * 60 - seconds,
        period: longBreakPeriod,
      };
    }
    
    // 每半小时一个周期：0-25分钟专注，25-30分钟休息
    // xx:00-xx:25 专注, xx:25-xx:30 休息
    // xx:30-xx:55 专注, xx:55-xx:00 休息
    const minuteInHalf = minutes % 30; // 0-29
    
    if (minuteInHalf < 25) {
      // 专注时段：计算剩余专注时间
      const remainingMinutes = 25 - minuteInHalf - 1;
      const remainingSeconds = 60 - seconds;
      return {
        mode: 'work' as TimerMode,
        timeLeft: remainingMinutes * 60 + remainingSeconds,
        period: null,
      };
    } else {
      // 休息时段：计算剩余休息时间
      const remainingMinutes = 30 - minuteInHalf - 1;
      const remainingSeconds = 60 - seconds;
      return {
        mode: 'shortBreak' as TimerMode,
        timeLeft: remainingMinutes * 60 + remainingSeconds,
        period: null,
      };
    }
  }, [isInLongBreakPeriod]);

  // 半点自动启动逻辑
  useEffect(() => {
    if (!settings.autoHourlyMode) {
      if (hourlyCheckRef.current) {
        clearInterval(hourlyCheckRef.current);
        hourlyCheckRef.current = null;
      }
      return;
    }

    const checkSchedule = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // 检查是否进入/退出长休息时间段
      const scheduled = getScheduledModeAndTime();
      
      // 如果模式发生变化（进入或退出长休息时间段），更新状态
      if (scheduled.mode !== mode) {
        setMode(scheduled.mode);
        setTimeLeft(scheduled.timeLeft);
        setIsRunning(true);
        
        const timeStr = `${now.getHours()}:${minutes.toString().padStart(2, '0')}`;
        if (scheduled.mode === 'longBreak' && scheduled.period) {
          setCurrentPeriod(scheduled.period);
          const icon = scheduled.period.icon || '🌴';
          sendNotification(`${icon} ${scheduled.period.name}时间`, `${timeStr} - 进入${scheduled.period.name}时段，好好休息~`);
        } else {
          setCurrentPeriod(null);
          if (scheduled.mode === 'work') {
            sendNotification('⏰ 自动专注开始！', `${timeStr} - 开始25分钟专注时段！`);
          } else {
            sendNotification('☕ 自动休息开始！', `${timeStr} - 休息5分钟！`);
          }
        }
        return;
      }
      
      // 整点或半点时刻触发 (xx:00:00 或 xx:30:00)，仅在非长休息时段
      if ((minutes === 0 || minutes === 30) && seconds === 0 && scheduled.mode !== 'longBreak') {
        setMode(scheduled.mode);
        setTimeLeft(scheduled.timeLeft);
        setIsRunning(true);
        
        const timeStr = `${now.getHours()}:${minutes.toString().padStart(2, '0')}`;
        if (scheduled.mode === 'work') {
          sendNotification('⏰ 自动专注开始！', `${timeStr} - 开始25分钟专注时段！`);
        } else {
          sendNotification('☕ 自动休息开始！', `${timeStr} - 休息5分钟！`);
        }
      }
    };

    // 每秒检查一次
    hourlyCheckRef.current = window.setInterval(checkSchedule, 1000);
    
    // 立即同步到当前时间段
    const syncToCurrentPeriod = () => {
      const scheduled = getScheduledModeAndTime();
      setMode(scheduled.mode);
      setTimeLeft(scheduled.timeLeft);
      setIsRunning(true);
      
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (scheduled.mode === 'longBreak' && scheduled.period) {
        setCurrentPeriod(scheduled.period);
        const icon = scheduled.period.icon || '🌴';
        sendNotification(`${icon} ${scheduled.period.name}时间`, `${timeStr} - 当前处于${scheduled.period.name}时段`);
      } else {
        setCurrentPeriod(null);
        if (scheduled.mode === 'work') {
          sendNotification('⏰ 同步专注时段', `${timeStr} - 已同步到当前专注时段`);
        } else {
          sendNotification('☕ 同步休息时段', `${timeStr} - 已同步到当前休息时段`);
        }
      }
    };
    
    syncToCurrentPeriod();

    return () => {
      if (hourlyCheckRef.current) {
        clearInterval(hourlyCheckRef.current);
      }
    };
  }, [settings.autoHourlyMode, getScheduledModeAndTime, sendNotification, mode]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(getTotalTime(mode));
  }, [mode, getTotalTime]);

  const skipToNext = useCallback(() => {
    switchMode();
  }, [switchMode]);

  const setModeManually = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getTotalTime(newMode));
    setIsRunning(false);
  }, [getTotalTime]);

  // 切换自动整点模式
  const toggleAutoHourlyMode = useCallback(() => {
    setSettings(prev => {
      const newValue = !prev.autoHourlyMode;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return { ...prev, autoHourlyMode: newValue };
    });
  }, []);

  // 获取下一个整点时间
  const getNextHourTime = useCallback(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour;
  }, []);

  // 按起始时间排序
  const sortPeriodsByStartTime = (periods: LongBreakPeriod[]) => {
    return [...periods].sort((a, b) => {
      const [aH, aM] = a.startTime.split(':').map(Number);
      const [bH, bM] = b.startTime.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
  };

  // 添加长休息时间段
  const addLongBreakPeriod = useCallback((period: Omit<LongBreakPeriod, 'id'>) => {
    setSettings(prev => {
      const newPeriod: LongBreakPeriod = {
        ...period,
        id: Date.now().toString(),
      };
      const newPeriods = sortPeriodsByStartTime([...prev.longBreakPeriods, newPeriod]);
      localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(newPeriods));
      return { ...prev, longBreakPeriods: newPeriods };
    });
  }, []);

  // 更新长休息时间段
  const updateLongBreakPeriod = useCallback((id: string, updates: Partial<LongBreakPeriod>) => {
    setSettings(prev => {
      const updatedPeriods = prev.longBreakPeriods.map(p =>
        p.id === id ? { ...p, ...updates } : p
      );
      const newPeriods = sortPeriodsByStartTime(updatedPeriods);
      localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(newPeriods));
      return { ...prev, longBreakPeriods: newPeriods };
    });
  }, []);

  // 删除长休息时间段
  const removeLongBreakPeriod = useCallback((id: string) => {
    setSettings(prev => {
      const newPeriods = prev.longBreakPeriods.filter(p => p.id !== id);
      localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(newPeriods));
      return { ...prev, longBreakPeriods: newPeriods };
    });
  }, []);

  // 计算实际的 totalTime（考虑时间段长休息）
  const actualTotalTime = mode === 'longBreak' && currentPeriod 
    ? getPeriodTotalTime(currentPeriod) 
    : getTotalTime(mode);

  return {
    mode,
    timeLeft,
    isRunning,
    completedPomodoros,
    totalTime: actualTotalTime,
    autoHourlyMode: settings.autoHourlyMode,
    longBreakPeriods: settings.longBreakPeriods,
    currentPeriod,
    start,
    pause,
    reset,
    skipToNext,
    setMode: setModeManually,
    toggleAutoHourlyMode,
    getNextHourTime,
    addLongBreakPeriod,
    updateLongBreakPeriod,
    removeLongBreakPeriod,
  };
}
