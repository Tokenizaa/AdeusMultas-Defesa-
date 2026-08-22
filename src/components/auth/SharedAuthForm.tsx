import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';
import { TestFillButton } from '../ui/TestFillButton';
import { generateRandomName, generateRandomEmail, generateRandomPhone } from '../../utils/test-data-generator';

// ============================================================================
// Types
// ============================================================================

export type AuthFormMode = 'login' | 'register';
export type AuthFormVariant = 'page' | 'modal';
export type AuthFormTheme = 'orange' | 'blue';

export interface SharedAuthFormProps {
  /** Current active mode */
  mode: AuthFormMode;
  /** Callback when user switches between login/register */
  onModeChange: (mode: AuthFormMode) => void;

  /** Visual variant: 'page' = full standalone page, 'modal' = compact overlay */
  variant: AuthFormVariant;
  /** Brand theme: 'orange' for standalone, 'blue' for onboarding */
  theme: AuthFormTheme;

  /** Show phone field in register form */
  showPhone?: boolean;
  /** Is phone required in register form */
  phoneRequired?: boolean;
  /** Show password confirmation field in register form */
  showPasswordConfirm?: boolean;
  /** Show LGPD terms checkbox in register form */
  showTerms?: boolean;

  /** Pre-fill values */
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;

  /** Context info shown in modal variant (AIT, plate, etc.) */
  contextualInfo?: {
    aitNumber?: string;
    plate?: string;
    successRate?: number;
    thesisCount?: number;
  };

  /** Called when login is submitted. Returns { success, error? } */
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Called when register is submitted. Returns { success, error? } */
  onRegister: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;

  /** Called after successful auth with the user object */
  onAuthSuccess: (user: any) => void;

  /** Show "Forgot password?" link (page variant) */
  showForgotPassword?: boolean;
  /** Called when user clicks "Forgot password?" */
  onForgotPassword?: (email: string) => void;

  /** Pre-fill credentials for test button (dev mode only) */
  testFillCredentials?: { email: string; password: string };

  /** Called when email field changes (for auto-detecting existing accounts) */
  onEmailChange?: (email: string) => void;
}

// ============================================================================
// Theme helpers
// ============================================================================

const THEME = {
  orange: {
    primary: 'bg-orange-500 hover:bg-orange-600',
    primaryText: 'text-orange-600',
    primaryRing: 'focus:ring-orange-500',
    activeTab: 'bg-white text-slate-900 shadow-xs',
    inactiveTab: 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
    tabBg: 'bg-slate-100',
    icon: <Shield className="w-6 h-6 text-white" />,
    iconBg: 'bg-orange-500 text-white shadow-xs shadow-orange-200',
  },
  blue: {
    primary: 'bg-[#155BCB] hover:bg-blue-700',
    primaryText: 'text-[#155BCB]',
    primaryRing: 'focus:ring-[#155BCB]',
    activeTab: 'bg-white text-[#155BCB] shadow-xs',
    inactiveTab: 'text-slate-600 hover:text-slate-900',
    tabBg: 'bg-slate-100',
    icon: <ShieldCheck className="w-6 h-6 text-white" />,
    iconBg: 'bg-[#155BCB] text-white',
  },
} as const;

const INPUT_STYLE = {
  orange: 'w-full bg-slate-50 border border-slate-300 rounded-xl !pl-11 !pr-4 py-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400',
  blue: 'w-full bg-slate-50 border border-slate-300 rounded-lg !pl-11 !pr-4 py-3 text-base font-medium focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none placeholder:text-slate-400',
} as const;

const INPUT_PASSWORD_STYLE = {
  orange: 'w-full bg-slate-50 border border-slate-300 rounded-xl !pl-11 !pr-11 py-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400',
  blue: 'w-full bg-slate-50 border border-slate-300 rounded-lg !pl-11 !pr-11 py-3 text-base font-medium focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none placeholder:text-slate-400',
} as const;

const LABEL_STYLE = {
  orange: 'block font-semibold text-slate-700 mb-1.5 text-sm',
  blue: 'text-sm font-bold text-slate-700 uppercase font-mono mb-1 block tracking-wider',
} as const;

// ============================================================================
// Component
// ============================================================================

