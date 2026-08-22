import React from 'react';
import { Eye, Sun, Moon, Type, HelpCircle, ExternalLink } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

export const PrivateAccessibilityBar: React.FC = () => {
  const {
    isHighContrast,
    toggleHighContrast,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  } = useAccessibility();

  return (
    <div className="bg-[#071D41] text-white text-sm py-1.5 px-4 sm:px-6 lg:px-8 border-b border-[#0C326F]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Atalhos de Teclado (eMAG) */}
        <div className="flex items-center gap-3 font-medium overflow-x-auto py-0.5">
          <a
            href="#main-content"
            className="hover:underline flex items-center gap-1 focus:text-[#FF6B35] outline-none"
            title="Ir para o conteúdo principal (Alt + 1)"
          >
            <span>Ir para o conteúdo</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-[#0C326F] text-[9px] rounded font-mono border border-orange-500">
              1
            </kbd>
          </a>

          <a
            href="#main-menu"
            className="hover:underline flex items-center gap-1 focus:text-[#FF6B35] outline-none"
            title="Ir para o menu (Alt + 2)"
          >
            <span>Ir para o menu</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-[#0C326F] text-[9px] rounded font-mono border border-orange-500">
              2
            </kbd>
          </a>

          <a
            href="#main-search"
            className="hover:underline flex items-center gap-1 focus:text-[#FF6B35] outline-none"
            title="Ir para a busca (Alt + 3)"
          >
            <span>Ir para a busca</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-[#0C326F] text-[9px] rounded font-mono border border-orange-500">
              3
            </kbd>
          </a>

          <a
            href="#footer"
            className="hover:underline flex items-center gap-1 focus:text-[#FF6B35] outline-none"
            title="Ir para o rodapé (Alt + 4)"
          >
            <span>Ir para o rodapé</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-[#0C326F] text-[9px] rounded font-mono border border-orange-500">
              4
            </kbd>
          </a>
        </div>

        {/* Ferramentas de Acessibilidade & Alto Contraste */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-[#0C326F] rounded px-1.5 py-0.5 border border-orange-500">
            <button
              onClick={decreaseFontSize}
              className="px-1.5 py-0.5 hover:text-[#FF6B35] font-bold text-sm cursor-pointer transition-colors"
              title="Diminuir tamanho do texto"
              aria-label="Diminuir tamanho da fonte"
            >
              A-
            </button>
            <button
              onClick={resetFontSize}
              className="px-1.5 py-0.5 hover:text-[#FF6B35] font-bold text-sm cursor-pointer transition-colors"
              title="Tamanho normal do texto"
              aria-label="Redefinir tamanho da fonte"
            >
              A
            </button>
            <button
              onClick={increaseFontSize}
              className="px-1.5 py-0.5 hover:text-[#FF6B35] font-bold text-sm cursor-pointer transition-colors"
              title="Aumentar tamanho do texto"
              aria-label="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>

          <button
            onClick={toggleHighContrast}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              isHighContrast
                ? 'bg-[#FFFF00] text-black border-[#FFFF00] font-bold'
                : 'bg-[#0C326F] hover:bg-[#FF6B35] text-white border-orange-500'
            }`}
            title="Alternar modo de alto contraste"
            aria-label="Alternar modo de alto contraste"
          >
            <Sun className="w-3 h-3" />
            <span className="font-semibold text-sm uppercase">Alto Contraste</span>
          </button>
        </div>
      </div>
    </div>
  );
};

