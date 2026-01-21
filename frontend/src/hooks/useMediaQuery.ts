import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for responsive design using media queries.
 * Listens to window resize events and returns whether the query matches.
 *
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((mediaQuery: string): boolean => {
    // Check if window is defined (SSR support)
    if (typeof window !== 'undefined') {
      return window.matchMedia(mediaQuery).matches;
    }
    return false;
  }, []);

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    // Handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Modern browsers support addEventListener
    mediaQueryList.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query, getMatches]);

  return matches;
}

/**
 * Predefined breakpoint hooks for common use cases.
 * Based on Bootstrap 5 breakpoints used in the grid system.
 */

/** Mobile devices (< 768px) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** Tablet devices (>= 768px and < 992px) */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 991px)');
}

/** Desktop devices (>= 992px) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 992px)');
}

/** Touch devices detection */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

/** Reduced motion preference */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export default useMediaQuery;
