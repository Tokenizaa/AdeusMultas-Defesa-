import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { AdminNavItem } from './admin-nav-types';

interface NavItemButtonProps {
  item: AdminNavItem;
  isActive: boolean;
  onClick: (path: string) => void;
}

export const NavItemButton: React.FC<NavItemButtonProps> = ({ item, isActive, onClick }) => {
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
        <Icon
          className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
        />
        <span className="truncate">{item.label}</span>
      </div>
      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
    </button>
  );
};