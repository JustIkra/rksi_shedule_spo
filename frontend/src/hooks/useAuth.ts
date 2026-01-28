import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

interface UseAuthOptions {
  requireAuth?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = true } = options;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      if (requireAuth) navigate('/login');
      return;
    }

    authApi.check()
      .then(res => {
        setIsAuthenticated(res.data.valid);
        setIsAdmin(res.data.is_admin);
        if (!res.data.valid && requireAuth) navigate('/login');
      })
      .catch(() => {
        setIsAuthenticated(false);
        if (requireAuth) navigate('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [requireAuth, navigate]);

  return { isAuthenticated, isAdmin, isLoading };
}
