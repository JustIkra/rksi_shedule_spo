import { useState, FormEvent } from 'react';
import { authApi } from '../api/auth';
import '../styles/pages/LoginPage.css';

interface AdminLoginFormProps {
  onSuccess: () => void;
}

function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.adminLogin({ password });
      localStorage.setItem('token', response.data.access_token);
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        setError('Неверный пароль администратора');
      } else {
        setError('Ошибка входа. Пожалуйста, попробуйте снова.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Панель администратора</h1>
        <p className="login-page__subtitle">Портал плана мероприятий СПО</p>

        <form className="login-page__form" onSubmit={handleSubmit}>
          {error && <div className="login-page__error">{error}</div>}

          <div className="login-page__input-group">
            <label className="login-page__label" htmlFor="admin-password">
              Пароль администратора
            </label>
            <input
              id="admin-password"
              type="password"
              className="login-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль администратора"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="login-page__button"
            disabled={loading || !password}
          >
            {loading ? 'Вход...' : 'Войти в панель администратора'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginForm;
