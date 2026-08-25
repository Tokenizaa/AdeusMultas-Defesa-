import React, { useState } from 'react';
import { UserSidebar } from './UserSidebar';
import { UserHeader } from './UserHeader';
import { AccessibilityBar } from '../common/AccessibilityBar';
import { PrivateFooter } from '../ui/PrivateFooter';
import { PrivateCookieBanner } from '../ui/PrivateCookieBanner';
import { LayoutDashboard, FileText, PlusCircle, User, Settings, X } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';

interface UserLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  activeCaseCount?: number;
}

export const UserLayout: React.FC<UserLayoutProps> = ({
  children,
  pageTitle,
  pageSubtitle,
  activeCaseCount = 0,
}) => {
  const { currentPath, navigate } = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground overflow-x-clip">
      {/* Skip link + Barra de Acessibilidade gov.br / eMAG (atalhos 1/2/3/4) */}
      <AccessibilityBar />

      <div className="flex-1 flex min-w-0">
        {/* Desktop Sidebar (alvo do atalho 2) */}
        <div className="hidden md:block" id="menu-navegacao">
          <UserSidebar activeCaseCount={activeCaseCount} />
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-[#071D41]/60 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-[51]">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
              <UserSidebar activeCaseCount={activeCaseCount} />
            </div>
          </div>
        )}

        {/* Main Content Flow */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
          <UserHeader
            onToggleMobileMenu={() => setMobileDrawerOpen(true)}
            pageTitle={pageTitle}
            pageSubtitle={pageSubtitle}
          />

          <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 container-full w-full outline-none">
            <div id="conteudo-principal" tabIndex={-1}>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#CCCCCC] px-4 pt-3 flex items-center justify-around text-sm font-semibold text-slate-600 shadow-lg bottom-nav-safe">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center gap-0.5 p-2 ${
            currentPath === '/dashboard' ? 'text-[#155BCB] font-bold' : ''
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Início</span>
        </button>

        <button
          onClick={() => navigate('/cases')}
          className={`flex flex-col items-center gap-0.5 p-2 ${
            currentPath.startsWith('/cases') ? 'text-[#155BCB] font-bold' : ''
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Meus Casos</span>
        </button>

        <button
          onClick={() => navigate('/novo-caso')}
          className="flex flex-col items-center gap-0.5 p-2 text-[#155BCB] font-bold"
        >
          <div className="w-6 h-6 rounded-full bg-[#155BCB] text-white flex items-center justify-center -mt-2 shadow-xs">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span>Análise</span>
        </button>

        <button
          onClick={() => navigate('/perfil')}
          className={`flex flex-col items-center gap-0.5 p-2 ${
            currentPath === '/perfil' ? 'text-[#155BCB] font-bold' : ''
          }`}
        >
          <User className="w-4 h-4" />
          <span>Perfil</span>
        </button>

        <button
          onClick={() => navigate('/configuracoes')}
          className={`flex flex-col items-center gap-0.5 p-2 ${
            currentPath === '/configuracoes' ? 'text-[#155BCB] font-bold' : ''
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </div>

      {/* Rodapé (alvo do atalho 3; footer#footer interno) */}
      <div id="rodape">
        <PrivateFooter />
      </div>
      <PrivateCookieBanner />
    </div>
  );
};
