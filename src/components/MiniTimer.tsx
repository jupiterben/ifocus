import { useMemo } from 'react';
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
  shortBreak: '短休',
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
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formattedTime = useMemo(() => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [minutes, seconds]);

  // 更新页面标题
  useMemo(() => {
    document.title = `${formattedTime} - ${MODE_LABELS[mode]} | iFocus`;
  }, [formattedTime, mode]);

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
      className={`mini-timer mini-timer--${mode}`} 
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
        <span className="mini-timer__time">{formattedTime}</span>
        <span className="mini-timer__label">{MODE_LABELS[mode]}</span>
        {isRunning && <span className="mini-timer__indicator">●</span>}
      </div>
    </div>
  );
}

