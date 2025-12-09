import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
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

const DOUBLE_CLICK_DELAY = 300;

export function MiniTimer({
  mode,
  timeLeft,
  totalTime,
  onExitMini,
}: MiniTimerProps) {
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.ceil(timeLeft / 60);
  const [isFlashing, setIsFlashing] = useState(false);
  const lastClickTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  const minutesValue = useMemo(() => minutes, [minutes]);

  // 计算当天剩余的半小时番茄数
  const remainingPomodoros = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const remainingMinutes = Math.floor((endOfDay.getTime() - now.getTime()) / 1000 / 60);
    return Math.floor(remainingMinutes / 30);
  }, [Math.floor(Date.now() / 60000)]); // 每分钟更新一次

  // 根据剩余数量计算颜色：绿色(多) -> 黄色 -> 橙色(少)
  const remainingColor = useMemo(() => {
    const max = 32; // 16小时工作时间约32个番茄
    const ratio = Math.min(remainingPomodoros / max, 1);
    const hue = 30 + ratio * 90; // 30=橙, 75=黄, 120=绿
    return `hsl(${hue}, 70%, 45%)`;
  }, [remainingPomodoros]);

  useEffect(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 1000);
    return () => clearTimeout(timer);
  }, [mode]);

  useMemo(() => {
    document.title = `${minutesValue}分钟 - ${MODE_LABELS[mode]} | iFocus`;
  }, [minutesValue, mode]);

  // 退出 mini 模式
  const exitMiniMode = useCallback(async () => {
    if (onExitMini) {
      onExitMini();
    } else {
      try {
        await invoke('toggle_mini_mode');
      } catch (err) {
        console.error('退出 mini 模式失败:', err);
      }
    }
  }, [onExitMini]);

  // 处理鼠标按下
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // 检测双击
    if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
      lastClickTimeRef.current = 0;
      isDraggingRef.current = false;
      exitMiniMode();
      return;
    }

    lastClickTimeRef.current = now;
    isDraggingRef.current = true;

    // 立即开始拖动
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error('拖动失败:', err);
    }
    isDraggingRef.current = false;
  }, [exitMiniMode]);

  return (
    <div
      className={`mini-timer mini-timer--${mode} ${isFlashing ? 'mini-timer--flashing' : ''}`}
      onMouseDown={handleMouseDown}
      title="拖动移动，双击退出"
    >
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
        <span className="mini-timer__remaining" title="今日剩余番茄数" style={{ color: remainingColor }}>
          {remainingPomodoros}
        </span>

      </div>
    </div>
  );
}
