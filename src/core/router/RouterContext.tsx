import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';

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
  return {
    path: path || '/',
    search,
  };
}

function parseQueryParams(searchStr: string): Record<string, string> {
  if (!searchStr) return {};
  const params: Record<string, string> = {};
  const query = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
  const pairs = query.split('&');
  for (const pair of pairs) {
    const [key, val] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    }
  }
  return params;
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  
  const [queryParams, setQueryParams] = useState<Record<string, string>>(() => {
    return parseQueryParams(window.location.search);
  });
  
  const [params, setParams] = useState<Record<string, string>>({});
  
  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const { path, search } = parsePath(to);
    const fullUrl = search ? `${path}?${search}` : path;
    
    if (options?.replace) {
      window.history.replaceState(null, '', fullUrl);
    } else {
      window.history.pushState(null, '', fullUrl);
    }
    
    setCurrentPath(path);
    setQueryParams(parseQueryParams(search));
  }, []);
  
  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setQueryParams(parseQueryParams(window.location.search));
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Extract Route Parameters (e.g. /cases/:id, /admin/cases/:id)
  useEffect(() => {
    const segments = currentPath.split('/').filter(Boolean);
    const newParams: Record<string, string> = {};
    
    if (segments[0] === 'cases' && segments[1]) {
      newParams.id = segments[1];
      if (segments[2]) {
        newParams.subview = segments[2]; // e.g. analysis, journey
      }
    } else if (segments[0] === 'admin' && segments[1] === 'cases' && segments[2]) {
      newParams.id = segments[2];
    } else if (segments[0] === 'admin' && segments[1] === 'users' && segments[2]) {
      newParams.id = segments[2];
    } else if (segments[0] === 'admin' && segments[1] === 'marketing' && segments[2]) {
      newParams.view = segments[2];
    }
    
    setParams(newParams);
  }, [currentPath]);
  
  // Route Protection & Authorization Guards
  useEffect(() => {
    if (isLoading) return;
    
    // 1. Admin Guard: /admin/* requires Admin role
    if (currentPath.startsWith('/admin')) {
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
        return;
      }
      
      if (!isAdmin) {
        // Logged in as Citizen trying to access /admin -> send to User Dashboard
        navigate('/dashboard', { replace: true });
        return;
      }
    }
    
    // 2. User Guard: /dashboard, /cases, /perfil, /configuracoes requires Authentication
    const protectedUserPaths = ['/dashboard', '/cases', '/perfil', '/configuracoes', '/checkout', '/afiliado', '/affiliate'];
    const isProtectedUserPath = protectedUserPaths.some((p) => currentPath.startsWith(p));
    
    if (isProtectedUserPath && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }
    
    // 3. Login / Cadastro Guard: If already authenticated, redirect to appropriate area
    if ((currentPath === '/login' || currentPath === '/cadastro') && isAuthenticated) {
      const redirectTarget = queryParams.redirect;
      if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('/login')) {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
      }
    }
  }, [currentPath, isAuthenticated, isAdmin, isLoading, navigate, queryParams.redirect]);
  
  // Determine active area
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
    <RouterContext.Provider
      value={{
        currentPath,
        params,
        queryParams,
        navigate,
        activeArea,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
