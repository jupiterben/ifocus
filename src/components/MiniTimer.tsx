import { useMemo, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TimerMode } from '../types';
import './MiniTimer.css';

interface MiniTimerProps {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  onExitMini?: () => void;
}

const MODE_LABELS: Record<TimerMode, string> = {
  work: '专注',
  shortBreak: '休息',
  longBreak: '长休',
};

const MODE_ICONS: Record<TimerMode, string> = {
  work: '🍅',
  shortBreak: '☕',
  longBreak: '🌴',
};

export function MiniTimer({
  mode,
  timeLeft,
  totalTime,
  isRunning,
  onExitMini,
}: MiniTimerProps) {
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.ceil(timeLeft / 60);
  const [isFlashing, setIsFlashing] = useState(false);

  const minutesValue = useMemo(() => {
    return minutes;
  }, [minutes]);

  // 检测状态切换并触发闪烁
  useEffect(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => {
      setIsFlashing(false);
    }, 1000); // 闪烁持续1秒
    return () => clearTimeout(timer);
  }, [mode]);

  // 更新页面标题
  useMemo(() => {
    document.title = `${minutesValue}分钟 - ${MODE_LABELS[mode]} | iFocus`;
  }, [minutesValue, mode]);

  const handleDoubleClick = async () => {
    if (onExitMini) {
      onExitMini();
    } else {
      try {
        await invoke('toggle_mini_mode');
      } catch (err) {
        console.error('退出 mini 模式失败:', err);
      }
    }
  };

  return (
    <div 
      className={`mini-timer mini-timer--${mode} ${isFlashing ? 'mini-timer--flashing' : ''}`}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
      title="双击退出 mini 模式"
    >
      {/* 背景进度条 */}
      <div 
        className="mini-timer__progress-bg" 
        style={{ width: `${progress}%` }}
      />
      <div className="mini-timer__content">
        <span className="mini-timer__icon">{MODE_ICONS[mode]}</span>
        <span className="mini-timer__time">
          <span className="mini-timer__time-value">{minutesValue}</span>
          <span className="mini-timer__time-unit">分钟</span>
        </span>
        {isRunning && <span className="mini-timer__indicator">●</span>}
      </div>
    </div>
  );
}