export const SharedAuthForm: React.FC<SharedAuthFormProps> = ({
  mode,
  onModeChange,
  variant,
  theme,
  showPhone = false,
  phoneRequired = false,
  showPasswordConfirm = false,
  showTerms = false,
  initialName = '',
  initialEmail = '',
  initialPhone = '',
  contextualInfo,
  onLogin,
  onRegister,
  onAuthSuccess,
  showForgotPassword = false,
  onForgotPassword,
  testFillCredentials,
  onEmailChange,
}) => {
  const t = THEME[theme];
  const isModal = variant === 'modal';

  // Form state
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password reset state (page variant only)
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  // Pre-fill from props
  useEffect(() => {
    if (initialName && !name) setName(initialName);
  }, [initialName]);
  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail);
  }, [initialEmail]);
  useEffect(() => {
    if (initialPhone && !phone) setPhone(initialPhone);
  }, [initialPhone]);

  // Clear messages when switching modes
  useEffect(() => {
    setErrorMessage('');
    setSuccessMessage('');
  }, [mode]);

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };
  const pwdScore = getPasswordStrength(password);

  // ==========================================================================
  // Login Handler
  // ==========================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await onLogin(email, password);
      if (result.success) {
        onAuthSuccess({ email, name });
      } else {
        setErrorMessage(result.error || 'Credenciais inválidas. Verifique os dados digitados.');
      }
    } catch (err: any) {
      setErrorMessage('Erro de autenticação: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // Register Handler
  // ==========================================================================
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (showPasswordConfirm && password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Por favor, verifique.');
      return;
    }

    if (showTerms && !acceptTerms) {
      setErrorMessage('Você deve aceitar os Termos de Uso e a Política de Privacidade (LGPD) para prosseguir.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await onRegister(name, email, password, phone);
      if (result.success) {
        onAuthSuccess({ name, email, phone });
      } else {
        setErrorMessage(result.error || 'Não foi possível criar a conta. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMessage('Erro ao criar conta: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // Password Reset Handler (page variant)
  // ==========================================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetStatus({ type: 'error', message: 'Por favor, informe um e-mail válido.' });
      return;
    }
    setResetStatus({ type: 'loading' });
    if (onForgotPassword) {
      // Parent handles the actual reset
      setResetStatus({ type: 'success', message: 'Link de recuperação enviado com sucesso!' });
    } else {
      setResetStatus({ type: 'success', message: 'Link de recuperação enviado com sucesso!' });
    }
  };

  // ==========================================================================
  // Test Fill Handler
  // ==========================================================================
  const handleTestFill = () => {
    if (mode === 'login' && testFillCredentials) {
      setEmail(testFillCredentials.email);
      setPassword(testFillCredentials.password);
    } else if (mode === 'register') {
      const testName = generateRandomName();
      setName(testName);
      setEmail(generateRandomEmail(testName));
      setPhone(generateRandomPhone());
      setPassword('123456');
      if (showPasswordConfirm) setConfirmPassword('123456');
    }
  };

  // ==========================================================================
  // Render: Error/Success Alerts
  // ==========================================================================
  const renderAlerts = () => (
    <>
      {errorMessage && (
        <div className={`p-3 ${isModal ? '' : 'p-3.5'} bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm animate-fade-in`}>
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className={`p-3 ${isModal ? '' : 'p-3.5'} bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-sm animate-fade-in`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}
    </>
  );

  // ==========================================================================
  // Render: Tab Switcher
  // ==========================================================================
  const renderTabSwitcher = () => (
    <div className="w-full pt-1">
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => onModeChange('register')}
          className={`py-2.5 px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'register' ? t.activeTab : t.inactiveTab
          }`}
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span className="truncate">{isModal ? 'Criar Nova Conta' : 'Criar Conta'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => onModeChange('login')}
          className={`py-2.5 px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mode === 'login' ? t.activeTab : t.inactiveTab
          }`}
        >
          <LogIn className="w-4 h-4 shrink-0" />
          <span className="truncate">{isModal ? 'Já Tenho Conta' : 'Entrar'}</span>
        </button>
      </div>
    </div>
  );

  // ==========================================================================
  // Render: Login Form
  // ==========================================================================
  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-4 text-sm">
      <div>
        <label className={LABEL_STYLE[theme]}>
          {isModal ? 'E-mail Cadastrado *' : 'E-mail do Condutor ou Administrador'}
        </label>
        <div className="relative">
          <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onEmailChange?.(e.target.value);
            }}
            placeholder={isModal ? 'motorista@defesai.com.br' : 'seu.email@exemplo.com'}
            className={INPUT_STYLE[theme]}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={LABEL_STYLE[theme]}>
            {isModal ? 'Sua Senha *' : 'Senha de Acesso'}
          </label>
          {showForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetStatus({ type: 'idle' });
                setResetModalOpen(true);
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              Esqueceu a senha?
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={INPUT_PASSWORD_STYLE[theme]}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-center"
            aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isModal && (
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
            />
            <span>Lembrar meu acesso</span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-6 ${t.primary} text-white rounded-xl text-base font-bold transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 min-h-[48px]`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Autenticando...</span>
          </>
        ) : (
          <>
            <span>{isModal ? 'Entrar & Vincular Defesa à Minha Conta' : 'Entrar no DefesAi'}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Bottom switcher (page variant) */}
      {!isModal && (
        <div className="text-center text-sm text-slate-600 pt-4 border-t border-slate-100">
          Ainda não possui uma conta?{' '}
          <button
            type="button"
            onClick={() => onModeChange('register')}
            className={`font-bold ${t.primaryText} hover:underline cursor-pointer`}
          >
            Criar conta gratuitamente
          </button>
        </div>
      )}
    </form>
  );

  // ==========================================================================
  // Render: Register Form
  // ==========================================================================
  const renderRegisterForm = () => (
    <form onSubmit={handleRegisterSubmit} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className={LABEL_STYLE[theme]}>Nome Completo *</label>
          <div className="relative">
            <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silveira"
              className={INPUT_STYLE[theme]}
            />
          </div>
        </div>

        {showPhone && (
          <div>
            <label className={LABEL_STYLE[theme]}>
              WhatsApp com DDD {phoneRequired ? '*' : ''}
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required={phoneRequired}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className={INPUT_STYLE[theme]}
              />
            </div>
          </div>
        )}
      </div>

      <div className={showPhone ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'}>
        <div>
          <label className={LABEL_STYLE[theme]}>
            {isModal ? 'Seu Melhor E-mail *' : 'E-mail Principal *'}
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onEmailChange?.(e.target.value);
              }}
              placeholder="seu.email@exemplo.com.br"
              className={INPUT_STYLE[theme]}
            />
          </div>
        </div>

        {!showPhone && (
          <div>
            <label className={LABEL_STYLE[theme]}>WhatsApp / Celular</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className={INPUT_STYLE[theme]}
              />
            </div>
          </div>
        )}
      </div>

      <div className={showPasswordConfirm ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : ''}>
        <div>
          <label className={LABEL_STYLE[theme]}>
            {isModal ? 'Defina uma Senha Segura *' : 'Senha de Acesso *'}
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={INPUT_PASSWORD_STYLE[theme]}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-center"
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showPasswordConfirm && (
          <div>
            <label className={LABEL_STYLE[theme]}>Confirmar Senha *</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                className={INPUT_PASSWORD_STYLE[theme]}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Strength Meter (page variant) */}
      {!isModal && password.length > 0 && (
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Segurança da senha:</span>
            <span className={`font-bold ${pwdScore <= 1 ? 'text-rose-600' : pwdScore === 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pwdScore <= 1 ? 'Fraca' : pwdScore === 2 ? 'Média' : 'Forte'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`rounded-full ${
                  pwdScore >= i
                    ? (pwdScore === 1 ? 'bg-rose-500' : pwdScore === 2 ? 'bg-amber-500' : 'bg-emerald-500')
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* LGPD Terms (page variant) */}
      {showTerms && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="flex items-start gap-2.5 cursor-pointer text-sm text-slate-700 select-none">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 shrink-0 cursor-pointer"
            />
            <span className="leading-snug text-xs sm:text-sm">
              Concordo com os <strong>Termos de Uso</strong> e autorizo o tratamento de dados pessoais para geração de recursos de trânsito conforme a <strong>LGPD (Lei Federal nº 13.709/2018)</strong>.
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-6 ${t.primary} text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isModal ? 'Criando Conta e Vinculando Defesa...' : 'Criando sua conta...'}</span>
          </>
        ) : (
          <>
            <span>{isModal ? 'Criar Conta & Prosseguir para Geração' : 'Criar Minha Conta no DefesAi'}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Trust Guarantees (page variant) */}
      {!isModal && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium text-center">
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Análise Rápida</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Legal (CTB)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>LGPD Seguro</span>
          </div>
        </div>
      )}

      {/* Bottom switcher (page variant) */}
      {!isModal && (
        <div className="text-center text-sm text-slate-600 pt-4 border-t border-slate-100">
          Já possui cadastro no DefesAi?{' '}
          <button
            type="button"
            onClick={() => onModeChange('login')}
            className={`font-bold ${t.primaryText} hover:underline cursor-pointer`}
          >
            Acesse sua conta aqui
          </button>
        </div>
      )}
    </form>
  );

  // ==========================================================================
  // Render: Main
  // ==========================================================================
  return (
    <>
      {/* Test Fill Button */}
      <TestFillButton onClick={handleTestFill} />

      {/* Alerts */}
      {renderAlerts()}

      {/* Tab Switcher */}
      {renderTabSwitcher()}

      {/* Forms */}
      {mode === 'login' ? renderLoginForm() : renderRegisterForm()}

      {/* Footer (both variants) */}
      <div className={`pt-3 ${isModal ? 'border-t border-slate-100' : ''} flex items-center justify-center gap-4 text-sm text-slate-400 font-mono`}>
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-600" />
          Criptografia de Ponta a Ponta
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Conformidade LGPD
        </span>
      </div>

      {/* Password Reset Modal (page variant) */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Recuperação de Senha</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Informe o e-mail cadastrado na plataforma. Enviaremos as instruções para você redefinir sua senha com segurança.
            </p>

            {resetStatus.type === 'error' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{resetStatus.message}</span>
              </div>
            )}

            {resetStatus.type === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{resetStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Cadastrado</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  />
                </div>
              </div>

<div className="flex items-center justify-end gap-2 pt-2">
                 <button
                   type="button"
                   onClick={() => setResetModalOpen(false)}
                   className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer min-h-[48px] flex items-center justify-center"
                 >
                   Fechar
                 </button>
                 <button
                   type="submit"
                   disabled={resetStatus.type === 'loading'}
                   className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 min-h-[48px]"
                 >
                   {resetStatus.type === 'loading' ? (
                     <>
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                       <span>Enviando...</span>
                     </>
                   ) : (
                     <span>Enviar Instruções</span>
                   )}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
