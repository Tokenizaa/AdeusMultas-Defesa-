import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SecretEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingKey: string;
  settingName: string;
  description: string;
  isCurrentlyConfigured: boolean;
  onSave: (key: string, newSecret: string) => Promise<boolean>;
}

export const SecretEditModal: React.FC<SecretEditModalProps> = ({
  isOpen,
  onClose,
  settingKey,
  settingName,
  description,
  isCurrentlyConfigured,
  onSave,
}) => {
  const [value, setValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError('Por favor, informe o novo valor para a credencial.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSave(settingKey, value.trim());
      if (success) {
        setValue('');
        onClose();
      } else {
        setError('Falha ao atualizar o segredo. Verifique as permissões de administrador.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {settingName}
                <span className="text-sm font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  SECRET
                </span>
              </h3>
              <p className="text-sm text-slate-400 font-mono">{settingKey}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Proteção de Segredos Criptográficos:</span>
              <p className="mt-0.5 text-sm text-amber-300/80">
                O valor atual nunca é exposto ao navegador por motivos de segurança. Ao salvar, a nova chave será atualizada na infraestrutura com registro imutável de auditoria.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300">
              Novo Valor do Segredo / Token
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isCurrentlyConfigured ? 'Digite para substituir a credencial atual...' : 'Insira a nova credencial...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-slate-400">{description}</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !value.trim()}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando com Segurança...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Salvar Credencial</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
