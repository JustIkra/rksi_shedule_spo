import { useState } from 'react';
import { adminApi } from '../../api/admin';

function SettingsPanel() {
  const [publicPassword, setPublicPassword] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [adminPassword, setAdminPassword] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [publicError, setPublicError] = useState<string | null>(null);
  const [publicSuccess, setPublicSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  const handlePublicPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublicError(null);
    setPublicSuccess(null);

    if (publicPassword.newPassword !== publicPassword.confirmPassword) {
      setPublicError('Пароли не совпадают');
      return;
    }

    if (publicPassword.newPassword.length < 4) {
      setPublicError('Пароль должен быть не менее 4 символов');
      return;
    }

    setSavingPublic(true);

    try {
      await adminApi.changePassword(publicPassword.oldPassword, publicPassword.newPassword);
      setPublicSuccess('Публичный пароль успешно изменен');
      setPublicPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setPublicError(error.response?.data?.detail || 'Не удалось изменить пароль');
    } finally {
      setSavingPublic(false);
    }
  };

  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);

    if (adminPassword.newPassword !== adminPassword.confirmPassword) {
      setAdminError('Пароли не совпадают');
      return;
    }

    if (adminPassword.newPassword.length < 6) {
      setAdminError('Пароль администратора должен быть не менее 6 символов');
      return;
    }

    setSavingAdmin(true);

    try {
      await adminApi.changeAdminPassword(adminPassword.oldPassword, adminPassword.newPassword);
      setAdminSuccess('Пароль администратора успешно изменен');
      setAdminPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setAdminError(error.response?.data?.detail || 'Не удалось изменить пароль');
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className="settings-panel">
      <h3>Настройки</h3>

      <div className="settings-section">
        <h4>Изменить пароль публичной части</h4>
        <p className="settings-description">
          Этот пароль используется для общего доступа к просмотру мероприятий.
        </p>

        {publicError && <div className="error-message">{publicError}</div>}
        {publicSuccess && <div className="success-message">{publicSuccess}</div>}

        <form onSubmit={handlePublicPasswordChange}>
          <div className="form-group">
            <label htmlFor="public-old">Текущий пароль</label>
            <input
              id="public-old"
              type="password"
              value={publicPassword.oldPassword}
              onChange={e =>
                setPublicPassword(prev => ({ ...prev, oldPassword: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="public-new">Новый пароль</label>
            <input
              id="public-new"
              type="password"
              value={publicPassword.newPassword}
              onChange={e =>
                setPublicPassword(prev => ({ ...prev, newPassword: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="public-confirm">Подтвердите новый пароль</label>
            <input
              id="public-confirm"
              type="password"
              value={publicPassword.confirmPassword}
              onChange={e =>
                setPublicPassword(prev => ({ ...prev, confirmPassword: e.target.value }))
              }
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={savingPublic}>
            {savingPublic ? 'Сохранение...' : 'Изменить публичный пароль'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h4>Изменить пароль администратора</h4>
        <p className="settings-description">
          Этот пароль используется для доступа к панели администратора.
        </p>

        {adminError && <div className="error-message">{adminError}</div>}
        {adminSuccess && <div className="success-message">{adminSuccess}</div>}

        <form onSubmit={handleAdminPasswordChange}>
          <div className="form-group">
            <label htmlFor="admin-old">Текущий пароль администратора</label>
            <input
              id="admin-old"
              type="password"
              value={adminPassword.oldPassword}
              onChange={e =>
                setAdminPassword(prev => ({ ...prev, oldPassword: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-new">Новый пароль администратора</label>
            <input
              id="admin-new"
              type="password"
              value={adminPassword.newPassword}
              onChange={e =>
                setAdminPassword(prev => ({ ...prev, newPassword: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-confirm">Подтвердите новый пароль администратора</label>
            <input
              id="admin-confirm"
              type="password"
              value={adminPassword.confirmPassword}
              onChange={e =>
                setAdminPassword(prev => ({ ...prev, confirmPassword: e.target.value }))
              }
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={savingAdmin}>
            {savingAdmin ? 'Сохранение...' : 'Изменить пароль администратора'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SettingsPanel;
