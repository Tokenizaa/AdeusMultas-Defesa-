import React from 'react';
import { AccessibilityBar } from '../common/AccessibilityBar';
import { PrivateHeader } from '../ui/PrivateHeader';
import { PrivateFooter } from '../ui/PrivateFooter';
import { PrivateCookieBanner } from '../ui/PrivateCookieBanner';

interface PublicLayoutProps {
  children: React.ReactNode;
}

// overflow-x: clip — contenção de scroll horizontal em viewports pequenos.
// Justificativa documentada (overflow linear pré-existente ~1440px, origem em
// w-full + flex min-width:auto de conteúdo não-encolhível). Scroll horizontal
// nunca é UX desejada em app responsivo; clip (≠ hidden) não cria scroll
// container nem quebra sticky positioning. Aditivo: nenhuma funcionalidade
// removida, apenas previne o "scroll fantasma" lateral.
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground overflow-x-clip">
      {/* 0. Skip link + Barra de Acessibilidade gov.br / eMAG (atalhos 1/2/3/4) */}
      <AccessibilityBar />

      {/* 1. Cabeçalho Oficial DefesAi (contém nav#main-menu e #main-search existentes) */}
      <div id="menu-navegacao" className="min-w-0">
        <PrivateHeader />
      </div>

      {/* 2. Conteúdo Principal Acessível */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none min-w-0">
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
