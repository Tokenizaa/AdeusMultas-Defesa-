import React from 'react';
import { PlusCircle, Sparkles, LogOut, Shield, Menu } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { NotificationBellDropdown } from '../notifications/NotificationBellDropdown';

interface UserHeaderProps {
  onToggleMobileMenu?: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  onToggleMobileMenu,
  pageTitle = 'Painel do Condutor',
  pageSubtitle = 'Acompanhe seus recursos e prazos perante os órgãos de trânsito',
}) => {
  const { navigate } = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-[#CCCCCC] h-14 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="text-sm sm:text-base font-bold text-[#071D41] leading-tight">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-600 font-medium hidden sm:block">
            {pageSubtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          id="user-header-new-case"
          onClick={() => navigate('/novo-caso')}
          className="px-3.5 py-1.5 text-sm font-bold text-white bg-[#155BCB] hover:bg-[#0C326F] rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nova Análise Gratuita</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Real-time Push & In-App Notification Center */}
        <NotificationBellDropdown />

        <div
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#071D41] text-white flex items-center justify-center font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline truncate max-w-[120px]">
            {user?.name || 'Condutor'}
          </span>
        </div>
      </div>
    </header>
  );
};
