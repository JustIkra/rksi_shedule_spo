import { shouldLogoutOn401 } from '../api/client';

export const __typecheck_shouldLogoutOn401 = [
  shouldLogoutOn401('/auth/login') === false,
  shouldLogoutOn401('/auth/admin/login') === false,
  shouldLogoutOn401('/events') === true,
  shouldLogoutOn401(undefined) === true,
] as const;

