import { useMemo } from 'react';
import type { TimerMode } from '../types';
import './Timer.css';

interface TimerProps {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  completedPomodoros: number;
  autoHourlyMode: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onModeChange: (mode: TimerMode) => void;
  onToggleAutoHourly: () => void;
}

const MODE_LABELS: Record<TimerMode, string> = {
  work: '专注工作',
  shortBreak: '短休息',
  longBreak: '长休息',
};

const MODE_ICONS: Record<TimerMode, string> = {
  work: '🍅',
  shortBreak: '☕',
  longBreak: '🌴',
};

export function Timer({
  mode,
  timeLeft,
  totalTime,
  isRunning,
  completedPomodoros,
  autoHourlyMode,
  onStart,
  onPause,
  onReset,
  onSkip,
  onModeChange,
  onToggleAutoHourly,
}: TimerProps) {
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const formattedTime = useMemo(() => {
    if (hours > 0) {
      // 超过1小时显示：H:MM:SS
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [hours, minutes, seconds]);

  // 更新页面标题
  useMemo(() => {
    document.title = `${formattedTime} - ${MODE_LABELS[mode]} | iFocus`;
  }, [formattedTime, mode]);

  return (
    <div className={`timer timer--${mode}`}>
      <div className="timer__modes">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            className={`timer__mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => !autoHourlyMode && onModeChange(m)}
            disabled={autoHourlyMode}
          >
            {MODE_ICONS[m]} {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="timer__display">
        <svg className="timer__progress" viewBox="0 0 100 100">
          <circle
            className="timer__progress-bg"
            cx="50"
            cy="50"
            r="45"
          />
          <circle
            className="timer__progress-bar"
            cx="50"
            cy="50"
            r="45"
            style={{
              strokeDasharray: `${2 * Math.PI * 45}`,
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}`,
            }}
          />
        </svg>
        <div className="timer__time">
          <span className="timer__icon">{MODE_ICONS[mode]}</span>
          <span className="timer__digits">{formattedTime}</span>
          <span className="timer__label">{MODE_LABELS[mode]}</span>
        </div>
      </div>

      <div className={`timer__controls ${autoHourlyMode ? 'timer__controls--disabled' : ''}`}>
        {!isRunning ? (
          <button 
            className="timer__btn timer__btn--primary" 
            onClick={onStart}
            disabled={autoHourlyMode}
          >
            ▶ 开始
          </button>
        ) : (
          <button 
            className="timer__btn timer__btn--secondary" 
            onClick={onPause}
            disabled={autoHourlyMode}
          >
            ⏸ 暂停
          </button>
        )}
        <button 
          className="timer__btn timer__btn--ghost" 
          onClick={onReset}
          disabled={autoHourlyMode}
        >
          ↺ 重置
        </button>
        <button 
          className="timer__btn timer__btn--ghost" 
          onClick={onSkip}
          disabled={autoHourlyMode}
        >
          ⏭ 跳过
        </button>
      </div>

      <div className="timer__stats">
        <div className="timer__stat">
          <span className="timer__stat-value">{completedPomodoros}</span>
          <span className="timer__stat-label">已完成番茄</span>
        </div>
        <div className="timer__stat">
          <span className="timer__stat-value">{completedPomodoros * 25}</span>
          <span className="timer__stat-label">专注分钟</span>
        </div>
      </div>

      <div className="timer__auto-hourly">
        <button
          className={`timer__auto-btn ${autoHourlyMode ? 'active' : ''}`}
          onClick={onToggleAutoHourly}
          title="开启后，每半小时自动切换专注/休息（25分钟专注 + 5分钟休息）"
        >
          <span className="timer__auto-icon">⏰</span>
          <span className="timer__auto-text">半点自动</span>
          <span className={`timer__auto-status ${autoHourlyMode ? 'on' : 'off'}`}>
            {autoHourlyMode ? 'ON' : 'OFF'}
          </span>
        </button>
        {autoHourlyMode && (
          <span className="timer__auto-hint">
            每半小时周期：25分钟专注 + 5分钟休息
          </span>
        )}
      </div>
    </div>
  );
}

