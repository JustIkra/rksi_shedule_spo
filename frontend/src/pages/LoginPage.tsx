import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: '8px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: '32px',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
  } as React.CSSProperties,
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  inputFocus: {
    borderColor: '#667eea',
  } as React.CSSProperties,
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  } as React.CSSProperties,
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
};

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Портал плана мероприятий СПО</h1>
        <p style={styles.subtitle}>Введите пароль для входа</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={{
                ...styles.input,
                ...(inputFocused ? styles.inputFocus : {}),
              }}
              placeholder="Введите пароль"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              ...styles.button,
              ...(loading || !password ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
