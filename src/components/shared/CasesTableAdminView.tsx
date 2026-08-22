import React from 'react';
import { CheckCircle2, DollarSign, Eye, AlertTriangle } from 'lucide-react';
import { PRICING } from '../../config/pricing';

interface CasesTableAdminViewProps {
  filteredCases: any[];
  onSelectCase: (caseItem: any) => void;
  showNewCaseButton: boolean;
  onNewCase: () => void;
  simulatePayment: (caseId: string) => Promise<void>;
  onRefreshCases: () => void;
}

export const CasesTableAdminView: React.FC<CasesTableAdminViewProps> = ({
  filteredCases,
  onSelectCase,
  showNewCaseButton,
  onNewCase,
  simulatePayment,
  onRefreshCases
}) => {
  const handleSimulatePayment = async (caseId: string) => {
    if (simulatePayment) {
      try {
        await simulatePayment(caseId);
        if (onRefreshCases) onRefreshCases();
      } catch (err) {
        console.error('Error simulating payment:', err);
      }
    }
  };

  if (filteredCases.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          Nenhum caso encontrado para os filtros selecionados.
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Ajuste os filtros de busca ou simule um pagamento para ver casos.
        </p>
        {showNewCaseButton && onNewCase && (
          <button
            onClick={onNewCase}
            className="mt-4 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors shadow-xs shadow-orange-200"
            aria-label="Nova análise"
          >
            Nova Análise
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
            <tr>
              <th className="py-3 px-4">Auto / AIT</th>
              <th className="py-3 px-4">Placa</th>
              <th className="py-3 px-4">Infração</th>
              <th className="py-3 px-4">Órgão</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Pagamento</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 font-mono text-sm text-slate-300">
            {filteredCases.map((c) => (
              <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 font-bold text-white">
                  {c.infraction.aitNumber || c.id}
                </td>
                <td className="py-3 px-4 text-orange-300 font-bold">
                  {c.infraction.plate || 'N/I'}
                </td>
                <td className="py-3 px-4 truncate max-w-xs font-sans">
                  {c.infraction.description || 'Infração de trânsito'}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {c.infraction.autuadorBody || 'DETRAN'}
                </td>
                <td className="py-3 px-4">
                  {c.payment?.status === 'approved' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pago (R$ {(c.payment?.amount || PRICING.DEFAULT_PRICE).toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSimulatePayment(c.id)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-orange-400 rounded text-sm flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <DollarSign className="w-3 h-3" /> Simular PIX
                    </button>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => {
                      onSelectCase(c);
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-orange-400 rounded-lg text-sm font-sans font-bold transition-colors cursor-pointer border border-slate-800 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Inspecionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};