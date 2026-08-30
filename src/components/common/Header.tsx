import React from 'react';
import { Shield, FileText, Scale, Bot, CheckCircle2, PlusCircle, FolderLock, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeCaseCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, activeCaseCount }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo - High Density AM badge */}
          <div
            id="brand-logo"
            onClick={() => onSelectTab('onboarding')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white shadow-sm shadow-orange-200 group-hover:scale-105 transition-transform text-sm tracking-tighter">
              AM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">Adeus Multa</span>
                <span className="text-sm font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  CTB & CONTRAN
                </span>
              </div>
            </div>
          </div>

          {/* Main High-Density Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-onboarding"
              onClick={() => onSelectTab('onboarding')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'onboarding'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className={`w-3.5 h-3.5 ${currentTab === 'onboarding' ? 'text-orange-400' : 'text-orange-500'}`} />
              Nova Análise (Grátis)
            </button>

            <button
              id="nav-cases"
              onClick={() => onSelectTab('cases')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'cases'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${currentTab === 'cases' ? 'text-orange-400' : 'text-slate-500'}`} />
              Casos Ativos
              {activeCaseCount > 0 && (
                <span className={`ml-1 text-sm px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  currentTab === 'cases' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {activeCaseCount}
                </span>
              )}
            </button>

            <button
              id="nav-knowledge"
              onClick={() => onSelectTab('knowledge')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'knowledge'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className={`w-3.5 h-3.5 ${currentTab === 'knowledge' ? 'text-orange-400' : 'text-slate-500'}`} />
              Base Jurídica
            </button>

            <button
              id="nav-marketing"
              onClick={() => onSelectTab('marketing')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'marketing'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bot className={`w-3.5 h-3.5 ${currentTab === 'marketing' ? 'text-orange-400' : 'text-purple-500'}`} />
              Marketing OS (7 Agentes)
            </button>

            <button
              id="nav-audit"
              onClick={() => onSelectTab('audit')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'audit'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FolderLock className={`w-3.5 h-3.5 ${currentTab === 'audit' ? 'text-orange-400' : 'text-slate-500'}`} />
              Auditoria & LGPD
            </button>
          </nav>

          {/* Quick CTA - High Density Orange Button */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-sm font-bold rounded border border-green-200 uppercase tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Sistema Operacional
            </span>
            <button
              id="header-cta-button"
              onClick={() => onSelectTab('onboarding')}
              className="px-3.5 py-1.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-md shadow-xs shadow-orange-200 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-tight"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analisar Multa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-slate-50 py-1.5 px-2 text-sm">
        <button
          onClick={() => onSelectTab('onboarding')}
          className={`flex flex-col items-center gap-0.5 p-1 ${currentTab === 'onboarding' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Início</span>
        </button>
        <button
          onClick={() => onSelectTab('cases')}
          className={`flex flex-col items-center gap-0.5 p-1 ${currentTab === 'cases' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Casos ({activeCaseCount})</span>
        </button>
        <button
          onClick={() => onSelectTab('knowledge')}
          className={`flex flex-col items-center gap-0.5 p-1 ${currentTab === 'knowledge' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Leis</span>
        </button>
        <button
          onClick={() => onSelectTab('marketing')}
          className={`flex flex-col items-center gap-0.5 p-1 ${currentTab === 'marketing' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Marketing</span>
        </button>
        <button
          onClick={() => onSelectTab('audit')}
          className={`flex flex-col items-center gap-0.5 p-1 ${currentTab === 'audit' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <FolderLock className="w-3.5 h-3.5" />
          <span>Auditoria</span>
        </button>
      </div>
    </header>
  );
};
