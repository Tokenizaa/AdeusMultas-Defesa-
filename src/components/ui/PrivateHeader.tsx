import React, { useState } from 'react';
import {
  Menu,
  X,
  Search,
  LogIn,
  User,
  Shield,
  FileText,
  HelpCircle,
  Scale,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';

export const PrivateHeader: React.FC = () => {
  const { navigate, currentPath } = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/novo-caso');
    }
  };

  return (
    <header className="w-full bg-white border-b border-[#CCCCCC] relative z-40">
      {/* 1. Barra Institucional DefesAi */}
      <div className="bg-[#071D41] text-white py-1 px-4 sm:px-6 lg:px-8 text-sm border-b border-[#0C326F]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold tracking-wider text-sm flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
              DEFESAI
            </span>
            <span className="hidden sm:inline text-orange-300 text-sm">
              Sistema de Defesa Autônoma
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-orange-200">
            <a
              href="/"
              className="hover:underline hidden md:inline"
            >
              Página Inicial
            </a>
            <a
              href="/novo-caso"
              className="hover:underline hidden sm:inline"
            >
              Análise Gratuita
            </a>
            <a
              href="/knowledge"
              className="hover:underline"
            >
              Base Jurídica
            </a>
          </div>
        </div>
      </div>

      {/* 2. Cabeçalho Principal do Sistema (Logo DefesAi + Nome do Serviço + Busca + Login) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Lado Esquerdo: Menu Hambúrguer + Logo DefesAi + Título */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-[#071D41] hover:bg-slate-100 focus:ring-2 focus-ring-[#FF6B35] cursor-pointer"
              aria-label="Abrir menu de navegação"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo Oficial DefesAi */}
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="flex items-center font-extrabold text-2xl tracking-tighter text-[#071D41] font-sans">
                <span>Defe</span>
                <span className="text-orange-500">s</span>
                <span className="text-[#168821]">Ai</span>
              </div>

              <div className="h-6 w-px bg-slate-300 hidden sm:block" />

              <div>
                <h1 className="text-sm sm:text-base font-bold text-[#071D41] tracking-tight flex items-center gap-1.5">
                  <span>Adeus</span>
                  <span className="text-orange-500">Multa</span>
                  <span className="text-sm font-bold font-mono px-1.5 py-0.2 bg-orange-50 text-orange-100 border border-orange-200 rounded">
                    CTB • CONTRAN
                  </span>
                </h1>
                <p className="text-sm text-slate-600 hidden md:block">
                  Plataforma de Defesa Autônoma para Multas de Trânsito
                </p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Busca Global (Alt + 3) + Botão de Ação Primária */}
          <div className="flex items-center gap-3">
            {/* Campo de Busca DefesAi */}
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-64">
              <input
                id="main-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar serviços ou infrações..."
                className="w-full bg-[#F8F8F8] border border-[#CCCCCC] rounded-full py-1.5 pl-3.5 pr-8 text-sm text-slate-800 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="absolute right-2.5 text-slate-500 hover:text-orange-500 cursor-pointer"
                aria-label="Executar busca"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Ação Primária: Iniciar Análise Gratuita */}
            <button
              onClick={() => navigate('/novo-caso')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFCD07]" />
              <span>Análise Gratuita</span>
            </button>

            {/* Usuário Autenticado */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
                  className="px-3 py-1.5 bg-[#071D41] hover:bg-[#0C326F] text-white rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                </button>

                <button
                  onClick={() => logout()}
                  className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg cursor-pointer"
                  title="Sair da conta"
                  aria-label="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-login-defesai"
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-[#071D41] hover:bg-[#0C326F] text-white rounded-full text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs border border-[#0C326F]"
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#071D41] font-extrabold text-[9px]">
                  D
                </div>
                <span>Acessar Conta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Menu Retrátil Lateral (Off-canvas / Drawer - Alt + 2) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          <nav
            id="main-menu"
            className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto"
            aria-label="Navegação Principal do Sistema"
          >
            {/* Topo do Menu */}
            <div className="p-4 bg-[#071D41] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-white">Defe</span>
                <span className="text-orange-500">s</span>
                <span className="text-[#168821]">Ai</span>
              <span className="text-sm text-orange-300">| DefesAi</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-lg text-white hover:bg-[#0C326F] cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links do Menu */}
            <div className="p-4 space-y-6 flex-1 text-sm">
              <div className="space-y-1">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono block px-2 mb-1">
                  Navegação Principal
                </span>
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>Página Inicial</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    navigate('/novo-caso');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-orange-50 text-orange-100 font-bold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Nova Análise de Multa (Gratuita)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-orange-100" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono block px-2 mb-1">
                  Área do Usuário
                </span>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                    Meu Painel
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    navigate('/cases');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-800 flex ions-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Meus Processos
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    navigate('/knowledge');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-800 flex ions-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    Base Jurídica
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    navigate('/marketing');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 text-slate-800 flex ions-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-slate-500" />
                    Marketing OS
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {isAdmin && (
                <div className="space-y-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-purple-700 font-mono block px-2 mb-1">
                    Administração
                  </span>
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-purple-50 text-purple-900 font-bold flex items-center justify-between"
                  >
                    <span>Console Administrativo</span>
                    <ChevronRight className="w-3.5 h-3.5 text-purple-700" />
                  </button>
                  <button
                    onClick={() => {
                      navigate('/admin/audit');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-50 text-purple-800 flex ions-center justify-between"
                  >
                    <span>Auditoria & Compliance</span>
                    <ChevronRight className="w-3.5 h-3.5 text-purple-700" />
                  </button>
                </div>
              )}
            </div>

            {/* Rodapé do Menu */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
              <p className="font-semibold text-slate-800 mb-1">Suporte & Assistência</p>
              <p>Segunda a sexta, das 8h às 18h</p>
              <p className="mt-2 text-sm font-mono">DefesAi • Sistema Autônomo de Defesa</p>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
