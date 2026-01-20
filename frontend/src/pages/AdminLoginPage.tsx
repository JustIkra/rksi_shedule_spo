import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

function AdminLoginPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expectedToken = import.meta.env.VITE_ADMIN_URL_TOKEN;

  // Validate URL token
  if (token !== expectedToken) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <h1>Access Denied</h1>
          <p>Invalid admin access URL.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.adminLogin({ password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('adminToken', token || '');
      navigate(`/admin/${token}/panel`);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        setError('Invalid admin password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1>Admin Panel</h1>
        <p>Portal of SPO Events Plan</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/login">Back to public portal</a>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
