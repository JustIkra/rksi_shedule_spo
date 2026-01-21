import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import '../styles/pages/LoginPage.css';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ password });
      localStorage.setItem('token', response.data.access_token);
      navigate('/events');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          setError('Неверный пароль');
        } else {
          setError('Ошибка сервера. Попробуйте позже.');
        }
      } else {
        setError('Ошибка соединения. Проверьте интернет.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">Портал плана мероприятий СПО</h1>
        <p className="login-page__subtitle">Введите пароль для входа</p>

        <form className="login-page__form" onSubmit={handleSubmit}>
          {error && <div className="login-page__error">{error}</div>}

          <div className="login-page__input-group">
            <label className="login-page__label" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="login-page__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="login-page__button"
            disabled={loading || !password}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
