import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Mail, CheckCircle2, ArrowRight, Loader2, X } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { supabase as supabaseClient, getStoredUsers } from '../../lib/supabase';
import { InfractionData, VehicleData, CaseAnalysis } from '../../types';
import { SharedAuthForm, AuthFormMode } from '../auth/SharedAuthForm';

// Safe wrapper — if supabase is not configured, these are no-ops
const supabase = supabaseClient;

interface AccountVerificationGateProps {
  leadName?: string;
  leadPhone?: string;
  infractionData: InfractionData;
  vehicleData: VehicleData;
  analysis: CaseAnalysis;
  onSuccess: (authenticatedUser: any) => void;
  onCancel: () => void;
}

export const AccountVerificationGate: React.FC<AccountVerificationGateProps> = ({
  leadName = '',
  leadPhone = '',
  infractionData,
  vehicleData,
  analysis,
  onSuccess,
  onCancel,
}) => {
  const { login, signUp, user, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthFormMode>('register');

  // "Check your email" state — shown after registration when email isn't confirmed
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  // If already authenticated, trigger success immediately
  useEffect(() => {
    if (isAuthenticated && user) {
      onSuccess(user);
    }
  }, [isAuthenticated, user, onSuccess]);

  // Listen for Supabase auth state changes (email confirmation)
  useEffect(() => {
    if (!waitingForConfirmation || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setWaitingForConfirmation(false);
        setPendingConfirmation(false);
        onSuccess({
          id: session.user.id,
          name: session.user.user_metadata?.name || leadName,
          email: session.user.email || pendingEmail,
          phone: session.user.phone || leadPhone,
          role: 'citizen',
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [waitingForConfirmation, pendingEmail, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect if user already has an account when email changes
  const handleEmailChange = (emailValue: string) => {
    if (emailValue.includes('@') && emailValue.length > 5) {
      // Check local storage for existing users (dev/demo mode)
      try {
        const allUsers = getStoredUsers();
        const clean = emailValue.trim().toLowerCase();
        if (allUsers[clean]) {
          setMode('login');
        }
      } catch { /* ignore */ }
    }
  };

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    const result = await login(loginEmail, loginPassword);
    if (result.success) {
      // Try to get user from Supabase session first, fallback to localStorage
      const session = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const supaUser = session?.data?.session?.user;
      const storedUsers = (() => { try { return JSON.parse(localStorage.getItem('defesai_users') || '{}'); } catch { return {}; } })();
      const loggedUser = supaUser
        ? { id: supaUser.id, name: supaUser.user_metadata?.name || leadName, email: supaUser.email, phone: supaUser.phone || leadPhone, role: 'citizen' }
        : storedUsers[loginEmail.trim().toLowerCase()]?.user || { name: leadName, email: loginEmail, phone: leadPhone };
      onSuccess(loggedUser);
    }
    return result;
  };

  const handleRegister = async (registerName: string, registerEmail: string, registerPassword: string, registerPhone?: string) => {
    const result = await signUp(registerName, registerEmail, registerPassword, registerPhone);
    if (result.success) {
      // Check if email confirmation is required
      const session = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session?.data?.session) {
        // Email confirmation required — show "check your email" state
        setPendingEmail(registerEmail);
        setPendingConfirmation(true);
        setWaitingForConfirmation(true);
        return { success: true }; // Don't call onSuccess yet
      }

      // Session exists (email auto-confirmed) — proceed normally
      onSuccess({
        id: session.data.session.user.id,
        name: registerName,
        email: registerEmail,
        phone: registerPhone || leadPhone,
        role: 'citizen',
      });
    }
    return result;
  };

  // ==========================================================================
  // "Check Your Email" State
  // ==========================================================================
  if (pendingConfirmation) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-200 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mx-auto">
            <Mail className="w-8 h-8 text-[#155BCB] animate-pulse" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Confirme seu E-mail</h2>
            <p className="text-sm text-slate-500 mt-2">
              Enviamos um link de confirmação para:
            </p>
            <p className="text-sm font-bold text-[#155BCB] mt-1 font-mono">{pendingEmail}</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#155BCB]" />
              Seus dados foram salvos com segurança
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Nome e telefone preservados</li>
              <li>Diagnóstico jurídico mantido</li>
              <li>Processo retomará de onde parou</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Clique no link do e-mail para confirmar sua conta. Esta janela detectará automaticamente a confirmação.
            </p>

            {waitingForConfirmation && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Aguardando confirmação...</span>
              </div>
            )}

            <button
              onClick={() => {
                setPendingConfirmation(false);
                setWaitingForConfirmation(false);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Voltar ao Formulário
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Main Auth Form
  // ==========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Case Preservation Banner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% dos Dados Coletados Preservados
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Voltar ao Diagnóstico
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Acesso à Sua Defesa Jurídica
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verificamos seu cadastro para vincular o auto nº <strong className="font-mono text-slate-800">{infractionData.aitNumber || 'N/A'}</strong> (Placa <strong className="font-mono text-slate-800">{vehicleData.plate || 'N/A'}</strong>) com segurança.
            </p>
          </div>
        </div>

        {/* Preserved Data Summary Chip */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#155BCB]" />
              Diagnóstico Preliminar Concluído ({analysis.overallSuccessRate ?? 0}% de êxito)
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
              {analysis.recommendedArguments?.length || 3} Teses Mapeadas
            </span>
          </div>
          <p className="text-[11px] text-blue-900">
            Você não precisará preencher os dados do veículo e da autuação novamente.
          </p>
        </div>

        {/* Shared Auth Form */}
        <SharedAuthForm
          mode={mode}
          onModeChange={setMode}
          variant="modal"
          theme="blue"
          showPhone={true}
          phoneRequired={true}
          showPasswordConfirm={true}
          showTerms={true}
          initialName={leadName || 'Carlos Eduardo Silveira'}
          initialPhone={leadPhone || '(11) 98765-4321'}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onAuthSuccess={() => {}} // Already handled in handleLogin/handleRegister
          onEmailChange={handleEmailChange}
        />
      </div>
    </div>
  );
};
