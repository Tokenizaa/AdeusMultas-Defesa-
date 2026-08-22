import React from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Share2,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';

interface UserSidebarProps {
  activeCaseCount?: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge: number | null;
  highlight?: boolean;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({ activeCaseCount = 0 }) => {
  const { currentPath, navigate } = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Painel do Cidadão',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Meus Recursos',
      path: '/cases',
      icon: FileText,
      badge: activeCaseCount > 0 ? activeCaseCount : null,
    },
    {
      label: 'Programa de Afiliados',
      path: '/afiliado',
      icon: Share2,
      badge: null,
      highlight: true,
    },
    {
      label: 'Minhas Configurações',
      path: '/perfil', // This will now show the consolidated UserSettingsView
      icon: Settings,
      badge: null,
    },
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === '/dashboard') return currentPath === '/dashboard';
    return currentPath.startsWith(itemPath);
  };

  return (
    <aside className="w-64 bg-white border-r border-[#CCCCCC] flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E6E6E6] bg-slate-50/50">
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#155BCB] flex items-center justify-center font-bold text-white shadow-xs group-hover:scale-105 transition-transform text-sm">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#071D41] tracking-tight text-base">DefesAi</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 text-[#155BCB] border border-blue-200 font-mono">
                Cidadão
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">Portal do Condutor</p>
          </div>
        </div>
      </div>

      {/* Main User Navigation */}
      <div className="p-3 flex-1 space-y-4 overflow-y-auto">
        <div className="px-3 py-1.5 text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">
          Navegação do Cidadão
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

return (
             <button
               key={item.path}
               id={`nav-user-${item.path.replace('/', '')}`}
               onClick={() => navigate(item.path)}
               className={`w-full px-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                 active
                   ? 'bg-[#E7EFFF] text-[#155BCB] font-bold border-l-4 border-[#155BCB]'
                   : item.highlight
                   ? 'bg-blue-50/80 text-[#071D41] hover:bg-blue-100/70'
                   : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
               }`}
             >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${active ? 'text-[#155BCB]' : item.highlight ? 'text-[#155BCB]' : 'text-slate-500'}`}
                />
                <span>{item.label}</span>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 text-[#155BCB]" />}
            </button>
          );
        })}
      </div>

      {/* CTA Button - Nova Análise */}
      <div className="p-3 border-t border-[#CCCCCC]">
        <button
          onClick={() => navigate('/novo-caso')}
          className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs shadow-orange-200"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            <span>Nova Análise</span>
          </div>
        </button>
      </div>

      {/* Link para o Painel Admin caso seja administrador */}
      {isAdmin && (
        <div className="pt-4 mt-4 border-t border-slate-200">
          <div className="px-3 py-1 text-sm font-bold text-purple-700 uppercase tracking-wider font-mono">
            Acesso Governamental
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-700" />
              <span>Console Administrativo</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>
      )}

      {/* User Info & Logout footer */}
      <div className="p-3 border-t border-[#CCCCCC] bg-[#F8F8F8]">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E6E6E6]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#071D41] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#071D41] truncate">{user?.name || 'Condutor'}</p>
              <p className="text-xs font-mono text-[#168821] font-semibold block truncate">
                Conta Verificada
              </p>
            </div>
          </div>

           <button
             onClick={() => logout()}
             className="p-2 text-slate-500 hover:text-red-600 rounded-md cursor-pointer transition-colors"
             title="Sair do sistema"
             aria-label="Sair da conta"
           >
             <LogOut className="w-4 h-4" />
           </button>
         </div>
       </div>
    </aside>
  );
};