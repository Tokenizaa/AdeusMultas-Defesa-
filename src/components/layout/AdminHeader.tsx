import React from 'react';
import { ShieldAlert, Activity, Cpu, LogOut, Menu, ExternalLink, ChevronRight, Home } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { NotificationBellDropdown } from '../notifications/NotificationBellDropdown';

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
  pageTitle = 'Console Administrativo',
  pageSubtitle = 'Monitoramento de casos, teses, marketing e conformidade',
}) => {
  const { currentPath, navigate, params } = useRouter();
  const { user, logout } = useAuth();

  // Generate breadcrumbs from currentPath
  const getBreadcrumbs = () => {
    const segments = currentPath.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: 'Admin', path: '/admin' }];

    if (segments.length > 1) {
      const section = segments[1];
      const sectionLabels: Record<string, string> = {
        cases: 'Casos & Autuações',
        users: 'Usuários',
        documents: 'Documentos & Petições',
        payments: 'Pagamentos',
        marketing: 'Marketing OS',
        ai: 'IA & Providers',
        integrations: 'Integrações',
        settings: 'Configurações',
        logs: 'Logs Estruturados',
        monitoring: 'Monitoramento & Saúde',
        knowledge: 'Base Jurídica CTB',
        audit: 'Auditoria & LGPD',
      };

      crumbs.push({
        label: sectionLabels[section] || section,
        path: `/admin/${section}`,
      });

      if (segments.length > 2) {
        crumbs.push({
          label: params.id ? `Item #${params.id.substring(0, 10)}` : segments[2],
          path: currentPath,
        });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-sm text-white border-b border-slate-800 min-h-14 px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-slate-500 font-mono mb-0.5">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-slate-600" />}
                  {isLast ? (
                    <span className="text-orange-400 font-bold">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight font-mono tracking-tight">
              {pageTitle}
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase font-mono">
              Admin
            </span>
          </div>
          <p className="text-sm text-slate-400 font-medium hidden md:block">
            {pageSubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-sm font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>API 200 OK</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">NVIDIA / 9Router</span>
        </div>

        {/* Real-time Push & System Notification Center */}
        <NotificationBellDropdown />

        <button
          onClick={() => navigate('/dashboard')}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-800"
          title="Alternar para o fluxo do motorista"
        >
          <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">Visão do Usuário</span>
        </button>

        <button
          onClick={() => logout()}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
