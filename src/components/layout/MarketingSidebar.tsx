import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  FileText,
  Sparkles,
  CalendarClock,
  Zap,
  Radio,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { NAV_SECTIONS, ViewKey } from '../marketing/MarketingOSView';

interface MarketingSidebarProps {
  onNavigate?: (ViewKey) => void;
}

export const MarketingSidebar: React.FC<MarketingSidebarProps> = ({ onNavigate }) => {
  const { navigate } = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const handleItemClick = (view: ViewKey) => {
    // Update URL query param
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
    navigate(url.toString());
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (view: ViewKey) => {
    // Check if the current view matches the item view
    const url = new URL(window.location.href);
    const currentView = url.searchParams.get('view') as ViewKey || 'dashboard';
    return currentView === view;
  };

  const isGroupActive = (items: { key: ViewKey; description: string; icon: React.ElementType; badge?: string }[]) => {
    return items.some((item) => isActive(item.key));
  };

  return (
    <>
      {NAV_SECTIONS.map((group) => {
        const groupOpen = openGroups[group.group] ?? isGroupActive(group.items);
        const hasActive = isGroupActive(group.items);

        return (
          <div key={group.group} className="space-y-1">
            <button
              onClick={() => toggleGroup(group.group)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-sm font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
              aria-expanded={groupOpen}
            >
              <span className={${hasActive ? 'text-blue-400' : 'text-slate-500'}}>
                {group.group}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${groupOpen ? 'rotate-180 text-slate-400' : 'text-slate-600'`}
              />
            </button>

            {groupOpen && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.key);

                  return (
                    <button
                      key={item.key}
                      id={`marketing-nav-${item.key}`}
                      onClick={() => handleItemClick(item.key)}
                      className={`w-full px-3 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all cursor-pointer ${active
                        ? 'bg-blue-500 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};