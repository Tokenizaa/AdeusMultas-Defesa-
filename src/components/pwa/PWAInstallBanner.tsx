import React, { useState } from 'react';
import { Download, X, Share, PlusSquare, ShieldCheck, Sparkles, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../pwa/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isIOS, installPWA, dismissPrompt } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isInstallable) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setInstalling(true);
    try {
      await installPWA();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {/* Bottom Floating Bar */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 mb-safe">
        <div className="bg-[#071D41]/95 backdrop-blur-md border border-[#155BCB]/40 text-white rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#155BCB] to-[#071D41] border border-[#FFCD07]/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-[#FFCD07]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate">Instalar DefesAi App</span>
                <span className="text-sm uppercase font-extrabold bg-[#FFCD07] text-[#071D41] px-1.5 py-0.5 rounded-full shrink-0">
                  PWA
                </span>
              </div>
              <p className="text-sm text-slate-300 truncate">
                Acesso rápido, modo offline e recursos com IA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="bg-gradient-to-r from-[#FFCD07] to-[#F5A623] hover:brightness-110 active:scale-95 text-[#071D41] font-bold text-sm px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              {installing ? 'Instalando...' : 'Instalar'}
            </button>
            <button
              onClick={() => dismissPrompt(7)}
              aria-label="Fechar"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#071D41] border border-[#155BCB]/50 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#155BCB]/30 flex items-center justify-center border border-[#FFCD07]/40">
                  <Smartphone className="w-5 h-5 text-[#FFCD07]" />
                </div>
                <h3 className="font-bold text-base text-white">Instalar no iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Para instalar a plataforma DefesAi como aplicativo no Safari:
            </p>

            <div className="space-y-3 bg-[#0C326F]/40 border border-white/10 rounded-xl p-3.5 text-sm text-slate-200">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#155BCB] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <p className="pt-0.5">
                  Toque no botão de <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> na barra inferior do Safari.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#155BCB] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <p className="pt-0.5">
                  Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#FFCD07]" />.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#155BCB] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <p className="pt-0.5">
                  Toque em <strong>Adicionar</strong> no canto superior direito para finalizar.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#155BCB] hover:bg-[#124ba8] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
