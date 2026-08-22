import React, { useState, useEffect } from 'react';
import { Shield, Lock, Check } from 'lucide-react';

export const PrivateCookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem('defesai_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('defesai_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('defesai_cookie_consent', 'essential_only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de Privacidade e Cookies"
      className="fixed bottom-0 inset-x-0 z-50 bg-[#071D41] text-white border-t-2 border-orange-500 p-4 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-4xl">
          <div className="w-8 h-8 rounded-lg bg-[#0C326F] border border-orange-800 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Privacidade e Proteção de Dados (LGPD — Lei nº 13.709/2018)</span>
            </h4>
            <p className="text-sm text-orange-300 leading-relaxed">
              Utilizamos cookies e tecnologias similares estritamente essenciais para garantir a segurança da sessão, acessibilidade e a correta geração das defesas de trânsito.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={handleEssentialOnly}
            className="px-3.5 py-2 rounded-lg bg-[#0C326F] hover:bg-orange-800 text-orange-300 text-sm font-medium cursor-pointer border border-orange-800 transition-colors"
          >
            Apenas Necessários
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-[#0C326F] text-white text-sm font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-orange-400" />
            <span>Aceitar e Continuar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

