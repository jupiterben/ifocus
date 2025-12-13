import { useState } from 'react';
import type { LongBreakPeriod } from '../types';
import { PERIOD_ICON_CATEGORIES } from '../types';
import { useGitHubSync } from '../hooks/useGitHubSync';
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
    icon: '🌴',
    startTime: '12:00',
    endTime: '13:00',
  });
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  
  const githubSync = useGitHubSync();

  const handleAddPeriod = () => {
    if (!newPeriod.name.trim()) return;
    onAddPeriod({
      name: newPeriod.name.trim(),
      icon: newPeriod.icon,
      startTime: newPeriod.startTime,
      endTime: newPeriod.endTime,
      enabled: true,
    });
    setNewPeriod({ name: '', icon: '🌴', startTime: '12:00', endTime: '13:00' });
  };

  const handleSelectIcon = (periodId: string | 'new', icon: string) => {
    if (periodId === 'new') {
      setNewPeriod({ ...newPeriod, icon });
    } else {
      onUpdatePeriod(periodId, { icon });
    }
    setEditingIconId(null);
  };

  const handleLogin = async () => {
    try {
      await githubSync.login();
      // OAuth 流程会自动在浏览器中打开，回调会通过 deep-link 处理
    } catch (error) {
      console.error('登录失败:', error);
      alert(`登录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleUpload = async () => {
    try {
      await githubSync.uploadData();
      alert('数据已同步到 GitHub');
    } catch (error) {
      alert(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDownload = async () => {
    if (!confirm('下载云端数据将覆盖本地数据，是否继续？')) return;
    try {
      await githubSync.downloadData(false);
      alert('数据已从 GitHub 同步');
      window.location.reload(); // 重新加载以应用新数据
    } catch (error) {
      alert(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
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
            <h3 className="settings__section-title">🔐 GitHub 数据同步</h3>
            <p className="settings__section-desc">
              使用 GitHub 账号登录，将数据同步到云端，可在多设备间共享
            </p>
            
            {githubSync.isLoggedIn ? (
              <div className="settings__sync-section">
                <div className="settings__user-info">
                  <span>已登录: {githubSync.user?.login}</span>
                  <button className="settings__logout-btn" onClick={githubSync.logout}>
                    登出
                  </button>
                </div>
                <div className="settings__sync-info">
                  <p>最后同步: {formatSyncTime(githubSync.lastSyncTime)}</p>
                  {githubSync.syncError && (
                    <p className="settings__error">错误: {githubSync.syncError}</p>
                  )}
                </div>
                <div className="settings__sync-actions">
                  <button
                    className="settings__sync-btn"
                    onClick={handleUpload}
                    disabled={githubSync.isSyncing}
                  >
                    {githubSync.isSyncing ? '同步中...' : '📤 上传到云端'}
                  </button>
                  <button
                    className="settings__sync-btn"
                    onClick={handleDownload}
                    disabled={githubSync.isSyncing}
                  >
                    {githubSync.isSyncing ? '同步中...' : '📥 从云端下载'}
                  </button>
                </div>
                <p className="settings__sync-hint">
                  提示：数据存储在 GitHub Gist 中，私有且安全
                </p>
              </div>
            ) : (
              <div className="settings__sync-section">
                <p className="settings__section-desc">
                  点击按钮后将在浏览器中打开 GitHub 授权页面，授权后会自动返回应用完成登录。
                </p>
                <button className="settings__sync-btn" onClick={handleLogin}>
                  🔑 使用 GitHub 登录
                </button>
              </div>
            )}
          </section>

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
                  <div className="settings__icon-wrapper">
                    <button
                      className="settings__icon-btn"
                      onClick={() => setEditingIconId(editingIconId === period.id ? null : period.id)}
                      title="选择图标"
                    >
                      {period.icon || '🌴'}
                    </button>
                    {editingIconId === period.id && (
                      <div className="settings__icon-picker">
                        {PERIOD_ICON_CATEGORIES.map((category) => (
                          <div key={category.name} className="settings__icon-category">
                            <span className="settings__icon-category-name">{category.name}</span>
                            <div className="settings__icon-category-icons">
                              {category.icons.map((icon) => (
                                <button
                                  key={icon}
                                  className={`settings__icon-option ${period.icon === icon ? 'active' : ''}`}
                                  onClick={() => handleSelectIcon(period.id, icon)}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
              <div className="settings__icon-wrapper">
                <button
                  className="settings__icon-btn"
                  onClick={() => setEditingIconId(editingIconId === 'new' ? null : 'new')}
                  title="选择图标"
                >
                  {newPeriod.icon}
                </button>
                {editingIconId === 'new' && (
                  <div className="settings__icon-picker">
                    {PERIOD_ICON_CATEGORIES.map((category) => (
                      <div key={category.name} className="settings__icon-category">
                        <span className="settings__icon-category-name">{category.name}</span>
                        <div className="settings__icon-category-icons">
                          {category.icons.map((icon) => (
                            <button
                              key={icon}
                              className={`settings__icon-option ${newPeriod.icon === icon ? 'active' : ''}`}
                              onClick={() => handleSelectIcon('new', icon)}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

