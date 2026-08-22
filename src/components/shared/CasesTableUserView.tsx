import React from 'react';
import { FileText } from 'lucide-react';
import { Car, ArrowRight } from 'lucide-react';

interface CasesTableUserViewProps {
  filteredCases: Array<{
    id: string;
    title: string;
    currentStage: number;
    vehicle?: { plate: string };
    infraction?: {
      autuadorBody: string;
      defenseDeadline?: string;
      fineAmount?: number;
      points?: number;
    };
  }>;
  onSelectCase: (caseItem: {
    id: string;
    title: string;
    currentStage: number;
    vehicle?: { plate: string };
    infraction?: {
      autuadorBody: string;
      defenseDeadline?: string;
      fineAmount?: number;
      points?: number;
    };
  }) => void;
  showNewCaseButton: boolean;
  onNewCase: () => void;
  variant: 'user' | 'admin';
}

export const CasesTableUserView: React.FC<CasesTableUserViewProps> = ({
  filteredCases,
  onSelectCase,
  showNewCaseButton,
  onNewCase,
  variant
}) => {
  if (variant !== 'user') {
    return null;
  }

  const content = filteredCases.length === 0 ? (
    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-2xs">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
        <FileText className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">
        Nenhum processo encontrado
      </h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
        Inicie uma nova analise enviando a foto ou PDF da notificacao de autuacao.
      </p>
      {showNewCaseButton && onNewCase && (
        <button
          onClick={onNewCase}
          className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors shadow-xs shadow-orange-200"
          aria-label="Comecar agora"
        >
          Comecar Agora
        </button>
      )}
    </div>
  ) : (
    <div className="space-y-2.5">
      {filteredCases.map((c) => (
        <div
          key={c.id}
          onClick={() => onSelectCase(c)}
          className="bg-white border border-slate-200 hover:border-orange-500 rounded-xl p-4 shadow-2xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-orange-500 transition-colors">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">
                  {c.title}
                </h3>
                <span className="px-1.5 py-0.2 rounded text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-mono">
                  Estagio {c.currentStage} / 5
                </span>
              </div>

              <p className="text-sm text-slate-600 mt-0.5">
                <span>Placa: </span>
                <span className="font-mono font-bold text-slate-900">{c.vehicle?.plate ?? '-'}</span>
                <span> - </span>
                <span>{c.infraction?.autuadorBody ?? '-'}</span>
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                Prazo fatal: {c.infraction?.defenseDeadline || 'Em analise'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <div className="text-left sm:text-right">
              <span className="text-sm font-mono font-bold text-slate-900 block">
                R$ {c.infraction?.fineAmount?.toFixed(2) ?? '0.00'}
              </span>
              <span className="text-sm text-rose-600 font-bold block">
                {c.infraction?.points ?? 0} pontos na CNH
              </span>
            </div>

            <div className="p-1.5 rounded-md bg-slate-50 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {content}
    </>
  );
};