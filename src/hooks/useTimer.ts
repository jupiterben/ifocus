import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerMode, PomodoroSettings } from '../types';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
};

export function useTimer() {
  const [settings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return {
    mode,
    timeLeft,
    isRunning,
    completedPomodoros,
    totalTime: getTotalTime(mode),
    start,
    pause,
    reset,
    skipToNext,
    setMode: setModeManually,
  };
}

