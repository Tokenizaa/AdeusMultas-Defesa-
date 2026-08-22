import React from 'react';
import {
  LayoutDashboard,
  Folders,
  Users,
  FileText,
  CreditCard,
  Bot,
  Cpu,
  Boxes,
  Sliders,
  HeartPulse,
  Scale,
  FolderLock,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavigate }) => {
  const { currentPath, navigate } = useRouter();
  const { user, logout } = useAuth();

  const handleItemClick = (path: string) => {
    navigate(path);
    if (onNavigate) {
      onNavigate();
    }
  };

  const adminNavGroups = [
    {
      groupTitle: 'Visão Geral',
      items: [
        {
          label: 'Dashboard OS',
          path: '/admin',
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      groupTitle: 'Operação',
      items: [
        {
          label: 'Casos & Autuações',
          path: '/admin/cases',
          icon: Folders,
        },
        {
          label: 'Usuários & Contas',
          path: '/admin/users',
          icon: Users,
        },
        {
          label: 'Documentos & Petições',
          path: '/admin/documents',
          icon: FileText,
        },
        {
          label: 'Pagamentos (PagBank)',
          path: '/admin/payments',
          icon: CreditCard,
        },
      ],
    },
    {
      groupTitle: 'Crescimento',
      items: [
        {
          label: 'Marketing OS (7 Agentes)',
          path: '/admin/marketing',
          icon: Bot,
        },
        {
          label: 'Gestão Comercial',
          path: '/admin/commercial',
          icon: TrendingUp,
        },
      ],
    },
    {
      groupTitle: 'Inteligência',
      items: [
        {
          label: 'IA & Gateway Providers',
          path: '/admin/ai',
          icon: Cpu,
        },
        {
          label: 'Base Jurídica CTB',
          path: '/admin/knowledge',
          icon: Scale,
        },
      ],
    },
    {
      groupTitle: 'Sistema',
      items: [
        {
          label: 'Hub de Integrações',
          path: '/admin/integrations',
          icon: Boxes,
        },
        {
          label: 'Configurações (Settings)',
          path: '/admin/settings',
          icon: Sliders,
        },
        {
          label: 'Monitoramento & Saúde',
          path: '/admin/monitoring',
          icon: HeartPulse,
        },
        {
          label: 'Auditoria & LGPD',
          path: '/admin/audit',
          icon: FolderLock,
        },
      ],
    },
  ];

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact || itemPath === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(itemPath);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-300 select-none">
{/* Admin Brand Header - Fixed at Top of Sidebar */}
       <div className="shrink-0 p-4 border-b border-slate-900 bg-slate-950">
         <div
           onClick={() => handleItemClick('/admin')}
           className="flex items-center gap-2.5 cursor-pointer group p-3"
         >
           <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-white shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform text-sm shrink-0">
             <ShieldAlert className="w-4 h-4 text-white" />
           </div>
           <div className="min-w-0">
             <div className="flex items-center gap-1.5">
               <span className="font-extrabold text-white tracking-tight text-base">DefesAi</span>
               <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
                 OS
               </span>
             </div>
             <p className="text-sm text-slate-500 font-mono truncate">Console Operacional</p>
           </div>
         </div>
       </div>

      {/* Main Admin Navigation - Independent Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {adminNavGroups.map((group) => (
          <div key={group.groupTitle} className="space-y-1">
            <div className="px-3 py-1 text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">
              {group.groupTitle}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);

return (
                 <button
                   key={item.path}
                   id={`admin-nav-${item.path.replace('/admin', '').replace('/', '') || 'dashboard'}`}
                   onClick={() => handleItemClick(item.path)}
                   className={`w-full px-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
                     active
                       ? 'bg-orange-500 text-white shadow-xs font-bold'
                       : 'text-slate-400 hover:text-white hover:bg-slate-900'
                   }`}
                 >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        ))}

        <div className="pt-2 px-1">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: Operacional</span>
            </div>
            <p className="text-slate-400 text-sm font-mono leading-tight">
              Motor Determinístico v1 • 52 teses ativas
            </p>
            <button
              onClick={() => handleItemClick('/dashboard')}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Ver como Condutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Profile & Exit Footer - Fixed at Bottom of Sidebar */}
      <div className="shrink-0 p-3 border-t border-slate-900 bg-slate-950">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="truncate">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'Administrador'}</p>
              <p className="text-sm text-slate-400 truncate font-mono">{user?.email}</p>
            </div>
          </div>

<button
           onClick={() => logout()}
           title="Sair do Modo Admin"
           className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
         >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};