import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { parseQueryParams } from './queryParams';

export interface RouteMatch {
  path: string;
  pattern: string;
  params: Record<string, string>;
  queryParams: Record<string, string>;
}

interface RouterContextType {
  currentPath: string;
  params: Record<string, string>;
  queryParams: Record<string, string>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  activeArea: 'public' | 'user' | 'admin';
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parsePath(pathname: string): { path: string; search: string } {
  const [path, search = ''] = pathname.split('?');
  return { path: path || '/', search };
}

function canonicalizePath(path: string): string {
  return path === '/onboarding' ? '/novo-caso' : path;
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return canonicalizePath(window.location.pathname || '/');
  });

  const [queryParams, setQueryParams] = useState<Record<string, string>>(() => {
    return parseQueryParams(window.location.search);
  });

  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const { path, search } = parsePath(to);
    const canonicalPath = canonicalizePath(path);
    const fullUrl = search ? `${canonicalPath}?${search}` : canonicalPath;

    if (options?.replace) {
      window.history.replaceState(null, '', fullUrl);
    } else {
      window.history.pushState(null, '', fullUrl);
    }

    setCurrentPath(canonicalPath);
    setQueryParams(parseQueryParams(search));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(canonicalizePath(path));
      setQueryParams(parseQueryParams(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const segments = currentPath.split('/').filter(Boolean);
    const newParams: Record<string, string> = {};

    if (segments[0] === 'cases' && segments[1]) {
      newParams.id = segments[1];
      if (segments[2]) newParams.subview = segments[2];
    } else if (segments[0] === 'admin' && segments[1] === 'cases' && segments[2]) {
      newParams.id = segments[2];
    } else if (segments[0] === 'admin' && segments[1] === 'users' && segments[2]) {
      newParams.id = segments[2];
    } else if (segments[0] === 'admin' && segments[1] === 'marketing' && segments[2]) {
      newParams.view = segments[2];
    }

    setParams(newParams);
  }, [currentPath]);

  useEffect(() => {
    if (isLoading) return;

    if (currentPath.startsWith('/admin')) {
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
        return;
      }
      if (!isAdmin) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }

    const protectedUserPaths = ['/dashboard', '/cases', '/perfil', '/configuracoes', '/checkout', '/afiliado', '/affiliate'];
    const isProtectedUserPath = protectedUserPaths.some((p) => currentPath.startsWith(p));

    if (isProtectedUserPath && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }

    if ((currentPath === '/login' || currentPath === '/cadastro') && isAuthenticated) {
      const redirectTarget = queryParams.redirect;
      if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('/login')) {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
      }
    }
  }, [currentPath, isAuthenticated, isAdmin, isLoading, navigate, queryParams.redirect]);

  let activeArea: 'public' | 'user' | 'admin' = 'public';
  if (currentPath.startsWith('/admin')) {
    activeArea = 'admin';
  } else if (
    currentPath.startsWith('/dashboard') ||
    currentPath.startsWith('/cases') ||
    currentPath.startsWith('/perfil') ||
    currentPath.startsWith('/configuracoes') ||
    currentPath.startsWith('/checkout') ||
    currentPath.startsWith('/afiliado') ||
    currentPath.startsWith('/affiliate')
  ) {
    activeArea = 'user';
  }

  return (
    <RouterContext.Provider value={{ currentPath, params, queryParams, navigate, activeArea }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used within a RouterProvider');
  return context;
}