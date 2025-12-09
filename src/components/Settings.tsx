import { useState } from 'react';
import type { LongBreakPeriod } from '../types';
import './Settings.css';

interface SettingsProps {
  longBreakPeriods: LongBreakPeriod[];
  onAddPeriod: (period: Omit<LongBreakPeriod, 'id'>) => void;
  onUpdatePeriod: (id: string, updates: Partial<LongBreakPeriod>) => void;
  onRemovePeriod: (id: string) => void;
  onClose: () => void;
}

export function Settings({
  longBreakPeriods,
  onAddPeriod,
  onUpdatePeriod,
  onRemovePeriod,
  onClose,
}: SettingsProps) {
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startTime: '12:00',
    endTime: '13:00',
  });

  const handleAddPeriod = () => {
    if (!newPeriod.name.trim()) return;
    onAddPeriod({
      name: newPeriod.name.trim(),
      startTime: newPeriod.startTime,
      endTime: newPeriod.endTime,
      enabled: true,
    });
    setNewPeriod({ name: '', startTime: '12:00', endTime: '13:00' });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings__header">
          <h2 className="settings__title">⚙️ 设置</h2>
          <button className="settings__close" onClick={onClose}>✕</button>
        </div>

        <div className="settings__content">
          <section className="settings__section">
            <h3 className="settings__section-title">🌴 长休息时间段</h3>
            <p className="settings__section-desc">
              在自动模式下，这些时间段内会自动切换为长休息
            </p>

            <div className="settings__periods">
              {longBreakPeriods.map((period) => (
                <div key={period.id} className="settings__period">
                  <label className="settings__period-toggle">
                    <input
                      type="checkbox"
                      checked={period.enabled}
                      onChange={(e) => onUpdatePeriod(period.id, { enabled: e.target.checked })}
                    />
                    <span className="settings__period-slider"></span>
                  </label>
                  <input
                    type="text"
                    className="settings__period-name"
                    value={period.name}
                    onChange={(e) => onUpdatePeriod(period.id, { name: e.target.value })}
                    placeholder="名称"
                  />
                  <input
                    type="time"
                    className="settings__period-time"
                    value={period.startTime}
                    onChange={(e) => onUpdatePeriod(period.id, { startTime: e.target.value })}
                  />
                  <span className="settings__period-separator">至</span>
                  <input
                    type="time"
                    className="settings__period-time"
                    value={period.endTime}
                    onChange={(e) => onUpdatePeriod(period.id, { endTime: e.target.value })}
                  />
                  <button
                    className="settings__period-delete"
                    onClick={() => onRemovePeriod(period.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="settings__add-period">
              <input
                type="text"
                className="settings__period-name"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                placeholder="新时间段名称"
              />
              <input
                type="time"
                className="settings__period-time"
                value={newPeriod.startTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
              />
              <span className="settings__period-separator">至</span>
              <input
                type="time"
                className="settings__period-time"
                value={newPeriod.endTime}
                onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
              />
              <button
                className="settings__add-btn"
                onClick={handleAddPeriod}
                disabled={!newPeriod.name.trim()}
              >
                ➕ 添加
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

