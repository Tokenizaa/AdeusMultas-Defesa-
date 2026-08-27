import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { AdminNavSubGroup, AdminNavItem } from './admin-nav-types';
import { NavItemButton } from './admin-nav-item';

interface SubGroupProps {
  group: AdminNavSubGroup;
  openGroups: Record<string, boolean>;
  toggleGroup: (title: string) => void;
  isActive: (path: string, exact?: boolean) => boolean;
  onItemClick: (path: string) => void;
}

export const SubGroup: React.FC<SubGroupProps> = ({ group, openGroups, toggleGroup, isActive, onItemClick }) => {
  const hasItems = (group.items?.length ?? 0) > 0;
  const hasChildren = (group.children?.length ?? 0) > 0;
  const subOpen = openGroups[group.title] ?? (hasItems ? group.items!.some((item) => isActive(item.path, item.exact)) : false);

  const activePaths = [
    ...(hasItems ? group.items!.map((i) => i.path) : []),
    ...(hasChildren ? flattenGroupPaths(group.children!) : []),
  ];
  const subActive = activePaths.some((p) => isActive(p));

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
          {hasItems &&
            group.items!.map((item) => (
              <NavItemButton
                key={item.path}
                item={item}
                isActive={isActive(item.path, item.exact)}
                onClick={onItemClick}
              />
            ))}
          {hasChildren && group.children!.map((child) => (
            <SubGroup
              key={child.title}
              group={child}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              isActive={isActive}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function flattenGroupPaths(groups: AdminNavSubGroup[]): string[] {
  const paths: string[] = [];
  for (const g of groups) {
    if (g.items) paths.push(...g.items.map((i) => i.path));
    if (g.children) paths.push(...flattenGroupPaths(g.children));
  }
  return paths;
}