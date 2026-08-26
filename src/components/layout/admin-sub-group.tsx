import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdminNavSubGroup } from './admin-nav-types';
import { NavItemButton } from './admin-nav-item';

interface SubGroupProps {
  group: AdminNavSubGroup;
  openGroups: Record<string, boolean>;
  toggleGroup: (title: string) => void;
  isActive: (path: string, exact?: boolean) => boolean;
  onItemClick: (path: string) => void;
}

export const SubGroup: React.FC<SubGroupProps> = ({ group, openGroups, toggleGroup, isActive, onItemClick }) => {
  const subOpen = openGroups[group.title] ?? group.items.some((item) => isActive(item.path, item.exact));
  const subActive = group.items.some((item) => isActive(item.path, item.exact));

  return (
    <div className="space-y-1">
      <button
        onClick={() => toggleGroup(group.title)}
        className="w-full px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
        aria-expanded={subOpen}
      >
        <span className={`${subActive ? 'text-orange-300' : 'text-slate-500'}`}>{group.title}</span>
        <ChevronDown
          className={`inline-block w-3 h-3 ml-1 transition-transform duration-200 ${
            subOpen ? 'rotate-180 text-slate-400' : 'text-slate-600'
          }`}
        />
      </button>

      {subOpen && (
        <div className="space-y-1 ml-1 border-l border-slate-800 pl-2">
          {group.items.map((item) => (
            <NavItemButton
              key={item.path}
              item={item}
              isActive={isActive(item.path, item.exact)}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};