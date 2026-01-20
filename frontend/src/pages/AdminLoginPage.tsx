import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.adminLogin({ password });
      localStorage.setItem('token', response.data.access_token);
      navigate('/admin/panel');
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
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1>Панель администратора</h1>
        <p>Портал плана мероприятий СПО</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Пароль администратора</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль администратора"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Вход...' : 'Войти в панель администратора'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/login">Вернуться к публичному порталу</a>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
