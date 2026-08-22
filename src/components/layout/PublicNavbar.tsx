import React, { useState } from 'react';
import { Shield, Sparkles, LogIn, UserPlus, Menu, X, ArrowRight, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';

export const PublicNavbar: React.FC = () => {
  const { navigate, currentPath } = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartAnalysis = () => {
    navigate('/novo-caso');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo - DefesAi */}
          <div
            id="public-brand-logo"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-white shadow-sm shadow-orange-200 group-hover:scale-105 transition-transform text-sm tracking-tighter">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">DefesAi</span>
                <span className="text-sm font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                  CTB & CONTRAN
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium hidden sm:block">
                Recursos de trânsito 100% determinísticos
              </p>
            </div>
          </div>

          {/* Simple Public Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <button
              onClick={() => navigate('/')}
              className={`hover:text-slate-900 transition-colors cursor-pointer ${
                currentPath === '/' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Início
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Como Funciona
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('teses-juridicas')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Teses Jurídicas
            </button>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('perguntas-frequentes')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Dúvidas
            </button>
          </nav>

          {/* Actions: Login, Cadastro / Authenticated State + Primary CTA */}
          <div className="hidden sm:flex items-center gap-2.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
                  className="px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-orange-500" />
                  <span>{isAdmin ? 'Painel Admin' : 'Meu Dashboard'}</span>
                </button>

                <button
                  onClick={() => logout()}
                  className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="nav-login-btn"
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-2 text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Entrar</span>
                </button>

                <button
                  id="nav-register-btn"
                  onClick={() => navigate('/cadastro')}
                  className="px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cadastrar</span>
                </button>
              </div>
            )}

            {/* Primary Conversion CTA */}
            <button
              id="public-cta-analisar-multa"
              onClick={handleStartAnalysis}
              className="px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-xs shadow-orange-200 transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-tight"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analisar Minha Multa</span>
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={handleStartAnalysis}
              className="px-3 py-1.5 text-sm font-bold text-white bg-orange-500 rounded-lg flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analisar</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 text-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-orange-600"
            >
              Início
            </button>
            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-left py-1.5 hover:text-orange-600"
            >
              Como Funciona
            </button>
            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('teses-juridicas')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-left py-1.5 hover:text-orange-600"
            >
              Teses Jurídicas
            </button>
            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('perguntas-frequentes')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-left py-1.5 hover:text-orange-600"
            >
              Dúvidas
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigate(isAdmin ? '/admin' : '/dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4 text-orange-400" />
                  <span>{isAdmin ? 'Painel Administrativo' : 'Meu Dashboard'}</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-slate-100 text-rose-600 rounded-lg text-sm font-bold"
                >
                  Sair da Conta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 bg-slate-100 text-slate-800 rounded-lg text-sm font-bold text-center"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    navigate('/cadastro');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 bg-slate-900 text-white rounded-lg text-sm font-bold text-center"
                >
                  Cadastrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
