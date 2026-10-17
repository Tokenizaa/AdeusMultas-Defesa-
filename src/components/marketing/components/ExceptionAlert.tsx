import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MarketingAgentState } from '../../../types';
import { MarketingOverallMetrics } from '../hooks/use-marketing-service';

interface ExceptionAlertProps {
  agents: MarketingAgentState[];
  metrics: MarketingOverallMetrics | null;
}

/**
 * ExceptionAlert (4.8) — SÓ exceções aparecem. Estado saudável = nada renderizado.
 * Nada de spinner de sucesso falso: cada alerta é derivado de estado real da API.
 */
export const ExceptionAlert: React.FC<ExceptionAlertProps> = ({
  agents,
  metrics,
}) => {
  const failingAgents = agents.filter((a) => a.status === 'alert');
  const hasExceptions = failingAgents.length > 0 || Boolean(metrics && metrics.conversionRate === 0 && metrics.publishedPosts > 0);
  if (!hasExceptions) return null;

  return (
    <div className="space-y-2">
      {failingAgents.map((agent) => (
        <div
          key={agent.id}
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-800">
              {agent.name} em alerta
            </p>
            <p className="text-rose-700 text-sm mt-0.5">{agent.currentTask || 'Tarefa interrompida'}</p>
          </div>
        </div>
      ))}

      {metrics && metrics.conversionRate === 0 && metrics.publishedPosts > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-800">
            {metrics.publishedPosts} publicação(ões) sem conversão registrada — investigar funil.
          </p>
        </div>
      )}
    </div>
  );
};