import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerMode, PomodoroSettings } from '../types';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoHourlyMode: false,
};

// localStorage key
const STORAGE_KEY = 'ifocus_auto_hourly';

export function useTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      ...DEFAULT_SETTINGS,
      autoHourlyMode: saved === 'true',
    };
  });
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  
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
      };
    } else {
      // 休息时段：计算剩余休息时间
      const remainingMinutes = 30 - minuteInHalf - 1;
      const remainingSeconds = 60 - seconds;
      return {
        mode: 'shortBreak' as TimerMode,
        timeLeft: remainingMinutes * 60 + remainingSeconds,
      };
    }
  }, []);

  // 半点自动启动逻辑
  useEffect(() => {
    if (!settings.autoHourlyMode) {
      if (hourlyCheckRef.current) {
        clearInterval(hourlyCheckRef.current);
        hourlyCheckRef.current = null;
      }
      return;
    }

    const checkHalfHourly = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // 整点或半点时刻触发 (xx:00:00 或 xx:30:00)
      if ((minutes === 0 || minutes === 30) && seconds === 0) {
        const scheduled = getScheduledModeAndTime();
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
    hourlyCheckRef.current = window.setInterval(checkHalfHourly, 1000);
    
    // 立即同步到当前时间段
    const syncToCurrentPeriod = () => {
      const scheduled = getScheduledModeAndTime();
      setMode(scheduled.mode);
      setTimeLeft(scheduled.timeLeft);
      setIsRunning(true);
      
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (scheduled.mode === 'work') {
        sendNotification('⏰ 同步专注时段', `${timeStr} - 已同步到当前专注时段`);
      } else {
        sendNotification('☕ 同步休息时段', `${timeStr} - 已同步到当前休息时段`);
      }
    };
    
    syncToCurrentPeriod();

    return () => {
      if (hourlyCheckRef.current) {
        clearInterval(hourlyCheckRef.current);
      }
    };
  }, [settings.autoHourlyMode, getScheduledModeAndTime, sendNotification]);

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

  return {
    mode,
    timeLeft,
    isRunning,
    completedPomodoros,
    totalTime: getTotalTime(mode),
    autoHourlyMode: settings.autoHourlyMode,
    start,
    pause,
    reset,
    skipToNext,
    setMode: setModeManually,
    toggleAutoHourlyMode,
    getNextHourTime,
  };
}
