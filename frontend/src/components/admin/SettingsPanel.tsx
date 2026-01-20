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
      setPublicError('Passwords do not match');
      return;
    }

    if (publicPassword.newPassword.length < 4) {
      setPublicError('Password must be at least 4 characters');
      return;
    }

    setSavingPublic(true);

    try {
      await adminApi.changePassword(publicPassword.oldPassword, publicPassword.newPassword);
      setPublicSuccess('Public password changed successfully');
      setPublicPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setPublicError(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingPublic(false);
    }
  };

  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);

    if (adminPassword.newPassword !== adminPassword.confirmPassword) {
      setAdminError('Passwords do not match');
      return;
    }

    if (adminPassword.newPassword.length < 6) {
      setAdminError('Admin password must be at least 6 characters');
      return;
    }

    setSavingAdmin(true);

    try {
      await adminApi.changeAdminPassword(adminPassword.oldPassword, adminPassword.newPassword);
      setAdminSuccess('Admin password changed successfully');
      setAdminPassword({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setAdminError(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className="settings-panel">
      <h3>Settings</h3>

      <div className="settings-section">
        <h4>Change Public Password</h4>
        <p className="settings-description">
          This password is used for general access to view events.
        </p>

        {publicError && <div className="error-message">{publicError}</div>}
        {publicSuccess && <div className="success-message">{publicSuccess}</div>}

        <form onSubmit={handlePublicPasswordChange}>
          <div className="form-group">
            <label htmlFor="public-old">Current Password</label>
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
            <label htmlFor="public-new">New Password</label>
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
            <label htmlFor="public-confirm">Confirm New Password</label>
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
            {savingPublic ? 'Saving...' : 'Change Public Password'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h4>Change Admin Password</h4>
        <p className="settings-description">
          This password is used for admin panel access.
        </p>

        {adminError && <div className="error-message">{adminError}</div>}
        {adminSuccess && <div className="success-message">{adminSuccess}</div>}

        <form onSubmit={handleAdminPasswordChange}>
          <div className="form-group">
            <label htmlFor="admin-old">Current Admin Password</label>
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
            <label htmlFor="admin-new">New Admin Password</label>
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
            <label htmlFor="admin-confirm">Confirm New Admin Password</label>
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
            {savingAdmin ? 'Saving...' : 'Change Admin Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SettingsPanel;
