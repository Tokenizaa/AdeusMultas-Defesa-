import React from 'react';
import { Sun } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * Barra de acessibilidade padrão GOV.BR / eMAG (atalhos 1/2/3/4) + skip link + ferramentas de acessibilidade.
 * Manual: govbr-technical-manual/06-acessibilidade.md (§6.3.2 Atalhos de Teclado)
 *   1 = conteúdo principal · 2 = menu de navegação · 3 = busca · 4 = rodapé
 */
export const AccessibilityBar: React.FC = () => {
  const {
    isHighContrast,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  } = useAccessibility();

  const atalhos = [
    { href: '#conteudo-principal', label: 'Ir para o conteúdo', tecla: '1' },
    { href: '#menu-navegacao', label: 'Ir para o menu', tecla: '2' },
    { href: '#main-search', label: 'Ir para a busca', tecla: '3' },
    { href: '#rodape', label: 'Ir para o rodapé', tecla: '4' },
  ];

  return (
    <>
      {/* Skip link: primeiro elemento focável da página, visível só com foco */}
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[60] focus:rounded-sm focus:bg-white focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-[#155BCB] focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#155BCB]"
      >
        Pular para o conteúdo principal
      </a>

      {/* Barra gov.br de atalhos e ferramentas de acessibilidade */}
      <nav
        aria-label="Atalhos e ferramentas de acessibilidade"
        className="bg-[#071D41] border-b border-[#0C326F] px-4 sm:px-6 lg:px-8 py-1 text-white text-xs select-none"
      >
        <div className="container-full flex flex-wrap items-center justify-between gap-2">
          {/* Atalhos de Teclado (eMAG) */}
          <ul className="flex items-center gap-x-3 gap-y-1 overflow-x-auto py-0.5 font-medium">
            {atalhos.map(({ href, label, tecla }) => (
              <li key={tecla}>
                <a
                  href={href}
                  title={`${label} (tecla ${tecla})`}
                  className="flex items-center gap-1 hover:underline text-slate-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6B35]"
                >
                  <span>{label}</span>
                  <kbd className="hidden sm:inline-block rounded border border-orange-500/70 bg-[#0C326F] px-1 font-mono text-[9px] text-orange-200">
                    {tecla}
                  </kbd>
                </a>
              </li>
            ))}
          </ul>

          {/* Ferramentas de Acessibilidade: Ajuste de Fonte & Alto Contraste */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5 bg-[#0C326F] rounded px-1 py-0.5 border border-[#155BCB]">
              <button
                type="button"
                onClick={decreaseFontSize}
                className="px-1.5 py-0.5 hover:text-[#FFCD07] font-bold text-xs cursor-pointer transition-colors"
                title="Diminuir tamanho do texto"
                aria-label="Diminuir tamanho da fonte"
              >
                A-
              </button>
              <button
                type="button"
                onClick={resetFontSize}
                className="px-1.5 py-0.5 hover:text-[#FFCD07] font-bold text-xs cursor-pointer transition-colors border-x border-[#155BCB]"
                title="Tamanho normal do texto"
                aria-label="Redefinir tamanho da fonte"
              >
                A
              </button>
              <button
                type="button"
                onClick={increaseFontSize}
                className="px-1.5 py-0.5 hover:text-[#FFCD07] font-bold text-xs cursor-pointer transition-colors"
                title="Aumentar tamanho do texto"
                aria-label="Aumentar tamanho da fonte"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={toggleHighContrast}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer text-xs font-semibold ${
                isHighContrast
                  ? 'bg-[#FFFF00] text-black border-[#FFFF00] font-bold'
                  : 'bg-[#0C326F] hover:bg-[#155BCB] text-white border-[#155BCB]'
              }`}
              title="Alternar modo de alto contraste"
              aria-label="Alternar modo de alto contraste"
            >
              <Sun className="w-3 h-3 text-[#FFCD07]" />
              <span className="hidden sm:inline uppercase font-mono tracking-wider">Alto Contraste</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

