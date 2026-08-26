import React, { useState, useEffect } from 'react';
import { Shield, Mail } from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { SharedAuthForm, AuthFormMode } from '../auth/SharedAuthForm';

interface AuthPageViewProps {
  initialTab?: 'login' | 'register';
}

export const AuthPageView: React.FC<AuthPageViewProps> = ({ initialTab = 'login' }) => {
  const { navigate, queryParams, currentPath } = useRouter();
  const { login, signUp, resetPassword, isLoading } = useAuth();

  // Tab State: 'login' | 'register'
  const [mode, setMode] = useState<AuthFormMode>(() => {
    if (currentPath === '/cadastro') return 'register';
    return initialTab;
  });

  const redirectTarget = queryParams.redirect || '/dashboard';
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // Sync tab with path if route changes
  useEffect(() => {
    if (currentPath === '/cadastro') {
      setMode('register');
    } else if (currentPath === '/login') {
      setMode('login');
    }
    setEmailConfirmationRequired(false);
  }, [currentPath]);

  // Handle tab change + URL navigation
  const handleModeChange = (newMode: AuthFormMode) => {
    setMode(newMode);
    setEmailConfirmationRequired(false);
    if (newMode === 'register' && currentPath !== '/cadastro') {
      navigate('/cadastro');
    } else if (newMode === 'login' && currentPath !== '/login') {
      navigate('/login');
    }
  };

  // Login handler — navigates to redirect target
  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    const result = await login(loginEmail, loginPassword);
    if (result.success) {
      navigate(redirectTarget);
    }
    return result;
  };

  // Register handler — shows success then navigates
  const handleRegister = async (name: string, email: string, password: string, phone?: string) => {
    const result = await signUp(name, email, password, phone);
    if (result.success) {
      if (result.requiresEmailConfirmation) {
        setEmailConfirmationRequired(true);
      } else {
        setTimeout(() => navigate(redirectTarget), 600);
      }
    }
    return result;
  };

  // Forgot password handler
  const handleForgotPassword = async (email: string) => {
    const res = await resetPassword(email);
    return res;
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-6">
      {/* Brand Card Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* Header Branding */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500 text-white shadow-xs shadow-orange-200">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Acesse sua Conta' : 'Criar Nova Conta'}
            </h1>
            <p className="text-sm sm:text-sm text-slate-600 max-w-sm mx-auto mt-1">
              {mode === 'login'
                ? 'Entre para acompanhar seus recursos, prazos e laudos periciais.'
                : 'Cadastre-se para gerar defesas técnicas de trânsito em conformidade com o CTB.'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {emailConfirmationRequired && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-800 text-sm animate-fade-in">
              <Mail className="w-4 h-4 text-[#155BCB] shrink-0 mt-0.5" />
              <span>Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.</span>
            </div>
          )}
          <SharedAuthForm
            mode={mode}
            onModeChange={handleModeChange}
            variant="page"
            theme="orange"
            showPhone={true}
            phoneRequired={false}
            showPasswordConfirm={true}
            showTerms={true}
            showForgotPassword={true}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onAuthSuccess={() => {}} // Navigation already handled in handleLogin/handleRegister
            onForgotPassword={handleForgotPassword}
            testFillCredentials={{ email: 'motorista@defesai.com.br', password: '123456' }}
          />
        </div>
      </div>
    </div>
  );
};
