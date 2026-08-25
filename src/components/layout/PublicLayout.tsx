import React from 'react';
import { AccessibilityBar } from '../common/AccessibilityBar';
import { PrivateHeader } from '../ui/PrivateHeader';
import { PrivateFooter } from '../ui/PrivateFooter';
import { PrivateCookieBanner } from '../ui/PrivateCookieBanner';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      {/* 0. Skip link + Barra de Acessibilidade gov.br / eMAG (atalhos 1/2/3/4) */}
      <AccessibilityBar />

      {/* 1. Cabeçalho Oficial DefesAi (contém nav#main-menu e #main-search existentes) */}
      <div id="menu-navegacao">
        <PrivateHeader />
      </div>

      {/* 2. Conteúdo Principal Acessível */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <div id="conteudo-principal" tabIndex={-1}>
          {children}
        </div>
      </main>

      {/* 3. Rodapé Padrão DefesAi (footer#footer interno) */}
      <div id="rodape">
        <PrivateFooter />
      </div>

      {/* 4. Banner de Cookies e Privacidade LGPD */}
      <PrivateCookieBanner />
    </div>
  );
};
