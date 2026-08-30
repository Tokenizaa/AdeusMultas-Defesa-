import React, { useState } from 'react';
import { ChevronDown, ShieldAlert, ExternalLink, LogOut } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { ADMIN_NAV_GROUPS } from './admin-nav-groups';
import { SubGroup } from './admin-sub-group';
import type { AdminNavItem } from './admin-nav-types';
import { AdeusMultasLogo } from '../brand/AdeusMultasLogo';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const NavItemButton: React.FC<{ item: AdminNavItem; isActive: boolean; onClick: (path: string) => void }> = ({
  item,
  isActive,
  onClick,
}) => {
  const Icon = item.icon;
  return (
    <button
      id={`admin-nav-${item.path.replace('/admin', '').replace(/[?=]/g, '').replace(/&/g, '').replace(/\//g, '') || 'dashboard'}`}
      onClick={() => onClick(item.path)}
      className={`w-full px-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${
        isActive
          ? 'bg-orange-500 text-white shadow-xs font-bold'
          : 'text-slate-400 hover:text-white hover:bg-slate-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        <span className="truncate">{item.label}</span>
      </div>
      {isActive && <ChevronDown className="w-3.5 h-3.5 text-white shrink-0" />}
    </button>
  );
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavigate }) => {
  const { currentPath, navigate } = useRouter();
  const { user, logout } = useAuth();

  const handleItemClick = (path: string) => {
    navigate(path);
    if (onNavigate) onNavigate();
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Visão Geral': true,
    'Operação': true,
    'Crescimento': true,
    'Inteligência': false,
    'Sistema': false,
    'Operação de Marketing': true,
    'Gestão Comercial (Hub)': true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (itemPath: string, exact?: boolean) => {
    if (exact || itemPath === '/admin') return currentPath === itemPath;
    return currentPath.startsWith(itemPath);
  };

  const isGroupActive = (items: { path: string; exact?: boolean }[]) =>
    items.some((item) => isActive(item.path, item.exact));

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-300 select-none">
      {/* Admin Brand Header */}
      <div className="shrink-0 p-4 border-b border-slate-900 bg-slate-950">
        <div
          onClick={() => handleItemClick('/admin')}
          className="flex items-center cursor-pointer group p-2"
        >
          <AdeusMultasLogo variant="compact" theme="dark" iconSize="md" />
        </div>
      </div>

      {/* Main Admin Navigation */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {ADMIN_NAV_GROUPS.map((group) => {
          const hasItems = group.items && group.items.length > 0;
          const hasChildren = group.children && group.children.length > 0;
          const itemsActive = hasItems ? isGroupActive(group.items) : false;
          const childrenActive = hasChildren
            ? group.children.some((sub) => isGroupActive(sub.items))
            : false;
          const groupOpen = openGroups[group.title] ?? (itemsActive || childrenActive);

          return (
            <div key={group.title} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-sm font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
                aria-expanded={groupOpen}
              >
                <span className={`${itemsActive || childrenActive ? 'text-orange-400' : 'text-slate-500'}`}>
                  {group.title}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    groupOpen ? 'rotate-180 text-slate-400' : 'text-slate-600'
                  }`}
                />
              </button>

              {groupOpen && (
                <div className="space-y-1">
                  {hasItems && (
                    <div className="space-y-1">
                      {group.items!.map((item) => (
                        <NavItemButton
                          key={item.path}
                          item={item}
                          isActive={isActive(item.path, item.exact)}
                          onClick={handleItemClick}
                        />
                      ))}
                    </div>
                  )}

                  {hasChildren && (
                    <div className="space-y-1">
                      {group.children!.map((subGroup) => (
                        <SubGroup
                          key={subGroup.title}
                          group={subGroup}
                          openGroups={openGroups}
                          toggleGroup={toggleGroup}
                          isActive={isActive}
                          onItemClick={handleItemClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

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

      {/* Admin Profile & Exit Footer */}
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
            onClick={logout}
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