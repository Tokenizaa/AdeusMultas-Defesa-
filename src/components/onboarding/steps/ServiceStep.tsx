import React from 'react';
import {
  Car,
  UserCheck,
  ShieldAlert,
  Ban,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  FileText
} from 'lucide-react';
import { USER_SITUATIONS, UserSituation } from '../../../core/onboarding/rules-matrix';

interface ServiceStepProps {
  selectedSituation: UserSituation;
  onSelectSituation: (situation: UserSituation) => void;
}

export const ServiceStep: React.FC<ServiceStepProps> = ({
  selectedSituation,
  onSelectSituation,
}) => {
  const getIcon = (id: UserSituation) => {
    switch (id) {
      case 'multa_transito':
        return <Car className="w-5 h-5" />;
      case 'conversao_advertencia':
        return <UserCheck className="w-5 h-5" />;
      case 'indicacao_condutor':
        return <FileText className="w-5 h-5" />;
      case 'suspensao_cnh':
        return <ShieldAlert className="w-5 h-5" />;
      case 'cassacao_cnh':
        return <Ban className="w-5 h-5" />;
      default:
        return <Car className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-6">
      {/* Header com chamada humana - simplificada */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider bg-blue-50 text-[#155BCB] border border-blue-200 font-mono">
          <Sparkles className="w-4 h-4 text-[#155BCB]" />
          Passo 1 de 4 • Situação
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
          Qual situação você quer resolver?
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto">
          Escolha o tipo de infração para aplicarmos as defesas adequadas.
        </p>
      </div>

      {/* Grid de opções - layout otimizado para melhor escaneabilidade */}
      <div className="grid gap-4 sm:grid-cols-2">
        {USER_SITUATIONS.map((sit) => {
          const isSelected = selectedSituation === sit.id;
          return (
            <button
              key={sit.id}
              id={`service-option-${sit.id}`}
              onClick={() => onSelectSituation(sit.id)}
              className={`group flex flex-col items-start p-4 sm:p-5 border rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-[#155BCB]/20 ${
                isSelected
                  ? 'border-[#155BCB] bg-blue-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex w-full items-start gap-3 mb-2">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#155BCB] text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {getIcon(sit.id)}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-slate-900">{sit.title}</h3>
                  <p className="text-slate-600">{sit.subtitle}</p>
                </div>
              </div>

              <div className="mt-auto w-full flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono">
                  {sit.badge}
                </span>
                <span className="text-sm font-medium text-[#155BCB] group-hover:underline">
                  Continuar
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust Micro-Footer - mantido para confiança */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-sm text-slate-600 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Sem necessidade de cadastro prévio
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Cálculo determinístico de prazos
        </span>
        <span className="flex items-center gap-1.5">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          Base jurídica atualizada com a Lei 14.071/20
        </span>
      </div>
    </div>
  );
};